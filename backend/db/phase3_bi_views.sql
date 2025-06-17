-- Phase 3 Migration: BI-Ready Database Views
-- Creates optimized views for business intelligence and reporting
-- Date: 2025-06-17

-- Drop existing views if they exist
DROP VIEW IF EXISTS "v_submission_summary" CASCADE;
DROP VIEW IF EXISTS "v_team_performance" CASCADE;
DROP VIEW IF EXISTS "v_compliance_metrics" CASCADE;
DROP VIEW IF EXISTS "v_audit_summary" CASCADE;
DROP VIEW IF EXISTS "v_assignment_analytics" CASCADE;
DROP VIEW IF EXISTS "v_validation_metrics" CASCADE;

-- 1. Submission Summary View
-- Comprehensive view of all submissions with key metrics
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
-- Aggregated team performance metrics
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
-- Key compliance and quality metrics
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
-- Summarized audit trail for reporting
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

-- 5. Assignment Analytics View
-- Assignment performance and trends
CREATE VIEW "v_assignment_analytics" AS
SELECT 
    ca."assignment_id",
    ca."assigned_to_user_id",
    ca."assignment_timestamp",
    ca."due_timestamp",
    ca."status",
    cs."checklist_title",
    cs."original_checklist_filename",
    
    -- Time metrics
    EXTRACT(EPOCH FROM (NOW() - ca."assignment_timestamp"))/3600 as hours_since_assignment,
    CASE 
        WHEN ca."due_timestamp" IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ca."due_timestamp" - ca."assignment_timestamp"))/3600 
    END as allocated_hours,
    CASE 
        WHEN ca."due_timestamp" IS NOT NULL AND ca."due_timestamp" < NOW()
        THEN EXTRACT(EPOCH FROM (NOW() - ca."due_timestamp"))/3600 
    END as hours_overdue,
    
    -- Team context
    t."team_name",
    ar."rule_id" as automation_rule_id,
    ar."assignment_logic_type"

FROM "ChecklistAssignments" ca
JOIN "ChecklistSubmissions" cs ON ca."submission_id" = cs."submission_id"
LEFT JOIN "AutomationRules" ar ON ca."automation_rule_id" = ar."rule_id"
LEFT JOIN "TeamMembers" tm ON ca."assigned_to_user_id" = tm."user_id" AND tm."is_active" = true
LEFT JOIN "Teams" t ON tm."team_id" = t."team_id";

-- 6. Validation Metrics View
-- Supervisor validation performance
CREATE VIEW "v_validation_metrics" AS
SELECT 
    svl."supervisor_name",
    DATE_TRUNC('month', svl."validation_timestamp") as validation_month,
    
    -- Volume metrics
    COUNT(svl."validation_log_id") as total_validations,
    COUNT(DISTINCT cs."submitted_by_user_id") as unique_submitters,
    COUNT(DISTINCT cs."original_checklist_filename") as unique_checklists,
    
    -- Performance metrics
    AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as avg_turnaround_hours,
    MIN(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as min_turnaround_hours,
    MAX(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as max_turnaround_hours,
    
    -- Quality metrics (based on validated items)
    AVG(
        CASE 
            WHEN jsonb_array_length(svl."validated_items_summary") > 0
            THEN (
                SELECT COUNT(*)::decimal 
                FROM jsonb_array_elements(svl."validated_items_summary") item 
                WHERE (item->>'isValid')::boolean = true
            ) / jsonb_array_length(svl."validated_items_summary") * 100
        END
    ) as avg_validation_success_rate

FROM "SupervisorValidationsLog" svl
JOIN "ChecklistSubmissions" cs ON svl."submission_id" = cs."submission_id"
GROUP BY svl."supervisor_name", DATE_TRUNC('month', svl."validation_timestamp")
ORDER BY validation_month DESC, total_validations DESC;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_submissions_timestamp_status" ON "ChecklistSubmissions"("submission_timestamp", "status");
CREATE INDEX IF NOT EXISTS "idx_assignments_user_status" ON "ChecklistAssignments"("assigned_to_user_id", "status");
CREATE INDEX IF NOT EXISTS "idx_audit_timestamp_category" ON "AuditTrail"("timestamp", (details->>'category'));
CREATE INDEX IF NOT EXISTS "idx_validations_supervisor_timestamp" ON "SupervisorValidationsLog"("supervisor_name", "validation_timestamp");

-- Add comments for documentation
COMMENT ON VIEW "v_submission_summary" IS 'Comprehensive submission metrics with task completion and validation data';
COMMENT ON VIEW "v_team_performance" IS 'Team-level performance metrics and KPIs';
COMMENT ON VIEW "v_compliance_metrics" IS 'Daily compliance and quality metrics by checklist type';
COMMENT ON VIEW "v_audit_summary" IS 'Summarized audit trail events for reporting';
COMMENT ON VIEW "v_assignment_analytics" IS 'Assignment performance and timing analytics';
COMMENT ON VIEW "v_validation_metrics" IS 'Supervisor validation performance metrics';

SELECT 'Phase 3 BI views created successfully.' AS message;
