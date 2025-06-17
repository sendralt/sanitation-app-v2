// backend/automation/automationEngine.js
// Checklist Assignment Automation Engine for Phase 2

const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio'); // For parsing HTML checklist files
const AuditLogger = require('../utils/auditLogger');

/**
 * Main Automation Engine class
 * Handles automated checklist assignments based on rules and triggers
 */
class AutomationEngine {
    constructor() {
        this.isProcessing = false;
    }

    /**
     * Main entry point for automation triggers
     * @param {number} submissionId - The submission that triggered the automation
     * @param {string} triggerEvent - The event type ('ON_SUBMISSION_COMPLETE', 'ON_SUPERVISOR_VALIDATION')
     * @param {string} originalChecklistFilename - The filename of the triggering checklist
     */
    async processAutomationTrigger(submissionId, triggerEvent, originalChecklistFilename) {
        if (this.isProcessing) {
            console.log('[Automation] Engine is already processing, skipping trigger');
            return;
        }

        this.isProcessing = true;
        console.log(`[Automation] Processing trigger: ${triggerEvent} for submission ${submissionId}, checklist: ${originalChecklistFilename}`);

        try {
            // Find matching automation rules
            const matchingRules = await this.findMatchingRules(originalChecklistFilename, triggerEvent);
            
            if (matchingRules.length === 0) {
                console.log(`[Automation] No matching rules found for ${originalChecklistFilename} with trigger ${triggerEvent}`);

                // Log that no rules matched for debugging purposes
                await AuditLogger.logAutomation(
                    null,
                    'NO_MATCHING_RULES',
                    {
                        submissionId,
                        triggerEvent,
                        originalChecklistFilename
                    },
                    submissionId
                );
                return;
            }

            // Process each matching rule
            for (const rule of matchingRules) {
                await this.processAutomationRule(submissionId, rule);
            }

        } catch (error) {
            console.error('[Automation] Error processing automation trigger:', error);
            await AuditLogger.logAutomation(
                null,
                'AUTOMATION_ERROR',
                {
                    error: error.message,
                    submissionId,
                    triggerEvent,
                    originalChecklistFilename
                }
            );
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Find automation rules that match the given checklist filename and trigger event
     */
    async findMatchingRules(checklistFilename, triggerEvent) {
        const query = `
            SELECT * FROM "AutomationRules" 
            WHERE "is_active" = true 
            AND "trigger_event" = $1
            AND (
                "source_checklist_filename_pattern" = $2 
                OR $2 LIKE "source_checklist_filename_pattern"
            )
            ORDER BY "rule_id"
        `;
        
        const result = await db.query(query, [triggerEvent, checklistFilename]);
        return result.rows;
    }

    /**
     * Process a single automation rule
     */
    async processAutomationRule(triggeringSubmissionId, rule) {
        console.log(`[Automation] Processing rule ${rule.rule_id}: ${rule.source_checklist_filename_pattern} -> ${rule.next_checklist_filename}`);

        try {
            // Apply delay if specified
            if (rule.delay_minutes_after_trigger > 0) {
                console.log(`[Automation] Delaying execution by ${rule.delay_minutes_after_trigger} minutes`);
                // In a production system, this would be handled by a job queue
                // For now, we'll just log it and continue immediately
            }

            // Determine the assignee
            const assigneeUserId = await this.determineAssignee(triggeringSubmissionId, rule);
            if (!assigneeUserId) {
                console.log(`[Automation] Could not determine assignee for rule ${rule.rule_id}`);

                // Log the assignment failure
                await AuditLogger.logAutomation(
                    null,
                    'ASSIGNMENT_FAILED_NO_ASSIGNEE',
                    {
                        ruleId: rule.rule_id,
                        triggeringSubmissionId,
                        assignmentLogicType: rule.assignment_logic_type,
                        assignmentLogicDetail: rule.assignment_logic_detail
                    },
                    triggeringSubmissionId
                );
                return;
            }

            // Create the new checklist assignment
            const newSubmissionId = await this.createChecklistAssignment(
                rule.next_checklist_filename,
                assigneeUserId,
                rule
            );

            console.log(`[Automation] Created new assignment ${newSubmissionId} for user ${assigneeUserId}`);

            // Log the automation action
            await AuditLogger.logAutomation(
                assigneeUserId,
                'ASSIGNED_BY_AUTOMATION',
                {
                    ruleId: rule.rule_id,
                    triggeringSubmissionId,
                    newSubmissionId,
                    checklistFilename: rule.next_checklist_filename,
                    assignmentLogicType: rule.assignment_logic_type
                },
                newSubmissionId
            );

        } catch (error) {
            console.error(`[Automation] Error processing rule ${rule.rule_id}:`, error);
            await AuditLogger.logAutomation(
                null,
                'AUTOMATION_RULE_ERROR',
                {
                    ruleId: rule.rule_id,
                    error: error.message,
                    triggeringSubmissionId
                }
            );
        }
    }

    /**
     * Determine who should be assigned the new checklist based on the rule logic
     */
    async determineAssignee(triggeringSubmissionId, rule) {
        switch (rule.assignment_logic_type) {
            case 'SAME_USER':
                return await this.getSameUser(triggeringSubmissionId);
            
            case 'SPECIFIC_USER':
                return rule.assignment_logic_detail;
            
            case 'ROLE_BASED_ROUND_ROBIN':
                // This would require integration with dhl_login to get users by role
                // For now, fall back to same user
                console.log('[Automation] ROLE_BASED_ROUND_ROBIN not yet implemented, falling back to SAME_USER');
                return await this.getSameUser(triggeringSubmissionId);
            
            default:
                console.error(`[Automation] Unknown assignment logic type: ${rule.assignment_logic_type}`);
                return null;
        }
    }

    /**
     * Get the user who submitted the triggering checklist
     */
    async getSameUser(submissionId) {
        const query = 'SELECT "submitted_by_user_id" FROM "ChecklistSubmissions" WHERE "submission_id" = $1';
        const result = await db.query(query, [submissionId]);
        return result.rows[0]?.submitted_by_user_id || null;
    }

    /**
     * Create a new checklist assignment (shell submission + assignment record)
     */
    async createChecklistAssignment(checklistFilename, assigneeUserId, rule) {
        const client = await db.getClient();
        
        try {
            await client.query('BEGIN');

            // Calculate due date (default to 24 hours from now)
            const dueDate = new Date();
            dueDate.setHours(dueDate.getHours() + 24);

            // Create shell ChecklistSubmissions record
            const submissionResult = await client.query(`
                INSERT INTO "ChecklistSubmissions" (
                    "original_checklist_filename",
                    "checklist_title",
                    "submitted_by_user_id",
                    "submitted_by_username",
                    "status",
                    "json_file_path",
                    "due_date",
                    "assigned_to_user_id"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING "submission_id"
            `, [
                checklistFilename,
                this.deriveChecklistTitle(checklistFilename),
                null, // No submitter for automated assignments
                null, // No submitter username
                'Assigned',
                null, // No JSON file yet
                dueDate,
                assigneeUserId
            ]);

            const newSubmissionId = submissionResult.rows[0].submission_id;

            // Parse checklist structure and create headings/tasks
            await this.createChecklistStructure(client, newSubmissionId, checklistFilename);

            // Create ChecklistAssignments record
            await client.query(`
                INSERT INTO "ChecklistAssignments" (
                    "submission_id",
                    "assigned_to_user_id",
                    "due_timestamp",
                    "status",
                    "automation_rule_id"
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                newSubmissionId,
                assigneeUserId,
                dueDate,
                'Assigned',
                rule.rule_id
            ]);

            await client.query('COMMIT');
            return newSubmissionId;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Derive a human-readable title from the checklist filename
     */
    deriveChecklistTitle(filename) {
        // Convert filename to title (e.g., "1_A_Cell_West_Side_Daily.html" -> "1 A Cell West Side Daily")
        return filename
            .replace('.html', '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Parse checklist HTML file and create structure in database
     */
    async createChecklistStructure(client, submissionId, checklistFilename) {
        try {
            // Read the HTML file from Public directory
            const checklistPath = path.join(__dirname, '../../Public', checklistFilename);

            if (!fs.existsSync(checklistPath)) {
                const errorMsg = `Checklist file not found: ${checklistFilename}`;
                console.warn(`[Automation] ${errorMsg}`);

                // Log the missing file error for audit purposes
                await AuditLogger.logAutomation(
                    null,
                    'CHECKLIST_FILE_NOT_FOUND',
                    {
                        checklistFilename,
                        checklistPath,
                        submissionId
                    },
                    submissionId
                );

                throw new Error(errorMsg);
            }

            const htmlContent = fs.readFileSync(checklistPath, 'utf8');

            if (!htmlContent || htmlContent.trim().length === 0) {
                const errorMsg = `Checklist file is empty: ${checklistFilename}`;
                console.warn(`[Automation] ${errorMsg}`);

                await AuditLogger.logAutomation(
                    null,
                    'CHECKLIST_FILE_EMPTY',
                    {
                        checklistFilename,
                        submissionId
                    },
                    submissionId
                );

                throw new Error(errorMsg);
            }

            const $ = cheerio.load(htmlContent);

            let headingOrder = 0;

            // Find all headings (h2, h3, etc.) and their associated checkboxes
            $('h2, h3, h4').each(async (index, element) => {
                const headingText = $(element).text().trim();
                if (!headingText) return;

                headingOrder++;

                // Create heading record
                const headingResult = await client.query(`
                    INSERT INTO "SubmissionHeadings" (
                        "submission_id",
                        "heading_text",
                        "display_order"
                    ) VALUES ($1, $2, $3)
                    RETURNING "heading_id"
                `, [submissionId, headingText, headingOrder]);

                const headingId = headingResult.rows[0].heading_id;

                // Find checkboxes following this heading
                let nextElement = $(element).next();
                while (nextElement.length && !nextElement.is('h2, h3, h4')) {
                    nextElement.find('input[type="checkbox"]').each(async (i, checkbox) => {
                        const taskId = $(checkbox).attr('id');
                        const taskLabel = $(checkbox).next('label').text().trim() || taskId;

                        if (taskId) {
                            await client.query(`
                                INSERT INTO "SubmissionTasks" (
                                    "heading_id",
                                    "task_identifier_in_json",
                                    "task_label",
                                    "is_checked_on_submission",
                                    "current_status"
                                ) VALUES ($1, $2, $3, $4, $5)
                            `, [headingId, taskId, taskLabel, false, 'Pending']);
                        }
                    });
                    nextElement = nextElement.next();
                }
            });

        } catch (error) {
            console.error('[Automation] Error parsing checklist structure:', error);
            // Continue without structure - the assignment will still be created
        }
    }


}

// Export singleton instance
module.exports = new AutomationEngine();
