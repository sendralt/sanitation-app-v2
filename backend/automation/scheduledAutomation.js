// backend/automation/scheduledAutomation.js
// Scheduled Automation Engine for Phase 4
// Handles time-based checklist assignments and recurring tasks

const cron = require('node-cron');
const db = require('../config/db');
const AuditLogger = require('../utils/auditLogger');
const AutomationEngine = require('./automationEngine');

/**
 * Scheduled Automation Manager
 * Manages cron jobs for automated checklist assignments
 */
class ScheduledAutomation {
    constructor() {
        this.scheduledJobs = new Map(); // Store active cron jobs
        this.isInitialized = false;
    }

    /**
     * Initialize scheduled automation system
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('[Scheduled Automation] Already initialized');
            return;
        }

        console.log('[Scheduled Automation] Initializing scheduled automation system...');

        try {
            // Set up default scheduled jobs
            await this.setupDefaultSchedules();
            
            // Set up dynamic schedules from database
            await this.loadScheduledRules();

            this.isInitialized = true;
            console.log('[Scheduled Automation] Initialization complete');

            // Log system startup
            await AuditLogger.logSystem('SCHEDULED_AUTOMATION_STARTED', {
                timestamp: new Date().toISOString(),
                activeJobs: this.scheduledJobs.size
            });

        } catch (error) {
            console.error('[Scheduled Automation] Initialization failed:', error);
            await AuditLogger.logSystem('SCHEDULED_AUTOMATION_ERROR', {
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Set up default scheduled jobs
     */
    async setupDefaultSchedules() {
        // Daily cleanup of overdue assignments (runs at 2 AM every day)
        this.scheduleJob('daily-cleanup', '0 2 * * *', async () => {
            await this.processOverdueAssignments();
        });

        // Weekly compliance report generation (runs at 6 AM every Monday)
        this.scheduleJob('weekly-compliance-report', '0 6 * * 1', async () => {
            await this.generateWeeklyComplianceReport();
        });

        // Daily reminder notifications (runs at 9 AM every weekday)
        this.scheduleJob('daily-reminders', '0 9 * * 1-5', async () => {
            await this.sendDailyReminders();
        });

        // Hourly assignment check (runs every hour during business hours)
        this.scheduleJob('hourly-assignment-check', '0 8-17 * * 1-5', async () => {
            await this.checkPendingAssignments();
        });

        console.log('[Scheduled Automation] Default schedules configured');
    }

    /**
     * Load scheduled automation rules from database
     */
    async loadScheduledRules() {
        try {
            // Get automation rules with scheduled triggers
            const scheduledRules = await db.query(`
                SELECT * FROM "AutomationRules"
                WHERE "is_active" = true
                AND "trigger_event" = 'SCHEDULED'
                ORDER BY "rule_id"
            `);

            for (const rule of scheduledRules.rows) {
                await this.setupScheduledRule(rule);
            }

            console.log(`[Scheduled Automation] Loaded ${scheduledRules.rows.length} scheduled rules`);
        } catch (error) {
            console.error('[Scheduled Automation] Error loading scheduled rules:', error);
        }
    }

    /**
     * Set up a scheduled rule from database
     */
    async setupScheduledRule(rule) {
        try {
            // Parse schedule from assignment_logic_detail (should contain cron expression)
            const cronExpression = rule.assignment_logic_detail;
            
            if (!cronExpression || !cron.validate(cronExpression)) {
                console.warn(`[Scheduled Automation] Invalid cron expression for rule ${rule.rule_id}: ${cronExpression}`);
                return;
            }

            const jobName = `rule-${rule.rule_id}`;
            
            this.scheduleJob(jobName, cronExpression, async () => {
                await this.executeScheduledRule(rule);
            });

            console.log(`[Scheduled Automation] Scheduled rule ${rule.rule_id}: ${cronExpression}`);
        } catch (error) {
            console.error(`[Scheduled Automation] Error setting up rule ${rule.rule_id}:`, error);
        }
    }

    /**
     * Execute a scheduled automation rule
     */
    async executeScheduledRule(rule) {
        console.log(`[Scheduled Automation] Executing scheduled rule ${rule.rule_id}: ${rule.next_checklist_filename}`);

        try {
            // Determine assignee based on assignment logic
            let assigneeUserId;
            
            switch (rule.assignment_logic_type) {
                case 'ROLE_BASED_ROUND_ROBIN':
                    // Use the automation engine's round-robin logic
                    assigneeUserId = await AutomationEngine.getRoleBasedRoundRobinUser(rule);
                    break;
                    
                case 'SPECIFIC_USER':
                    assigneeUserId = rule.assignment_logic_detail;
                    break;
                    
                default:
                    console.warn(`[Scheduled Automation] Unsupported assignment logic for scheduled rule: ${rule.assignment_logic_type}`);
                    return;
            }

            if (!assigneeUserId) {
                console.warn(`[Scheduled Automation] Could not determine assignee for rule ${rule.rule_id}`);
                return;
            }

            // Create the scheduled assignment
            const submissionId = await AutomationEngine.createChecklistAssignment(
                rule.next_checklist_filename,
                assigneeUserId,
                rule
            );

            // Log the scheduled assignment
            await AuditLogger.logAutomation(
                assigneeUserId,
                'SCHEDULED_ASSIGNMENT_CREATED',
                {
                    ruleId: rule.rule_id,
                    submissionId,
                    checklistFilename: rule.next_checklist_filename,
                    assignmentLogicType: rule.assignment_logic_type,
                    scheduledTime: new Date().toISOString()
                },
                submissionId
            );

            console.log(`[Scheduled Automation] Created scheduled assignment ${submissionId} for user ${assigneeUserId}`);

        } catch (error) {
            console.error(`[Scheduled Automation] Error executing rule ${rule.rule_id}:`, error);
            
            await AuditLogger.logAutomation(
                null,
                'SCHEDULED_AUTOMATION_ERROR',
                {
                    ruleId: rule.rule_id,
                    error: error.message,
                    scheduledTime: new Date().toISOString()
                }
            );
        }
    }

