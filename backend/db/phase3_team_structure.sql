-- Phase 3 Migration: Team Structure Support
-- Adds team hierarchy and manager-employee relationships to PostgreSQL
-- Date: 2025-06-17

-- Create Teams table for organizational structure
CREATE TABLE IF NOT EXISTS "Teams" (
    "team_id" SERIAL PRIMARY KEY,
    "team_name" VARCHAR(255) NOT NULL UNIQUE,
    "description" TEXT,
    "manager_user_id" TEXT REFERENCES "ChecklistSubmissions"("submitted_by_user_id"), -- References user ID from JWT
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

CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON "Teams"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE "Teams" IS 'Organizational teams for checklist assignment and management';
COMMENT ON TABLE "TeamMembers" IS 'Junction table for team membership';
COMMENT ON COLUMN "Teams"."manager_user_id" IS 'User ID of the team manager (from JWT)';
COMMENT ON COLUMN "Teams"."parent_team_id" IS 'Parent team for hierarchical organization';
COMMENT ON COLUMN "TeamMembers"."role_in_team" IS 'Role within the team: member, lead, manager';
COMMENT ON COLUMN "ChecklistAssignments"."assigned_by_user_id" IS 'User who made the manual assignment';
COMMENT ON COLUMN "ChecklistAssignments"."team_id" IS 'Team context for the assignment';

-- Insert sample teams for testing
INSERT INTO "Teams" ("team_name", "description", "manager_user_id") VALUES 
('Sanitation Team A', 'Primary sanitation team for west side operations', NULL),
('Sanitation Team B', 'Primary sanitation team for east side operations', NULL),
('Quality Control', 'Quality control and compliance team', NULL),
('Management', 'Supervisory and management team', NULL)
ON CONFLICT ("team_name") DO NOTHING;

SELECT 'Phase 3 team structure migration completed successfully.' AS message;
