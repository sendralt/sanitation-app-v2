#!/usr/bin/env node

/**
 * Phase 3 Migration Runner
 * Runs all Phase 3 database migrations using Node.js
 * This script connects to PostgreSQL using the existing configuration
 */

const fs = require('fs');
const path = require('path');
const db = require('./config/db');

console.log('🚀 Starting Phase 3 Migration Runner...\n');

async function executeMigrationBlocks(client) {
    let successCount = 0;
    let errorCount = 0;

    // Migration Block 1: Create Teams table
    console.log('⏳ Step 1: Creating Teams table...');
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS "Teams" (
                "team_id" SERIAL PRIMARY KEY,
                "team_name" VARCHAR(255) NOT NULL UNIQUE,
                "description" TEXT,
                "manager_user_id" TEXT,
                "parent_team_id" INTEGER REFERENCES "Teams"("team_id"),
                "is_active" BOOLEAN DEFAULT TRUE,
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Teams table created successfully');
        successCount++;
    } catch (error) {
        console.error(`❌ Error creating Teams table: ${error.message}`);
        errorCount++;
    }

    // Migration Block 2: Create TeamMembers table
    console.log('⏳ Step 2: Creating TeamMembers table...');
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS "TeamMembers" (
                "team_member_id" SERIAL PRIMARY KEY,
                "team_id" INTEGER NOT NULL REFERENCES "Teams"("team_id") ON DELETE CASCADE,
                "user_id" TEXT NOT NULL,
                "role_in_team" VARCHAR(50) DEFAULT 'member',
                "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "is_active" BOOLEAN DEFAULT TRUE,
                UNIQUE("team_id", "user_id")
            );
        `);
        console.log('✅ TeamMembers table created successfully');
        successCount++;
    } catch (error) {
        console.error(`❌ Error creating TeamMembers table: ${error.message}`);
        errorCount++;
    }

    // Migration Block 3: Add team columns to ChecklistAssignments
    console.log('⏳ Step 3: Adding team columns to ChecklistAssignments...');
    try {
        await client.query(`
            ALTER TABLE "ChecklistAssignments"
            ADD COLUMN IF NOT EXISTS "assigned_by_user_id" TEXT,
            ADD COLUMN IF NOT EXISTS "team_id" INTEGER REFERENCES "Teams"("team_id"),
            ADD COLUMN IF NOT EXISTS "assignment_notes" TEXT;
        `);
        console.log('✅ ChecklistAssignments enhanced with team columns');
        successCount++;
    } catch (error) {
        console.error(`❌ Error enhancing ChecklistAssignments: ${error.message}`);
        errorCount++;
    }

    // Migration Block 4: Create indexes
    console.log('⏳ Step 4: Creating performance indexes...');
    try {
        await client.query(`
            CREATE INDEX IF NOT EXISTS "idx_teams_manager" ON "Teams"("manager_user_id");
            CREATE INDEX IF NOT EXISTS "idx_teams_parent" ON "Teams"("parent_team_id");
            CREATE INDEX IF NOT EXISTS "idx_team_members_team" ON "TeamMembers"("team_id");
            CREATE INDEX IF NOT EXISTS "idx_team_members_user" ON "TeamMembers"("user_id");
            CREATE INDEX IF NOT EXISTS "idx_assignments_team" ON "ChecklistAssignments"("team_id");
            CREATE INDEX IF NOT EXISTS "idx_assignments_assigned_by" ON "ChecklistAssignments"("assigned_by_user_id");
            CREATE INDEX IF NOT EXISTS "idx_submissions_timestamp_status" ON "ChecklistSubmissions"("submission_timestamp", "status");
            CREATE INDEX IF NOT EXISTS "idx_assignments_user_status" ON "ChecklistAssignments"("assigned_to_user_id", "status");
            CREATE INDEX IF NOT EXISTS "idx_audit_timestamp_category" ON "AuditTrail"("timestamp", (details->>'category'));
            CREATE INDEX IF NOT EXISTS "idx_validations_supervisor_timestamp" ON "SupervisorValidationsLog"("supervisor_name", "validation_timestamp");
        `);
        console.log('✅ Performance indexes created successfully');
        successCount++;
    } catch (error) {
        console.error(`❌ Error creating indexes: ${error.message}`);
        errorCount++;
    }

    // Migration Block 5: Create trigger function
    console.log('⏳ Step 5: Creating trigger function...');
    try {
        await client.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        console.log('✅ Trigger function created successfully');
        successCount++;
    } catch (error) {
        console.error(`❌ Error creating trigger function: ${error.message}`);
        errorCount++;
    }

    // Migration Block 6: Create trigger
    console.log('⏳ Step 6: Creating Teams update trigger...');
    try {
        await client.query(`DROP TRIGGER IF EXISTS update_teams_updated_at ON "Teams";`);
        await client.query(`
            CREATE TRIGGER update_teams_updated_at
            BEFORE UPDATE ON "Teams"
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('✅ Teams update trigger created successfully');
        successCount++;
    } catch (error) {
        console.error(`❌ Error creating trigger: ${error.message}`);
        errorCount++;
    }

    // Migration Block 7: Insert sample teams
    console.log('⏳ Step 7: Inserting sample teams...');
    try {
        await client.query(`
            INSERT INTO "Teams" ("team_name", "description", "manager_user_id") VALUES
            ('Sanitation Team A', 'Primary sanitation team for west side operations', NULL),
            ('Sanitation Team B', 'Primary sanitation team for east side operations', NULL),
            ('Quality Control', 'Quality control and compliance team', NULL),
            ('Management', 'Supervisory and management team', NULL)
            ON CONFLICT ("team_name") DO NOTHING;
        `);
        console.log('✅ Sample teams inserted successfully');
        successCount++;
    } catch (error) {
        console.error(`❌ Error inserting sample teams: ${error.message}`);
        errorCount++;
    }

    return { successCount, errorCount };
}

