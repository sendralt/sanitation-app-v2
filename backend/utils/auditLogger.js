// backend/utils/auditLogger.js
// Centralized audit logging utility for Phase 2

const db = require('../config/db');

/**
 * Audit Logger utility class
 * Provides standardized audit logging throughout the application
 */
class AuditLogger {
    
    /**
     * Log an audit event
     * @param {string} userId - User ID who performed the action
     * @param {string} actionType - Type of action performed
     * @param {Object} details - Additional details about the action
     * @param {number} submissionId - Optional submission ID if action relates to a specific submission
     * @param {Object} client - Optional database client for transactions
     */
    static async log(userId, actionType, details = {}, submissionId = null, client = null) {
        try {
            const dbClient = client || db;
            
            await dbClient.query(`
                INSERT INTO "AuditTrail" (
                    "submission_id",
                    "user_id",
                    "action_type",
                    "details"
                ) VALUES ($1, $2, $3, $4)
            `, [
                submissionId,
                userId,
                actionType,
                JSON.stringify({
                    timestamp: new Date().toISOString(),
                    ...details
                })
            ]);
            
            console.log(`[Audit] ${actionType} by user ${userId}${submissionId ? ` for submission ${submissionId}` : ''}`);
        } catch (error) {
            console.error('[Audit] Failed to log audit event:', error);
            // Don't throw error to avoid breaking the main operation
        }
    }

    /**
     * Log user authentication events
     */
    static async logAuth(userId, actionType, details = {}) {
        return this.log(userId, actionType, {
            category: 'authentication',
            ...details
        });
    }

    /**
     * Log checklist submission events
     */
    static async logSubmission(userId, submissionId, actionType, details = {}, client = null) {
        return this.log(userId, actionType, {
            category: 'submission',
            ...details
        }, submissionId, client);
    }

    /**
     * Log validation events
     */
    static async logValidation(userId, submissionId, actionType, details = {}, client = null) {
        return this.log(userId, actionType, {
            category: 'validation',
            ...details
        }, submissionId, client);
    }

    /**
     * Log automation events
     */
    static async logAutomation(userId, actionType, details = {}, submissionId = null, client = null) {
        return this.log(userId, actionType, {
            category: 'automation',
            ...details
        }, submissionId, client);
    }

    /**
     * Log assignment events
     */
    static async logAssignment(userId, actionType, details = {}, submissionId = null, client = null) {
        return this.log(userId, actionType, {
            category: 'assignment',
            ...details
        }, submissionId, client);
    }

    /**
     * Log admin actions
     */
    static async logAdmin(userId, actionType, details = {}) {
        return this.log(userId, actionType, {
            category: 'admin',
            ...details
        });
    }

    /**
     * Log system events (no specific user)
     */
    static async logSystem(actionType, details = {}) {
        return this.log(null, actionType, {
            category: 'system',
            ...details
        });
    }

    /**
     * Log task status changes
     */
    static async logTaskStatusChange(userId, submissionId, taskId, oldStatus, newStatus, client = null) {
        return this.log(userId, 'TASK_STATUS_CHANGED', {
            category: 'task',
            taskId,
            oldStatus,
            newStatus
        }, submissionId, client);
    }

    /**
     * Log automation rule events
     */
    static async logAutomationRule(userId, actionType, ruleId, details = {}) {
        return this.log(userId, actionType, {
            category: 'automation_rule',
            ruleId,
            ...details
        });
    }

    /**
     * Get audit trail for a specific submission
     */
    static async getSubmissionAuditTrail(submissionId, limit = 50) {
        try {
            const result = await db.query(`
                SELECT 
                    "log_id",
                    "timestamp",
                    "user_id",
                    "action_type",
                    "details"
                FROM "AuditTrail"
                WHERE "submission_id" = $1
                ORDER BY "timestamp" DESC
                LIMIT $2
            `, [submissionId, limit]);
            
            return result.rows;
        } catch (error) {
            console.error('[Audit] Failed to get submission audit trail:', error);
            return [];
        }
    }

    /**
     * Get audit trail for a specific user
     */
    static async getUserAuditTrail(userId, limit = 50) {
        try {
            const result = await db.query(`
                SELECT 
                    "log_id",
                    "timestamp",
                    "submission_id",
                    "action_type",
                    "details"
                FROM "AuditTrail"
                WHERE "user_id" = $1
                ORDER BY "timestamp" DESC
                LIMIT $2
            `, [userId, limit]);
            
            return result.rows;
        } catch (error) {
            console.error('[Audit] Failed to get user audit trail:', error);
            return [];
        }
    }

    /**
     * Get recent audit events
     */
    static async getRecentAuditEvents(limit = 100) {
        try {
            const result = await db.query(`
                SELECT 
                    "log_id",
                    "timestamp",
                    "submission_id",
                    "user_id",
                    "action_type",
                    "details"
                FROM "AuditTrail"
                ORDER BY "timestamp" DESC
                LIMIT $1
            `, [limit]);
            
            return result.rows;
        } catch (error) {
            console.error('[Audit] Failed to get recent audit events:', error);
            return [];
        }
    }

    /**
     * Get audit statistics
     */
    static async getAuditStats(startDate = null, endDate = null) {
        try {
            let whereClause = '';
            let params = [];
            
            if (startDate && endDate) {
                whereClause = 'WHERE "timestamp" BETWEEN $1 AND $2';
                params = [startDate, endDate];
            } else if (startDate) {
                whereClause = 'WHERE "timestamp" >= $1';
                params = [startDate];
            }
            
            const result = await db.query(`
                SELECT 
                    "action_type",
                    COUNT(*) as count,
                    COUNT(DISTINCT "user_id") as unique_users
                FROM "AuditTrail"
                ${whereClause}
                GROUP BY "action_type"
                ORDER BY count DESC
            `, params);
            
            return result.rows;
        } catch (error) {
            console.error('[Audit] Failed to get audit statistics:', error);
            return [];
        }
    }
}

module.exports = AuditLogger;
