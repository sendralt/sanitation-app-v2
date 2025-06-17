-- Phase 3 Complete Migration Script
-- Runs all Phase 3 database migrations in the correct order
-- Date: 2025-06-17

-- 1. Add manager role support to DHL Login Users table
-- Add role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'manager', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to Users table (DHL Login)
ALTER TABLE "Users" 
ADD COLUMN IF NOT EXISTS "role" user_role DEFAULT 'user' NOT NULL,
ADD COLUMN IF NOT EXISTS "managerId" UUID REFERENCES "Users"("id"),
ADD COLUMN IF NOT EXISTS "department" VARCHAR(255);

-- Update existing admin users to have admin role
UPDATE "Users" SET "role" = 'admin' WHERE "isAdmin" = true;

-- Create indexes for manager-employee relationships
CREATE INDEX IF NOT EXISTS "idx_users_manager_id" ON "Users"("managerId");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "Users"("role");
CREATE INDEX IF NOT EXISTS "idx_users_department" ON "Users"("department");

-- Add foreign key constraint for managerId
DO $$ BEGIN
    ALTER TABLE "Users" 
    ADD CONSTRAINT "fk_users_manager" 
    FOREIGN KEY ("managerId") REFERENCES "Users"("id") 
    ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create team structure
-- Create Teams table for organizational structure
CREATE TABLE IF NOT EXISTS "Teams" (
    "team_id" SERIAL PRIMARY KEY,
    "team_name" VARCHAR(255) NOT NULL UNIQUE,
    "description" TEXT,
    "manager_user_id" TEXT, -- References user ID from JWT
    "parent_team_id" INTEGER REFERENCES "Teams"("team_id"), -- For hierarchical teams
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create TeamMembers junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS "TeamMembers" (
    "team_member_id" SERIAL PRIMARY KEY,
    "team_id" INTEGER NOT NULL REFERENCES "Teams"("team_id") ON DELETE CASCADE,
    "user_id" TEXT NOT NULL, -- User ID from JWT
    "role_in_team" VARCHAR(50) DEFAULT 'member', -- 'member', 'lead', 'manager'
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN DEFAULT TRUE,
    UNIQUE("team_id", "user_id")
);

-- Add team assignment tracking to ChecklistAssignments
ALTER TABLE "ChecklistAssignments" 
ADD COLUMN IF NOT EXISTS "assigned_by_user_id" TEXT, -- Who made the assignment
ADD COLUMN IF NOT EXISTS "team_id" INTEGER REFERENCES "Teams"("team_id"),
ADD COLUMN IF NOT EXISTS "assignment_notes" TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_teams_manager" ON "Teams"("manager_user_id");
CREATE INDEX IF NOT EXISTS "idx_teams_parent" ON "Teams"("parent_team_id");
CREATE INDEX IF NOT EXISTS "idx_team_members_team" ON "TeamMembers"("team_id");
CREATE INDEX IF NOT EXISTS "idx_team_members_user" ON "TeamMembers"("user_id");
CREATE INDEX IF NOT EXISTS "idx_assignments_team" ON "ChecklistAssignments"("team_id");
CREATE INDEX IF NOT EXISTS "idx_assignments_assigned_by" ON "ChecklistAssignments"("assigned_by_user_id");

-- Create updated_at trigger for Teams
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_teams_updated_at ON "Teams";
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON "Teams"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert sample teams for testing
INSERT INTO "Teams" ("team_name", "description", "manager_user_id") VALUES
('Sanitation Team A', 'Primary sanitation team for west side operations', NULL),
('Sanitation Team B', 'Primary sanitation team for east side operations', NULL),
('Quality Control', 'Quality control and compliance team', NULL),
('Management', 'Supervisory and management team', NULL)
ON CONFLICT ("team_name") DO NOTHING;

-- 3. Create BI-ready views
-- Drop existing views if they exist
DROP VIEW IF EXISTS "v_submission_summary" CASCADE;
DROP VIEW IF EXISTS "v_team_performance" CASCADE;
DROP VIEW IF EXISTS "v_compliance_metrics" CASCADE;
DROP VIEW IF EXISTS "v_audit_summary" CASCADE;
DROP VIEW IF EXISTS "v_assignment_analytics" CASCADE;
DROP VIEW IF EXISTS "v_validation_metrics" CASCADE;

-- 1. Submission Summary View
CREATE VIEW "v_submission_summary" AS
SELECT
    cs."submission_id",
    cs."original_checklist_filename",
    cs."checklist_title",
    cs."submitted_by_user_id",
    cs."submitted_by_username",
    cs."submission_timestamp",
    cs."status",
    cs."due_date",
    cs."assigned_to_user_id",

    -- Validation info
    svl."validation_timestamp",
    svl."supervisor_name",
    EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600 as validation_turnaround_hours,

    -- Task metrics
    COUNT(st."task_id") as total_tasks,
    COUNT(CASE WHEN st."is_checked_on_submission" = true THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN st."supervisor_validated_status" = true THEN 1 END) as validated_ok_tasks,
    COUNT(CASE WHEN st."supervisor_validated_status" = false THEN 1 END) as validated_not_ok_tasks,

    -- Calculated metrics
    CASE
        WHEN COUNT(st."task_id") > 0 THEN
            ROUND((COUNT(CASE WHEN st."is_checked_on_submission" = true THEN 1 END)::decimal / COUNT(st."task_id")) * 100, 2)
        ELSE 0
    END as completion_percentage,

    CASE
        WHEN COUNT(CASE WHEN st."supervisor_validated_status" IS NOT NULL THEN 1 END) > 0 THEN
            ROUND((COUNT(CASE WHEN st."supervisor_validated_status" = true THEN 1 END)::decimal /
                   COUNT(CASE WHEN st."supervisor_validated_status" IS NOT NULL THEN 1 END)) * 100, 2)
        ELSE NULL
    END as validation_success_percentage

FROM "ChecklistSubmissions" cs
LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
LEFT JOIN "SubmissionHeadings" sh ON cs."submission_id" = sh."submission_id"
LEFT JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
GROUP BY
    cs."submission_id", cs."original_checklist_filename", cs."checklist_title",
    cs."submitted_by_user_id", cs."submitted_by_username", cs."submission_timestamp",
    cs."status", cs."due_date", cs."assigned_to_user_id",
    svl."validation_timestamp", svl."supervisor_name";

-- 2. Team Performance View
CREATE VIEW "v_team_performance" AS
SELECT
    t."team_id",
    t."team_name",
    t."description" as team_description,
    t."manager_user_id",

    -- Team size
    COUNT(DISTINCT tm."user_id") as team_size,

    -- Submission metrics (last 30 days)
    COUNT(DISTINCT CASE
        WHEN cs."submission_timestamp" >= NOW() - INTERVAL '30 days' THEN cs."submission_id"
    END) as submissions_last_30_days,

    COUNT(DISTINCT CASE
        WHEN cs."submission_timestamp" >= NOW() - INTERVAL '30 days'
        AND cs."status" = 'SupervisorValidated' THEN cs."submission_id"
    END) as validated_submissions_last_30_days,

    -- Assignment metrics
    COUNT(DISTINCT ca."assignment_id") as total_assignments,
    COUNT(DISTINCT CASE WHEN ca."status" IN ('Assigned', 'InProgress') THEN ca."assignment_id" END) as active_assignments,
    COUNT(DISTINCT CASE
        WHEN ca."due_timestamp" < NOW() AND ca."status" IN ('Assigned', 'InProgress')
        THEN ca."assignment_id"
    END) as overdue_assignments,

    -- Performance metrics
    AVG(CASE
        WHEN svl."validation_timestamp" IS NOT NULL AND cs."submission_timestamp" IS NOT NULL
        THEN EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600
    END) as avg_validation_turnaround_hours

FROM "Teams" t
LEFT JOIN "TeamMembers" tm ON t."team_id" = tm."team_id" AND tm."is_active" = true
LEFT JOIN "ChecklistSubmissions" cs ON tm."user_id" = cs."submitted_by_user_id"
LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
LEFT JOIN "ChecklistAssignments" ca ON tm."user_id" = ca."assigned_to_user_id"
WHERE t."is_active" = true
GROUP BY t."team_id", t."team_name", t."description", t."manager_user_id";

-- 3. Compliance Metrics View
CREATE VIEW "v_compliance_metrics" AS
SELECT
    DATE_TRUNC('day', cs."submission_timestamp") as submission_date,
    cs."original_checklist_filename",

    -- Daily submission counts
    COUNT(cs."submission_id") as total_submissions,
    COUNT(CASE WHEN cs."status" = 'SupervisorValidated' THEN 1 END) as validated_submissions,
    COUNT(CASE WHEN svl."validation_timestamp" IS NOT NULL THEN 1 END) as supervisor_validations,

    -- Quality metrics
    AVG(CASE
        WHEN total_tasks.task_count > 0
        THEN (completed_tasks.completed_count::decimal / total_tasks.task_count) * 100
    END) as avg_completion_percentage,

    AVG(CASE
        WHEN validated_tasks.validated_count > 0
        THEN (validated_ok_tasks.ok_count::decimal / validated_tasks.validated_count) * 100
    END) as avg_validation_success_percentage,

    -- Turnaround metrics
    AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as avg_validation_hours

FROM "ChecklistSubmissions" cs
LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
LEFT JOIN (
    SELECT
        cs2."submission_id",
        COUNT(st."task_id") as task_count
    FROM "ChecklistSubmissions" cs2
    JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
    JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
    GROUP BY cs2."submission_id"
) total_tasks ON cs."submission_id" = total_tasks."submission_id"
LEFT JOIN (
    SELECT
        cs2."submission_id",
        COUNT(CASE WHEN st."is_checked_on_submission" = true THEN 1 END) as completed_count
    FROM "ChecklistSubmissions" cs2
    JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
    JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
    GROUP BY cs2."submission_id"
) completed_tasks ON cs."submission_id" = completed_tasks."submission_id"
LEFT JOIN (
    SELECT
        cs2."submission_id",
        COUNT(CASE WHEN st."supervisor_validated_status" IS NOT NULL THEN 1 END) as validated_count
    FROM "ChecklistSubmissions" cs2
    JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
    JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
    GROUP BY cs2."submission_id"
) validated_tasks ON cs."submission_id" = validated_tasks."submission_id"
LEFT JOIN (
    SELECT
        cs2."submission_id",
        COUNT(CASE WHEN st."supervisor_validated_status" = true THEN 1 END) as ok_count
    FROM "ChecklistSubmissions" cs2
    JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
    JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
    GROUP BY cs2."submission_id"
) validated_ok_tasks ON cs."submission_id" = validated_ok_tasks."submission_id"
GROUP BY DATE_TRUNC('day', cs."submission_timestamp"), cs."original_checklist_filename"
ORDER BY submission_date DESC;

-- 4. Audit Summary View
CREATE VIEW "v_audit_summary" AS
SELECT
    DATE_TRUNC('day', "timestamp") as audit_date,
    "action_type",
    details->>'category' as category,
    COUNT(*) as event_count,
    COUNT(DISTINCT "user_id") as unique_users,
    COUNT(DISTINCT "submission_id") as unique_submissions
FROM "AuditTrail"
GROUP BY DATE_TRUNC('day', "timestamp"), "action_type", details->>'category'
ORDER BY audit_date DESC, event_count DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_submissions_timestamp_status" ON "ChecklistSubmissions"("submission_timestamp", "status");
CREATE INDEX IF NOT EXISTS "idx_assignments_user_status" ON "ChecklistAssignments"("assigned_to_user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_audit_timestamp_category" ON "AuditTrail"("timestamp", (details->>'category'));
CREATE INDEX IF NOT EXISTS "idx_validations_supervisor_timestamp" ON "SupervisorValidationsLog"("supervisor_name", "validation_timestamp");

-- Add comments for documentation
COMMENT ON TABLE "Teams" IS 'Organizational teams for checklist assignment and management';
COMMENT ON TABLE "TeamMembers" IS 'Junction table for team membership';
COMMENT ON VIEW "v_submission_summary" IS 'Comprehensive submission metrics with task completion and validation data';
COMMENT ON VIEW "v_team_performance" IS 'Team-level performance metrics and KPIs';
COMMENT ON VIEW "v_compliance_metrics" IS 'Daily compliance and quality metrics by checklist type';
COMMENT ON VIEW "v_audit_summary" IS 'Summarized audit trail events for reporting';
