-- Phase 4 Migration: RPA Integration Tables
-- Adds support for RPA workflow integration and execution tracking
-- Date: 2025-06-17

-- Create RPAWorkflows table for custom workflow configurations
CREATE TABLE IF NOT EXISTS "RPAWorkflows" (
    "workflow_id" SERIAL PRIMARY KEY,
    "workflow_name" VARCHAR(100) NOT NULL UNIQUE,
    "workflow_type" VARCHAR(50) NOT NULL, -- NOTIFICATION, ESCALATION, TICKET_CREATION, COMPLIANCE_REPORT
    "description" TEXT,
    "webhook_url" TEXT,
    "trigger_events" JSONB NOT NULL DEFAULT '[]', -- Array of event types that trigger this workflow
    "configuration" JSONB DEFAULT '{}', -- Workflow-specific configuration
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT,
    "last_modified_by_user_id" TEXT
);

-- Create RPAExecutionLog table for tracking workflow executions
CREATE TABLE IF NOT EXISTS "RPAExecutionLog" (
    "execution_id" SERIAL PRIMARY KEY,
    "workflow_id" INTEGER REFERENCES "RPAWorkflows"("workflow_id") ON DELETE SET NULL,
    "workflow_type" VARCHAR(50) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "execution_status" VARCHAR(20) DEFAULT 'SUCCESS', -- SUCCESS, FAILED, PENDING
    "execution_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "execution_duration_ms" INTEGER,
    "error_message" TEXT,
    "webhook_response_status" INTEGER,
    "webhook_response_body" TEXT
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "idx_rpa_workflows_type" ON "RPAWorkflows"("workflow_type");
CREATE INDEX IF NOT EXISTS "idx_rpa_workflows_active" ON "RPAWorkflows"("is_active");
CREATE INDEX IF NOT EXISTS "idx_rpa_execution_log_timestamp" ON "RPAExecutionLog"("execution_timestamp");
CREATE INDEX IF NOT EXISTS "idx_rpa_execution_log_type" ON "RPAExecutionLog"("workflow_type");
CREATE INDEX IF NOT EXISTS "idx_rpa_execution_log_event" ON "RPAExecutionLog"("event_type");
CREATE INDEX IF NOT EXISTS "idx_rpa_execution_log_status" ON "RPAExecutionLog"("execution_status");

-- Add comments for documentation
COMMENT ON TABLE "RPAWorkflows" IS 'Configuration for RPA workflow integrations';
COMMENT ON COLUMN "RPAWorkflows"."workflow_name" IS 'Unique name identifier for the workflow';
COMMENT ON COLUMN "RPAWorkflows"."workflow_type" IS 'Type of RPA workflow (NOTIFICATION, ESCALATION, etc.)';
COMMENT ON COLUMN "RPAWorkflows"."trigger_events" IS 'JSON array of event types that trigger this workflow';
COMMENT ON COLUMN "RPAWorkflows"."configuration" IS 'Workflow-specific configuration parameters';

COMMENT ON TABLE "RPAExecutionLog" IS 'Log of RPA workflow executions and their results';
COMMENT ON COLUMN "RPAExecutionLog"."payload" IS 'Complete payload sent to the RPA workflow';
COMMENT ON COLUMN "RPAExecutionLog"."execution_status" IS 'Status of the workflow execution';

-- Create a view for RPA analytics
CREATE OR REPLACE VIEW "v_rpa_analytics" AS
SELECT 
    rw."workflow_name",
    rw."workflow_type",
    rw."is_active",
    COUNT(rel."execution_id") as total_executions,
    COUNT(CASE WHEN rel."execution_status" = 'SUCCESS' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN rel."execution_status" = 'FAILED' THEN 1 END) as failed_executions,
    AVG(rel."execution_duration_ms") as avg_execution_time_ms,
    MAX(rel."execution_timestamp") as last_execution,
    COUNT(CASE WHEN rel."execution_timestamp" >= NOW() - INTERVAL '24 hours' THEN 1 END) as executions_last_24h,
    COUNT(CASE WHEN rel."execution_timestamp" >= NOW() - INTERVAL '7 days' THEN 1 END) as executions_last_7d
FROM "RPAWorkflows" rw
LEFT JOIN "RPAExecutionLog" rel ON rw."workflow_id" = rel."workflow_id"
GROUP BY rw."workflow_id", rw."workflow_name", rw."workflow_type", rw."is_active"
ORDER BY total_executions DESC;

COMMENT ON VIEW "v_rpa_analytics" IS 'Analytics view for RPA workflow performance and execution statistics';

-- Insert default RPA workflow configurations
INSERT INTO "RPAWorkflows" (
    "workflow_name",
    "workflow_type", 
    "description",
    "trigger_events",
    "configuration"
) VALUES 
(
    'assignment-notification',
    'NOTIFICATION',
    'Send notifications when new assignments are created',
    '["ASSIGNMENT_CREATED", "ASSIGNMENT_OVERDUE"]',
    '{"priority": "normal", "channels": ["email", "slack"]}'
),
(
    'escalation-management',
    'ESCALATION',
    'Escalate overdue tasks to managers',
    '["ASSIGNMENT_OVERDUE", "VALIDATION_FAILED"]',
    '{"escalation_levels": ["supervisor", "manager", "director"], "timeout_hours": 24}'
),
(
    'ticket-creation',
    'TICKET_CREATION',
    'Create support tickets for blocked or failed tasks',
    '["TASK_BLOCKED", "VALIDATION_FAILED", "COMPLIANCE_VIOLATION"]',
    '{"ticket_system": "jira", "default_assignee": "support", "priority_mapping": {"COMPLIANCE_VIOLATION": "critical"}}'
),
(
    'compliance-reporting',
    'COMPLIANCE_REPORT',
    'Generate and distribute compliance reports',
    '["COMPLIANCE_REPORT_SCHEDULED", "NON_COMPLIANCE_DETECTED"]',
    '{"report_formats": ["pdf", "excel"], "distribution_list": ["compliance@company.com"], "schedule": "weekly"}'
) ON CONFLICT ("workflow_name") DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_rpa_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated_at" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
DROP TRIGGER IF EXISTS trigger_update_rpa_workflows_updated_at ON "RPAWorkflows";
CREATE TRIGGER trigger_update_rpa_workflows_updated_at
    BEFORE UPDATE ON "RPAWorkflows"
    FOR EACH ROW
    EXECUTE FUNCTION update_rpa_workflows_updated_at();

-- Create a view for recent RPA executions
CREATE OR REPLACE VIEW "v_recent_rpa_executions" AS
SELECT 
    rel."execution_id",
    rel."workflow_type",
    rel."event_type",
    rel."execution_status",
    rel."execution_timestamp",
    rel."execution_duration_ms",
    rw."workflow_name",
    rw."description",
    CASE 
        WHEN rel."execution_timestamp" >= NOW() - INTERVAL '1 hour' THEN 'recent'
        WHEN rel."execution_timestamp" >= NOW() - INTERVAL '24 hours' THEN 'today'
        WHEN rel."execution_timestamp" >= NOW() - INTERVAL '7 days' THEN 'this_week'
        ELSE 'older'
    END as time_category
FROM "RPAExecutionLog" rel
LEFT JOIN "RPAWorkflows" rw ON rel."workflow_id" = rw."workflow_id"
WHERE rel."execution_timestamp" >= NOW() - INTERVAL '30 days'
ORDER BY rel."execution_timestamp" DESC;

COMMENT ON VIEW "v_recent_rpa_executions" IS 'Recent RPA workflow executions with time categorization';

SELECT 'Phase 4 RPA integration migration completed successfully.' AS message;
