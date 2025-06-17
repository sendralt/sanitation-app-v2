-- Phase 2 Migration Script
-- Adds AutomationRules, ChecklistAssignments, and AuditTrail tables
-- Updates SupervisorValidationsLog structure to match Phase 2 requirements

-- First, check if we need to update SupervisorValidationsLog structure
-- Drop and recreate SupervisorValidationsLog with new structure
DROP TABLE IF EXISTS "SupervisorValidationsLog" CASCADE;

-- Recreate SupervisorValidationsLog with Phase 2 structure
CREATE TABLE "SupervisorValidationsLog" (
    "validation_log_id" SERIAL PRIMARY KEY,
    "submission_id" INTEGER NOT NULL REFERENCES "ChecklistSubmissions"("submission_id") ON DELETE CASCADE,
    "supervisor_name" TEXT,             -- Supervisor's name from validation form
    "validation_timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "validated_items_summary" JSONB,    -- JSON storing the state of items the supervisor explicitly validated
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "SupervisorValidationsLog" IS 'Logs supervisor validations with detailed item-level validation data';
COMMENT ON COLUMN "SupervisorValidationsLog"."validated_items_summary" IS 'JSON payload containing detailed validation results for each item';

-- Create AutomationRules table if it doesn't exist
CREATE TABLE IF NOT EXISTS "AutomationRules" (
    "rule_id" SERIAL PRIMARY KEY,
    "source_checklist_filename_pattern" TEXT NOT NULL, -- e.g., "1_A_Cell_West_Side_Daily.html", or patterns like "%_Daily.html"
    "trigger_event" VARCHAR(50) NOT NULL, -- e.g., 'ON_SUBMISSION_COMPLETE', 'ON_SUPERVISOR_VALIDATION'
    "next_checklist_filename" TEXT NOT NULL, -- filename of the checklist to assign
    "assignment_logic_type" VARCHAR(50) NOT NULL, -- e.g., 'SAME_USER', 'SPECIFIC_USER', 'ROLE_BASED_ROUND_ROBIN'
    "assignment_logic_detail" TEXT, -- e.g., specific user_id, role name
    "delay_minutes_after_trigger" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "AutomationRules" IS 'Rules for automated checklist assignments based on triggers';
COMMENT ON COLUMN "AutomationRules"."source_checklist_filename_pattern" IS 'Pattern to match source checklist filenames (supports wildcards)';
COMMENT ON COLUMN "AutomationRules"."trigger_event" IS 'Event that triggers this rule (ON_SUBMISSION_COMPLETE, ON_SUPERVISOR_VALIDATION)';
COMMENT ON COLUMN "AutomationRules"."assignment_logic_type" IS 'How to determine the assignee (SAME_USER, SPECIFIC_USER, ROLE_BASED_ROUND_ROBIN)';

-- Create ChecklistAssignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS "ChecklistAssignments" (
    "assignment_id" SERIAL PRIMARY KEY,
    "submission_id" INTEGER NOT NULL REFERENCES "ChecklistSubmissions"("submission_id") ON DELETE CASCADE,
    "assigned_to_user_id" TEXT NOT NULL, -- User ID this specific instance is assigned to
    "assignment_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_timestamp" TIMESTAMPTZ,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Assigned', -- e.g., 'Assigned', 'InProgress', 'SubmittedForValidation', 'Overdue'
    "automation_rule_id" INTEGER REFERENCES "AutomationRules"("rule_id"), -- Optional: if assigned by automation
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "ChecklistAssignments" IS 'Tracks active checklist assignments created by automation or manual assignment';
COMMENT ON COLUMN "ChecklistAssignments"."status" IS 'Current status of the assignment (Assigned, InProgress, SubmittedForValidation, Overdue)';

-- Drop old AuditTrail if it exists and create new one
DROP TABLE IF EXISTS "AuditTrail" CASCADE;

-- Create AuditTrail table with Phase 2 structure
CREATE TABLE "AuditTrail" (
    "log_id" SERIAL PRIMARY KEY,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submission_id" INTEGER REFERENCES "ChecklistSubmissions"("submission_id"), -- nullable
    "user_id" TEXT, -- nullable, who performed the action
    "action_type" VARCHAR(100) NOT NULL, -- e.g., 'SUBMITTED', 'VALIDATED_BY_SUPERVISOR', 'ASSIGNED_BY_AUTOMATION', 'TASK_STATUS_CHANGED', 'AUTOMATION_RULE_CREATED'
    "details" JSONB, -- for storing relevant payload or changes
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE "AuditTrail" IS 'Comprehensive audit log of all significant system events';
COMMENT ON COLUMN "AuditTrail"."action_type" IS 'Type of action performed (SUBMITTED, VALIDATED_BY_SUPERVISOR, ASSIGNED_BY_AUTOMATION, etc.)';
COMMENT ON COLUMN "AuditTrail"."details" IS 'JSON payload with additional context about the action';

-- Create indexes for Phase 2 tables
CREATE INDEX IF NOT EXISTS idx_automationrules_active ON "AutomationRules"("is_active");
CREATE INDEX IF NOT EXISTS idx_automationrules_trigger ON "AutomationRules"("trigger_event");
CREATE INDEX IF NOT EXISTS idx_checklistassignments_assigned_user ON "ChecklistAssignments"("assigned_to_user_id");
CREATE INDEX IF NOT EXISTS idx_checklistassignments_status ON "ChecklistAssignments"("status");
CREATE INDEX IF NOT EXISTS idx_audittrail_timestamp ON "AuditTrail"("timestamp");
CREATE INDEX IF NOT EXISTS idx_audittrail_action_type ON "AuditTrail"("action_type");
CREATE INDEX IF NOT EXISTS idx_audittrail_user_id ON "AuditTrail"("user_id");

-- Add triggers for updated_at columns on new tables
CREATE TRIGGER update_automationrules_updated_at
BEFORE UPDATE ON "AutomationRules"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklistassignments_updated_at
BEFORE UPDATE ON "ChecklistAssignments"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supervisorvalidationslog_updated_at
BEFORE UPDATE ON "SupervisorValidationsLog"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert some example automation rules for testing
INSERT INTO "AutomationRules" (
    "source_checklist_filename_pattern",
    "trigger_event",
    "next_checklist_filename",
    "assignment_logic_type",
    "assignment_logic_detail",
    "delay_minutes_after_trigger"
) VALUES 
(
    '1_A_Cell_West_Side_Daily.html',
    'ON_SUBMISSION_COMPLETE',
    '1_A_Cell_West_Side_Weekly.html',
    'SAME_USER',
    NULL,
    60
),
(
    '%_Daily.html',
    'ON_SUPERVISOR_VALIDATION',
    '2_B_Cell_East_Side_Daily.html',
    'SAME_USER',
    NULL,
    0
);

SELECT 'Phase 2 migration completed successfully.' AS message;