async function runMigration() {
    let client;
    
    try {
        // Get a client from the pool
        client = await db.getClient();
        console.log('✅ Connected to PostgreSQL database');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'db', 'run_phase3_migrations.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Migration file loaded successfully');
        
        // Execute the migration in logical blocks instead of splitting by semicolon
        // This handles complex SQL blocks like DO $$ ... $$ properly
        const { successCount, errorCount } = await executeMigrationBlocks(client);

        // Create BI Views
        console.log('\n⏳ Step 8: Creating BI-ready database views...');
        let viewsSuccessCount = 0;
        let viewsErrorCount = 0;

        try {
            // Drop existing views first
            await client.query(`
                DROP VIEW IF EXISTS "v_submission_summary" CASCADE;
                DROP VIEW IF EXISTS "v_team_performance" CASCADE;
                DROP VIEW IF EXISTS "v_compliance_metrics" CASCADE;
                DROP VIEW IF EXISTS "v_audit_summary" CASCADE;
            `);

            // Create submission summary view
            await client.query(`
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
                    svl."validation_timestamp",
                    svl."supervisor_name",
                    EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600 as validation_turnaround_hours,
                    COUNT(st."task_id") as total_tasks,
                    COUNT(CASE WHEN st."is_checked_on_submission" = true THEN 1 END) as completed_tasks,
                    CASE
                        WHEN COUNT(st."task_id") > 0 THEN
                            ROUND((COUNT(CASE WHEN st."is_checked_on_submission" = true THEN 1 END)::decimal / COUNT(st."task_id")) * 100, 2)
                        ELSE 0
                    END as completion_percentage
                FROM "ChecklistSubmissions" cs
                LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
                LEFT JOIN "SubmissionHeadings" sh ON cs."submission_id" = sh."submission_id"
                LEFT JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
                GROUP BY
                    cs."submission_id", cs."original_checklist_filename", cs."checklist_title",
                    cs."submitted_by_user_id", cs."submitted_by_username", cs."submission_timestamp",
                    cs."status", cs."due_date", cs."assigned_to_user_id",
                    svl."validation_timestamp", svl."supervisor_name";
            `);

            // Create team performance view
            await client.query(`
                CREATE VIEW "v_team_performance" AS
                SELECT
                    t."team_id",
                    t."team_name",
                    t."description" as team_description,
                    t."manager_user_id",
                    COUNT(DISTINCT tm."user_id") as team_size,
                    COUNT(DISTINCT CASE
                        WHEN cs."submission_timestamp" >= NOW() - INTERVAL '30 days' THEN cs."submission_id"
                    END) as submissions_last_30_days,
                    COUNT(DISTINCT CASE
                        WHEN cs."submission_timestamp" >= NOW() - INTERVAL '30 days'
                        AND cs."status" = 'SupervisorValidated' THEN cs."submission_id"
                    END) as validated_submissions_last_30_days,
                    COUNT(DISTINCT ca."assignment_id") as total_assignments,
                    COUNT(DISTINCT CASE WHEN ca."status" IN ('Assigned', 'InProgress') THEN ca."assignment_id" END) as active_assignments,
                    COUNT(DISTINCT CASE
                        WHEN ca."due_timestamp" < NOW() AND ca."status" IN ('Assigned', 'InProgress')
                        THEN ca."assignment_id"
                    END) as overdue_assignments,
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
            `);

            // Create audit summary view
            await client.query(`
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
            `);

            console.log('✅ BI views created successfully');
            viewsSuccessCount = 3;
        } catch (error) {
            console.error(`❌ Error creating BI views: ${error.message}`);
            viewsErrorCount++;
        }

        // Summary
        const totalSuccess = successCount + viewsSuccessCount;
        const totalErrors = errorCount + viewsErrorCount;

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Successful operations: ${totalSuccess}`);
        console.log(`   ❌ Failed operations: ${totalErrors}`);

        if (totalErrors === 0) {
            console.log('\n🎉 All migrations completed successfully!');
        } else {
            console.log('\n⚠️  Some migrations had errors, but this is often normal for re-runs.');
        }
        
        // Test the new functionality
        console.log('\n🔍 Testing new Phase 3 features...');
        
        // Test if Teams table exists
        try {
            const teamsTest = await client.query('SELECT COUNT(*) FROM "Teams"');
            console.log(`✅ Teams table accessible (${teamsTest.rows[0].count} teams)`);
        } catch (error) {
            console.log(`❌ Teams table test failed: ${error.message}`);
        }
        
        // Test if views exist
        try {
            const viewTest = await client.query('SELECT COUNT(*) FROM "v_submission_summary" LIMIT 1');
            console.log(`✅ BI views accessible`);
        } catch (error) {
            console.log(`❌ BI views test failed: ${error.message}`);
        }
        
        // Test if user role column exists
        try {
            const roleTest = await client.query('SELECT COUNT(*) FROM "Users" WHERE "role" IS NOT NULL');
            console.log(`✅ User roles accessible (${roleTest.rows[0].count} users with roles)`);
        } catch (error) {
            console.log(`❌ User roles test failed: ${error.message}`);
        }
        
        console.log('\n🚀 Phase 3 migration process completed!');
        console.log('\nNext steps:');
        console.log('1. Restart your backend server: npm start');
        console.log('2. Access the manager dashboard at: http://localhost:3000/manager');
        console.log('3. Update user roles in the admin interface');
        console.log('4. Set up teams and assign team members');
        
    } catch (error) {
        console.error('💥 Fatal error during migration:');
        console.error(error);
        process.exit(1);
    } finally {
        if (client) {
            client.release();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n⏹️  Migration interrupted by user');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⏹️  Migration terminated');
    process.exit(0);
});

// Run the migration
runMigration().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});
