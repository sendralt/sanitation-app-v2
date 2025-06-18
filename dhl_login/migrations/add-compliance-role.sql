-- Migration: Add compliance role to user enum
-- Phase 4: Compliance & Advanced Automation Implementation
-- Date: 2025-06-17

-- Add compliance role to the existing enum
-- Note: In SQLite, we need to handle this differently than PostgreSQL
-- SQLite doesn't support ALTER TYPE, so we'll need to recreate the constraint

-- First, let's check if we're using SQLite or PostgreSQL
-- This migration is designed for SQLite (used by dhl_login)

-- For SQLite, we need to:
-- 1. Create a new table with the updated enum
-- 2. Copy data from old table
-- 3. Drop old table
-- 4. Rename new table

-- However, since Sequelize handles this automatically when we update the model,
-- we'll just document the change here and update the model directly.

-- The role enum should now include: 'user', 'manager', 'admin', 'compliance'

-- Create a test compliance user for testing
-- This will be handled by a separate seeder script

SELECT 'Compliance role migration prepared. Update the User model enum to include compliance role.' AS message;