    /**
     * Schedule a cron job
     */
    scheduleJob(name, cronExpression, task) {
        // Stop existing job if it exists
        if (this.scheduledJobs.has(name)) {
            this.scheduledJobs.get(name).stop();
        }

        // Create and start new job
        const job = cron.schedule(cronExpression, task, {
            scheduled: true,
            timezone: process.env.TIMEZONE || 'America/New_York'
        });

        this.scheduledJobs.set(name, job);
        console.log(`[Scheduled Automation] Scheduled job '${name}': ${cronExpression}`);
    }

    /**
     * Process overdue assignments
     */
    async processOverdueAssignments() {
        console.log('[Scheduled Automation] Processing overdue assignments...');

        try {
            // Update overdue assignments
            const result = await db.query(`
                UPDATE "ChecklistAssignments"
                SET "status" = 'Overdue'
                WHERE "status" IN ('Assigned', 'InProgress')
                AND "due_timestamp" < NOW()
                RETURNING "assignment_id", "assigned_to_user_id", "submission_id"
            `);

            if (result.rows.length > 0) {
                console.log(`[Scheduled Automation] Marked ${result.rows.length} assignments as overdue`);

                // Log each overdue assignment
                for (const assignment of result.rows) {
                    await AuditLogger.logAutomation(
                        assignment.assigned_to_user_id,
                        'ASSIGNMENT_MARKED_OVERDUE',
                        {
                            assignmentId: assignment.assignment_id,
                            submissionId: assignment.submission_id,
                            processedAt: new Date().toISOString()
                        },
                        assignment.submission_id
                    );
                }
            }
        } catch (error) {
            console.error('[Scheduled Automation] Error processing overdue assignments:', error);
        }
    }

    /**
     * Generate weekly compliance report
     */
    async generateWeeklyComplianceReport() {
        console.log('[Scheduled Automation] Generating weekly compliance report...');

        try {
            // This would integrate with the compliance reporting system
            // For now, just log the event
            await AuditLogger.logSystem('WEEKLY_COMPLIANCE_REPORT_GENERATED', {
                timestamp: new Date().toISOString(),
                reportPeriod: 'weekly'
            });

            console.log('[Scheduled Automation] Weekly compliance report generated');
        } catch (error) {
            console.error('[Scheduled Automation] Error generating compliance report:', error);
        }
    }

    /**
     * Send daily reminder notifications
     */
    async sendDailyReminders() {
        console.log('[Scheduled Automation] Sending daily reminders...');

        try {
            // Get assignments due today
            const dueTodayResult = await db.query(`
                SELECT 
                    ca."assignment_id",
                    ca."assigned_to_user_id",
                    cs."checklist_title",
                    ca."due_timestamp"
                FROM "ChecklistAssignments" ca
                JOIN "ChecklistSubmissions" cs ON ca."submission_id" = cs."submission_id"
                WHERE ca."status" IN ('Assigned', 'InProgress')
                AND DATE(ca."due_timestamp") = CURRENT_DATE
            `);

            console.log(`[Scheduled Automation] Found ${dueTodayResult.rows.length} assignments due today`);

            // Log reminder notifications (actual email sending would be implemented here)
            for (const assignment of dueTodayResult.rows) {
                await AuditLogger.logSystem('DAILY_REMINDER_SENT', {
                    assignmentId: assignment.assignment_id,
                    assignedUserId: assignment.assigned_to_user_id,
                    checklistTitle: assignment.checklist_title,
                    dueTimestamp: assignment.due_timestamp,
                    sentAt: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('[Scheduled Automation] Error sending daily reminders:', error);
        }
    }

    /**
     * Check pending assignments for escalation
     */
    async checkPendingAssignments() {
        try {
            // Get assignments that are approaching due date (within 2 hours)
            const approachingDueResult = await db.query(`
                SELECT COUNT(*) as count
                FROM "ChecklistAssignments"
                WHERE "status" IN ('Assigned', 'InProgress')
                AND "due_timestamp" BETWEEN NOW() AND NOW() + INTERVAL '2 hours'
            `);

            const count = parseInt(approachingDueResult.rows[0].count);
            if (count > 0) {
                console.log(`[Scheduled Automation] ${count} assignments approaching due date`);
            }

        } catch (error) {
            console.error('[Scheduled Automation] Error checking pending assignments:', error);
        }
    }

    /**
     * Stop all scheduled jobs
     */
    stopAllJobs() {
        console.log('[Scheduled Automation] Stopping all scheduled jobs...');
        
        for (const [name, job] of this.scheduledJobs) {
            job.stop();
            console.log(`[Scheduled Automation] Stopped job: ${name}`);
        }
        
        this.scheduledJobs.clear();
        this.isInitialized = false;
    }

    /**
     * Get status of all scheduled jobs
     */
    getJobStatus() {
        const status = {};
        for (const [name, job] of this.scheduledJobs) {
            status[name] = {
                running: job.running,
                scheduled: job.scheduled
            };
        }
        return status;
    }
}

// Export singleton instance
module.exports = new ScheduledAutomation();
