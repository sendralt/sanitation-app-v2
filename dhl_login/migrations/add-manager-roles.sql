-- Migration: Add Manager Role Support
-- Phase 3: Manager & Advanced Dashboards Implementation
-- Date: 2025-06-17

-- Add role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'manager', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to Users table
ALTER TABLE "Users" 
ADD COLUMN IF NOT EXISTS "role" user_role DEFAULT 'user' NOT NULL,
ADD COLUMN IF NOT EXISTS "managerId" UUID REFERENCES "Users"("id"),
ADD COLUMN IF NOT EXISTS "department" VARCHAR(255);

-- Update existing admin users to have admin role
UPDATE "Users" SET "role" = 'admin' WHERE "isAdmin" = true;

-- Create index for manager-employee relationships
CREATE INDEX IF NOT EXISTS "idx_users_manager_id" ON "Users"("managerId");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "Users"("role");
CREATE INDEX IF NOT EXISTS "idx_users_department" ON "Users"("department");

-- Add foreign key constraint for managerId
ALTER TABLE "Users" 
ADD CONSTRAINT "fk_users_manager" 
FOREIGN KEY ("managerId") REFERENCES "Users"("id") 
ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON COLUMN "Users"."role" IS 'User role: user, manager, or admin';
COMMENT ON COLUMN "Users"."managerId" IS 'ID of the manager for this user (self-referencing)';
COMMENT ON COLUMN "Users"."department" IS 'Department or team name for organizational grouping';

SELECT 'Manager role support migration completed successfully.' AS message;
