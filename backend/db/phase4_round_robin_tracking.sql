-- Phase 4 Migration: Round Robin Assignment Tracking
-- Adds support for role-based round robin automation
-- Date: 2025-06-17

-- Create RoundRobinTracking table to track last assigned user per rule and role
CREATE TABLE IF NOT EXISTS "RoundRobinTracking" (
    "tracking_id" SERIAL PRIMARY KEY,
    "automation_rule_id" INTEGER NOT NULL REFERENCES "AutomationRules"("rule_id") ON DELETE CASCADE,
    "role_name" VARCHAR(50) NOT NULL, -- The role being tracked (e.g., 'user', 'manager')
    "last_assigned_user_id" TEXT NOT NULL, -- Last user ID assigned for this rule+role combination
    "assignment_count" INTEGER DEFAULT 1, -- Number of times this user has been assigned
    "last_assignment_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("automation_rule_id", "role_name")
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS "idx_round_robin_rule_role" ON "RoundRobinTracking"("automation_rule_id", "role_name");

-- Add comments for documentation
COMMENT ON TABLE "RoundRobinTracking" IS 'Tracks round-robin assignment state for role-based automation rules';
COMMENT ON COLUMN "RoundRobinTracking"."automation_rule_id" IS 'Reference to the automation rule using round-robin logic';
COMMENT ON COLUMN "RoundRobinTracking"."role_name" IS 'The role being tracked for round-robin assignments';
COMMENT ON COLUMN "RoundRobinTracking"."last_assigned_user_id" IS 'User ID of the last person assigned for this rule+role';
COMMENT ON COLUMN "RoundRobinTracking"."assignment_count" IS 'Number of assignments made to this user for load balancing';

-- Create a view for round-robin assignment analytics
CREATE OR REPLACE VIEW "v_round_robin_analytics" AS
SELECT 
    ar."rule_id",
    ar."source_checklist_filename_pattern",
    ar."next_checklist_filename",
    ar."assignment_logic_detail" as role_name,
    rrt."last_assigned_user_id",
    rrt."assignment_count",
    rrt."last_assignment_timestamp",
    COUNT(ca."assignment_id") as total_assignments_made,
    COUNT(DISTINCT ca."assigned_to_user_id") as unique_users_assigned
FROM "AutomationRules" ar
LEFT JOIN "RoundRobinTracking" rrt ON ar."rule_id" = rrt."automation_rule_id"
LEFT JOIN "ChecklistAssignments" ca ON ar."rule_id" = ca."automation_rule_id"
WHERE ar."assignment_logic_type" = 'ROLE_BASED_ROUND_ROBIN'
GROUP BY 
    ar."rule_id", ar."source_checklist_filename_pattern", ar."next_checklist_filename",
    ar."assignment_logic_detail", rrt."last_assigned_user_id", rrt."assignment_count",
    rrt."last_assignment_timestamp"
ORDER BY ar."rule_id", rrt."last_assignment_timestamp" DESC;

COMMENT ON VIEW "v_round_robin_analytics" IS 'Analytics view for round-robin assignment performance and distribution';

-- Insert example round-robin automation rule for testing
INSERT INTO "AutomationRules" (
    "source_checklist_filename_pattern",
    "trigger_event",
    "next_checklist_filename",
    "assignment_logic_type",
    "assignment_logic_detail",
    "delay_minutes_after_trigger"
) VALUES 
(
    '%_Weekly.html',
    'ON_SUBMISSION_COMPLETE',
    '1_A_Cell_West_Side_Monthly.html',
    'ROLE_BASED_ROUND_ROBIN',
    'user',
    0
) ON CONFLICT DO NOTHING;

SELECT 'Phase 4 round-robin tracking migration completed successfully.' AS message;
