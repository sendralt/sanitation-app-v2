-- backend/db/init_schema.sql

-- Drop tables if they exist (for development/reset - be careful in production)
DROP TABLE IF EXISTS "SubmissionTasks";
DROP TABLE IF EXISTS "SubmissionHeadings";
DROP TABLE IF EXISTS "ChecklistSubmissions";

-- ChecklistSubmissions Table
-- Stores overall information about each checklist submitted by a user or created by automation.
CREATE TABLE "ChecklistSubmissions" (
    "submission_id" SERIAL PRIMARY KEY,
    "original_checklist_filename" TEXT, -- e.g., "1_A_Cell_West_Side_Daily.html"
    "checklist_title" TEXT,             -- Title of the checklist, e.g., "1-A Cell West Side Daily"
    "submitted_by_user_id" INTEGER,     -- User ID from JWT who originally submitted (if applicable)
    "submitted_by_username" TEXT,       -- Username from JWT (if applicable)
    "submission_timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(50) NOT NULL DEFAULT 'Pending', -- e.g., 'Pending', 'Assigned', 'InProgress', 'PendingSupervisorValidation', 'SupervisorValidated', 'Completed', 'Overdue'
    "json_file_path" TEXT UNIQUE,       -- Path to the corresponding backend/data/*.json file, if applicable
    "due_date" TIMESTAMPTZ,             -- Optional: Due date for automated assignments
    "assigned_to_user_id" INTEGER,      -- Optional: User ID this specific instance is assigned to (for automated tasks)
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN "ChecklistSubmissions"."status" IS 'Workflow status of the submission/assignment.';
COMMENT ON COLUMN "ChecklistSubmissions"."json_file_path" IS 'Path to the JSON file if this record originated from a manual user submission.';

-- SubmissionHeadings Table
-- Stores the headings/sections parsed from a submitted checklist.
CREATE TABLE "SubmissionHeadings" (
    "heading_id" SERIAL PRIMARY KEY,
    "submission_id" INTEGER NOT NULL REFERENCES "ChecklistSubmissions"("submission_id") ON DELETE CASCADE,
    "heading_text" TEXT NOT NULL,
    "display_order" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- SubmissionTasks Table
-- Stores individual tasks parsed from a submitted checklist, linked to a heading.
CREATE TABLE "SubmissionTasks" (
    "task_id" SERIAL PRIMARY KEY,
    "heading_id" INTEGER NOT NULL REFERENCES "SubmissionHeadings"("heading_id") ON DELETE CASCADE,
    "task_identifier_in_json" TEXT NOT NULL, -- The original ID from the HTML/JSON (e.g., "A76", "door274")
    "task_label" TEXT NOT NULL,              -- The human-readable label for the task
    "is_checked_on_submission" BOOLEAN DEFAULT FALSE, -- How the user initially submitted it
    "current_status" VARCHAR(50) NOT NULL DEFAULT 'Pending', -- e.g., 'Pending', 'Completed', 'Skipped', 'Blocked', 'ValidatedOK', 'ValidatedNotOK'
    "last_status_update_timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "supervisor_validated_status" VARCHAR(20), -- e.g., 'OK', 'NotOK', 'NotApplicable', NULL if not validated
    "comments" TEXT,                         -- Task-specific comments
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN "SubmissionTasks"."task_identifier_in_json" IS 'Original ID of the task item from the source checklist HTML/JSON.';
COMMENT ON COLUMN "SubmissionTasks"."current_status" IS 'Current operational status of the task.';
COMMENT ON COLUMN "SubmissionTasks"."supervisor_validated_status" IS 'Status after supervisor validation, if applicable.';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_checklistsubmissions_status ON "ChecklistSubmissions"("status");
CREATE INDEX IF NOT EXISTS idx_checklistsubmissions_assigned_user ON "ChecklistSubmissions"("assigned_to_user_id");
CREATE INDEX IF NOT EXISTS idx_checklistsubmissions_submitted_user ON "ChecklistSubmissions"("submitted_by_user_id");
CREATE INDEX IF NOT EXISTS idx_submissiontasks_status ON "SubmissionTasks"("current_status");

-- Function to update 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to update 'updated_at' on table updates
CREATE TRIGGER update_checklistsubmissions_updated_at
BEFORE UPDATE ON "ChecklistSubmissions"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissionheadings_updated_at
BEFORE UPDATE ON "SubmissionHeadings"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissiontasks_updated_at
BEFORE UPDATE ON "SubmissionTasks"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Initial Data (Optional Examples - uncomment if needed for testing)
/*
-- Example: A submission record
INSERT INTO "ChecklistSubmissions" ("original_checklist_filename", "checklist_title", "submitted_by_user_id", "submitted_by_username", "status", "json_file_path")
VALUES ('1_A_Cell_West_Side_Daily.html', '1 A Cell West Side Daily', 101, 'testuser', 'PendingSupervisorValidation', 'backend/data/data_1625000000000.json');

-- Example: A heading for that submission
INSERT INTO "SubmissionHeadings" ("submission_id", "heading_text", "display_order")
SELECT "submission_id", 'Wipe Around Door, Dock Lock Boxes, Trac Guards, and Frames Daily A West', 1
FROM "ChecklistSubmissions" WHERE "json_file_path" = 'backend/data/data_1625000000000.json';

-- Example: Tasks for that heading
INSERT INTO "SubmissionTasks" ("heading_id", "task_identifier_in_json", "task_label", "is_checked_on_submission", "current_status")
SELECT curr_heading."heading_id", 'A76', 'A76', TRUE, 'Pending'
FROM "SubmissionHeadings" curr_heading
JOIN "ChecklistSubmissions" cs ON cs."submission_id" = curr_heading."submission_id"
WHERE cs."json_file_path" = 'backend/data/data_1625000000000.json' AND curr_heading."heading_text" = 'Wipe Around Door, Dock Lock Boxes, Trac Guards, and Frames Daily A West';

INSERT INTO "SubmissionTasks" ("heading_id", "task_identifier_in_json", "task_label", "is_checked_on_submission", "current_status")
SELECT curr_heading."heading_id", 'door274', 'Door 274', FALSE, 'Pending'
FROM "SubmissionHeadings" curr_heading
JOIN "ChecklistSubmissions" cs ON cs."submission_id" = curr_heading."submission_id"
WHERE cs."json_file_path" = 'backend/data/data_1625000000000.json' AND curr_heading."heading_text" = 'Wipe Around Door, Dock Lock Boxes, Trac Guards, and Frames Daily A West';
*/

SELECT 'Initial schema created successfully.' AS message;