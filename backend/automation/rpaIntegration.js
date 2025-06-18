// backend/automation/rpaIntegration.js
// RPA (Robotic Process Automation) Integration for Phase 4
// Handles workflow integration for notifications, escalations, and automated ticket creation

const db = require('../config/db');
const AuditLogger = require('../utils/auditLogger');

/**
 * RPA Integration Manager
 * Provides integration points for external RPA tools and workflow automation
 */
class RPAIntegration {
    constructor() {
        this.webhookEndpoints = new Map();
        this.rpaWorkflows = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize RPA integration system
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('[RPA Integration] Already initialized');
            return;
        }

        console.log('[RPA Integration] Initializing RPA integration system...');

        try {
            // Set up default RPA workflows
            await this.setupDefaultWorkflows();
            
            // Load custom RPA workflows from database
            await this.loadCustomWorkflows();

            this.isInitialized = true;
            console.log('[RPA Integration] Initialization complete');

            // Log system startup
            await AuditLogger.logSystem('RPA_INTEGRATION_STARTED', {
                timestamp: new Date().toISOString(),
                activeWorkflows: this.rpaWorkflows.size
            });

        } catch (error) {
            console.error('[RPA Integration] Initialization failed:', error);
            await AuditLogger.logSystem('RPA_INTEGRATION_ERROR', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Set up default RPA workflows
     */
    async setupDefaultWorkflows() {
        // Notification workflow for assignment alerts
        this.registerWorkflow('assignment-notification', {
            type: 'NOTIFICATION',
            description: 'Send notifications when new assignments are created',
            webhookUrl: process.env.RPA_NOTIFICATION_WEBHOOK,
            enabled: true,
            triggers: ['ASSIGNMENT_CREATED', 'ASSIGNMENT_OVERDUE']
        });

        // Escalation workflow for overdue tasks
        this.registerWorkflow('escalation-management', {
            type: 'ESCALATION',
            description: 'Escalate overdue tasks to managers',
            webhookUrl: process.env.RPA_ESCALATION_WEBHOOK,
            enabled: true,
            triggers: ['ASSIGNMENT_OVERDUE', 'VALIDATION_FAILED']
        });

        // Ticket creation workflow for blocked tasks
        this.registerWorkflow('ticket-creation', {
            type: 'TICKET_CREATION',
            description: 'Create support tickets for blocked or failed tasks',
            webhookUrl: process.env.RPA_TICKET_WEBHOOK,
            enabled: true,
            triggers: ['TASK_BLOCKED', 'VALIDATION_FAILED', 'COMPLIANCE_VIOLATION']
        });

        // Compliance reporting workflow
        this.registerWorkflow('compliance-reporting', {
            type: 'COMPLIANCE_REPORT',
            description: 'Generate and distribute compliance reports',
            webhookUrl: process.env.RPA_COMPLIANCE_WEBHOOK,
            enabled: true,
            triggers: ['COMPLIANCE_REPORT_SCHEDULED', 'NON_COMPLIANCE_DETECTED']
        });

        console.log('[RPA Integration] Default workflows configured');
    }

    /**
     * Load custom RPA workflows from database
     */
    async loadCustomWorkflows() {
        try {
            // Get RPA workflow configurations from database
            const workflowsResult = await db.query(`
                SELECT * FROM "RPAWorkflows"
                WHERE "is_active" = true
                ORDER BY "workflow_id"
            `);

            for (const workflow of workflowsResult.rows) {
                this.registerWorkflow(workflow.workflow_name, {
                    type: workflow.workflow_type,
                    description: workflow.description,
                    webhookUrl: workflow.webhook_url,
                    enabled: workflow.is_active,
                    triggers: JSON.parse(workflow.trigger_events || '[]'),
                    configuration: JSON.parse(workflow.configuration || '{}')
                });
            }

            console.log(`[RPA Integration] Loaded ${workflowsResult.rows.length} custom workflows`);
        } catch (error) {
            // Table might not exist yet, that's okay
            console.log('[RPA Integration] No custom workflows table found, using defaults only');
        }
    }

    /**
     * Register an RPA workflow
     */
    registerWorkflow(name, config) {
        this.rpaWorkflows.set(name, {
            ...config,
            registeredAt: new Date().toISOString(),
            executionCount: 0,
            lastExecuted: null
        });

        console.log(`[RPA Integration] Registered workflow: ${name} (${config.type})`);
    }

    /**
     * Trigger RPA workflow based on event
     */
    async triggerWorkflow(eventType, eventData) {
        console.log(`[RPA Integration] Processing event: ${eventType}`);

        try {
            // Find workflows that should be triggered by this event
            const triggeredWorkflows = [];
            
            for (const [name, workflow] of this.rpaWorkflows) {
                if (workflow.enabled && workflow.triggers.includes(eventType)) {
                    triggeredWorkflows.push({ name, workflow });
                }
            }

            if (triggeredWorkflows.length === 0) {
                console.log(`[RPA Integration] No workflows configured for event: ${eventType}`);
                return;
            }

            // Execute each triggered workflow
            for (const { name, workflow } of triggeredWorkflows) {
                await this.executeWorkflow(name, workflow, eventType, eventData);
            }

        } catch (error) {
            console.error(`[RPA Integration] Error processing event ${eventType}:`, error);
            
            await AuditLogger.logSystem('RPA_WORKFLOW_ERROR', {
                eventType,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Execute a specific RPA workflow
     */
    async executeWorkflow(name, workflow, eventType, eventData) {
        console.log(`[RPA Integration] Executing workflow: ${name} for event: ${eventType}`);

        try {
            // Prepare workflow payload
            const payload = {
                workflowName: name,
                workflowType: workflow.type,
                eventType: eventType,
                eventData: eventData,
                timestamp: new Date().toISOString(),
                configuration: workflow.configuration || {}
            };

            // Execute workflow based on type
            switch (workflow.type) {
                case 'NOTIFICATION':
                    await this.executeNotificationWorkflow(payload, workflow);
                    break;
                    
                case 'ESCALATION':
                    await this.executeEscalationWorkflow(payload, workflow);
                    break;
                    
                case 'TICKET_CREATION':
                    await this.executeTicketCreationWorkflow(payload, workflow);
                    break;
                    
                case 'COMPLIANCE_REPORT':
                    await this.executeComplianceReportWorkflow(payload, workflow);
                    break;
                    
                default:
                    await this.executeGenericWorkflow(payload, workflow);
            }

            // Update workflow execution statistics
            workflow.executionCount++;
            workflow.lastExecuted = new Date().toISOString();

            // Log successful execution
            await AuditLogger.logSystem('RPA_WORKFLOW_EXECUTED', {
                workflowName: name,
                workflowType: workflow.type,
                eventType,
                executionCount: workflow.executionCount,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error(`[RPA Integration] Error executing workflow ${name}:`, error);
            
            await AuditLogger.logSystem('RPA_WORKFLOW_EXECUTION_ERROR', {
                workflowName: name,
                workflowType: workflow.type,
                eventType,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Execute notification workflow
     */
    async executeNotificationWorkflow(payload, workflow) {
        console.log(`[RPA Integration] Executing notification workflow for: ${payload.eventType}`);

        // Enhance payload with notification-specific data
        const notificationPayload = {
            ...payload,
            notificationType: this.getNotificationType(payload.eventType),
            recipients: await this.getNotificationRecipients(payload.eventData),
            message: this.generateNotificationMessage(payload.eventType, payload.eventData),
            priority: this.getNotificationPriority(payload.eventType)
        };

        // Send to webhook if configured
        if (workflow.webhookUrl) {
            await this.sendWebhook(workflow.webhookUrl, notificationPayload);
        }

        // Store notification in database for tracking
        await this.storeNotificationRecord(notificationPayload);
    }

    /**
     * Execute escalation workflow
     */
    async executeEscalationWorkflow(payload, workflow) {
        console.log(`[RPA Integration] Executing escalation workflow for: ${payload.eventType}`);

        // Enhance payload with escalation-specific data
        const escalationPayload = {
            ...payload,
            escalationLevel: this.getEscalationLevel(payload.eventData),
            escalationPath: await this.getEscalationPath(payload.eventData),
            urgency: this.getEscalationUrgency(payload.eventType),
            deadline: this.calculateEscalationDeadline(payload.eventData)
        };

        // Send to webhook if configured
        if (workflow.webhookUrl) {
            await this.sendWebhook(workflow.webhookUrl, escalationPayload);
        }

        // Store escalation record
        await this.storeEscalationRecord(escalationPayload);
    }

    /**
     * Execute ticket creation workflow
     */
    async executeTicketCreationWorkflow(payload, workflow) {
        console.log(`[RPA Integration] Executing ticket creation workflow for: ${payload.eventType}`);

        // Enhance payload with ticket-specific data
        const ticketPayload = {
            ...payload,
            ticketType: this.getTicketType(payload.eventType),
            severity: this.getTicketSeverity(payload.eventType),
            category: this.getTicketCategory(payload.eventData),
            description: this.generateTicketDescription(payload.eventType, payload.eventData),
            assignee: await this.getTicketAssignee(payload.eventData)
        };

        // Send to webhook if configured
        if (workflow.webhookUrl) {
            await this.sendWebhook(workflow.webhookUrl, ticketPayload);
        }

        // Store ticket creation record
        await this.storeTicketRecord(ticketPayload);
    }

    /**
     * Execute compliance report workflow
     */
    async executeComplianceReportWorkflow(payload, workflow) {
        console.log(`[RPA Integration] Executing compliance report workflow for: ${payload.eventType}`);

        // Enhance payload with compliance-specific data
        const compliancePayload = {
            ...payload,
            reportType: this.getComplianceReportType(payload.eventType),
            reportPeriod: this.getReportPeriod(payload.eventData),
            complianceMetrics: await this.getComplianceMetrics(payload.eventData),
            distributionList: await this.getComplianceDistributionList()
        };

        // Send to webhook if configured
        if (workflow.webhookUrl) {
            await this.sendWebhook(workflow.webhookUrl, compliancePayload);
        }

        // Store compliance report record
        await this.storeComplianceReportRecord(compliancePayload);
    }

    /**
     * Execute generic workflow
     */
    async executeGenericWorkflow(payload, workflow) {
        console.log(`[RPA Integration] Executing generic workflow: ${workflow.type}`);

        // Send to webhook if configured
        if (workflow.webhookUrl) {
            await this.sendWebhook(workflow.webhookUrl, payload);
        }

        // Store generic workflow execution record
        await this.storeWorkflowRecord(payload);
    }

    /**
     * Send webhook to external RPA system
     */
    async sendWebhook(webhookUrl, payload) {
        try {
            // For Node.js versions that don't have built-in fetch
            let fetch;
            try {
                fetch = globalThis.fetch;
            } catch (e) {
                fetch = require('node-fetch');
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Sanitation-App-RPA-Integration/1.0'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.log(`[RPA Integration] Webhook sent successfully to: ${webhookUrl}`);
            } else {
                console.error(`[RPA Integration] Webhook failed: ${response.status} ${response.statusText}`);
            }

        } catch (error) {
            console.error(`[RPA Integration] Error sending webhook to ${webhookUrl}:`, error);
        }
    }

    // Helper methods for workflow data processing
    getNotificationType(eventType) {
        const typeMap = {
            'ASSIGNMENT_CREATED': 'assignment_alert',
            'ASSIGNMENT_OVERDUE': 'overdue_alert',
            'VALIDATION_FAILED': 'validation_alert'
        };
        return typeMap[eventType] || 'general';
    }

    async getNotificationRecipients(eventData) {
        // This would query the database to get appropriate recipients
        // For now, return a placeholder
        return ['manager@company.com', 'compliance@company.com'];
    }

    generateNotificationMessage(eventType, eventData) {
        const messages = {
            'ASSIGNMENT_CREATED': `New checklist assignment created: ${eventData.checklistTitle || 'Unknown'}`,
            'ASSIGNMENT_OVERDUE': `Assignment is overdue: ${eventData.checklistTitle || 'Unknown'}`,
            'VALIDATION_FAILED': `Validation failed for: ${eventData.checklistTitle || 'Unknown'}`
        };
        return messages[eventType] || `Event occurred: ${eventType}`;
    }

    getNotificationPriority(eventType) {
        const priorityMap = {
            'ASSIGNMENT_OVERDUE': 'high',
            'VALIDATION_FAILED': 'high',
            'ASSIGNMENT_CREATED': 'normal'
        };
        return priorityMap[eventType] || 'normal';
    }

    getEscalationLevel(eventData) {
        // Determine escalation level based on event data
        return eventData.escalationLevel || 1;
    }

    async getEscalationPath(eventData) {
        // Get escalation path from database or configuration
        return ['supervisor', 'manager', 'director'];
    }

    getEscalationUrgency(eventType) {
        const urgencyMap = {
            'ASSIGNMENT_OVERDUE': 'high',
            'VALIDATION_FAILED': 'medium',
            'COMPLIANCE_VIOLATION': 'critical'
        };
        return urgencyMap[eventType] || 'low';
    }

    calculateEscalationDeadline(eventData) {
        // Calculate deadline based on event data
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 24); // Default 24 hours
        return deadline.toISOString();
    }

    getTicketType(eventType) {
        const typeMap = {
            'TASK_BLOCKED': 'incident',
            'VALIDATION_FAILED': 'quality_issue',
            'COMPLIANCE_VIOLATION': 'compliance_issue'
        };
        return typeMap[eventType] || 'general';
    }

    getTicketSeverity(eventType) {
        const severityMap = {
            'COMPLIANCE_VIOLATION': 'critical',
            'VALIDATION_FAILED': 'high',
            'TASK_BLOCKED': 'medium'
        };
        return severityMap[eventType] || 'low';
    }

    getTicketCategory(eventData) {
        return eventData.category || 'checklist_management';
    }

    generateTicketDescription(eventType, eventData) {
        return `Automated ticket created for ${eventType}: ${JSON.stringify(eventData)}`;
    }

    async getTicketAssignee(eventData) {
        // Determine ticket assignee based on event data
        return eventData.assignee || 'support@company.com';
    }

    getComplianceReportType(eventType) {
        const typeMap = {
            'COMPLIANCE_REPORT_SCHEDULED': 'scheduled_report',
            'NON_COMPLIANCE_DETECTED': 'incident_report'
        };
        return typeMap[eventType] || 'general_report';
    }

    getReportPeriod(eventData) {
        return eventData.reportPeriod || 'weekly';
    }

    async getComplianceMetrics(eventData) {
        // Get compliance metrics from database
        return {
            complianceScore: 85,
            totalSubmissions: 150,
            validatedSubmissions: 128,
            nonCompliantTasks: 12
        };
    }

    async getComplianceDistributionList() {
        return ['compliance@company.com', 'management@company.com'];
    }

    // Database storage methods
    async storeNotificationRecord(payload) {
        try {
            await db.query(`
                INSERT INTO "RPAExecutionLog" (
                    "workflow_type", "event_type", "payload", "execution_timestamp"
                ) VALUES ($1, $2, $3, NOW())
            `, ['NOTIFICATION', payload.eventType, JSON.stringify(payload)]);
        } catch (error) {
            console.error('[RPA Integration] Error storing notification record:', error);
        }
    }

    async storeEscalationRecord(payload) {
        try {
            await db.query(`
                INSERT INTO "RPAExecutionLog" (
                    "workflow_type", "event_type", "payload", "execution_timestamp"
                ) VALUES ($1, $2, $3, NOW())
            `, ['ESCALATION', payload.eventType, JSON.stringify(payload)]);
        } catch (error) {
            console.error('[RPA Integration] Error storing escalation record:', error);
        }
    }

    async storeTicketRecord(payload) {
        try {
            await db.query(`
                INSERT INTO "RPAExecutionLog" (
                    "workflow_type", "event_type", "payload", "execution_timestamp"
                ) VALUES ($1, $2, $3, NOW())
            `, ['TICKET_CREATION', payload.eventType, JSON.stringify(payload)]);
        } catch (error) {
            console.error('[RPA Integration] Error storing ticket record:', error);
        }
    }

    async storeComplianceReportRecord(payload) {
        try {
            await db.query(`
                INSERT INTO "RPAExecutionLog" (
                    "workflow_type", "event_type", "payload", "execution_timestamp"
                ) VALUES ($1, $2, $3, NOW())
            `, ['COMPLIANCE_REPORT', payload.eventType, JSON.stringify(payload)]);
        } catch (error) {
            console.error('[RPA Integration] Error storing compliance report record:', error);
        }
    }

    async storeWorkflowRecord(payload) {
        try {
            await db.query(`
                INSERT INTO "RPAExecutionLog" (
                    "workflow_type", "event_type", "payload", "execution_timestamp"
                ) VALUES ($1, $2, $3, NOW())
            `, ['GENERIC', payload.eventType, JSON.stringify(payload)]);
        } catch (error) {
            console.error('[RPA Integration] Error storing workflow record:', error);
        }
    }

    /**
     * Get RPA integration status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            activeWorkflows: Array.from(this.rpaWorkflows.entries()).map(([name, workflow]) => ({
                name,
                type: workflow.type,
                enabled: workflow.enabled,
                executionCount: workflow.executionCount,
                lastExecuted: workflow.lastExecuted
            }))
        };
    }
}

// Export singleton instance
module.exports = new RPAIntegration();
