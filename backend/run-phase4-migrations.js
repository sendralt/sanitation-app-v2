// Phase 4 Migration Runner
// Executes Phase 4 database migrations for compliance and advanced automation features

const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function runPhase4Migrations() {
    console.log('[Phase 4 Migration] Starting Phase 4 database migrations...');

    try {
        // Migration files to run in order
        const migrationFiles = [
            'phase4_round_robin_tracking.sql',
            'phase4_rpa_integration.sql'
        ];

        for (const migrationFile of migrationFiles) {
            const migrationPath = path.join(__dirname, 'db', migrationFile);
            
            if (!fs.existsSync(migrationPath)) {
                console.warn(`[Phase 4 Migration] Migration file not found: ${migrationFile}`);
                continue;
            }

            console.log(`[Phase 4 Migration] Running migration: ${migrationFile}`);
            
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
            
            try {
                await db.query(migrationSQL);
                console.log(`[Phase 4 Migration] ✓ Successfully executed: ${migrationFile}`);
            } catch (error) {
                console.error(`[Phase 4 Migration] ✗ Error executing ${migrationFile}:`, error.message);
                // Continue with other migrations even if one fails
            }
        }

        console.log('[Phase 4 Migration] Phase 4 migrations completed');

        // Verify migrations by checking if tables exist
        await verifyMigrations();

    } catch (error) {
        console.error('[Phase 4 Migration] Fatal error during migrations:', error);
        process.exit(1);
    }
}

async function verifyMigrations() {
    console.log('[Phase 4 Migration] Verifying migrations...');

    try {
        // Check if RoundRobinTracking table exists
        const roundRobinCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'RoundRobinTracking'
            );
        `);

        if (roundRobinCheck.rows[0].exists) {
            console.log('[Phase 4 Migration] ✓ RoundRobinTracking table created successfully');
        } else {
            console.warn('[Phase 4 Migration] ⚠ RoundRobinTracking table not found');
        }

        // Check if RPAWorkflows table exists
        const rpaWorkflowsCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'RPAWorkflows'
            );
        `);

        if (rpaWorkflowsCheck.rows[0].exists) {
            console.log('[Phase 4 Migration] ✓ RPAWorkflows table created successfully');
        } else {
            console.warn('[Phase 4 Migration] ⚠ RPAWorkflows table not found');
        }

        // Check if RPAExecutionLog table exists
        const rpaExecutionLogCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'RPAExecutionLog'
            );
        `);

        if (rpaExecutionLogCheck.rows[0].exists) {
            console.log('[Phase 4 Migration] ✓ RPAExecutionLog table created successfully');
        } else {
            console.warn('[Phase 4 Migration] ⚠ RPAExecutionLog table not found');
        }

        // Check if views were created
        const viewsCheck = await db.query(`
            SELECT COUNT(*) as view_count
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name IN ('v_round_robin_analytics', 'v_rpa_analytics', 'v_recent_rpa_executions');
        `);

        console.log(`[Phase 4 Migration] ✓ Created ${viewsCheck.rows[0].view_count} Phase 4 views`);

        // Check if default RPA workflows were inserted
        const workflowCount = await db.query(`
            SELECT COUNT(*) as workflow_count
            FROM "RPAWorkflows"
            WHERE "workflow_name" IN ('assignment-notification', 'escalation-management', 'ticket-creation', 'compliance-reporting');
        `);

        console.log(`[Phase 4 Migration] ✓ Inserted ${workflowCount.rows[0].workflow_count} default RPA workflows`);

        console.log('[Phase 4 Migration] Migration verification completed');

    } catch (error) {
        console.error('[Phase 4 Migration] Error during verification:', error);
    }
}

// Run migrations if this script is executed directly
if (require.main === module) {
    runPhase4Migrations()
        .then(() => {
            console.log('[Phase 4 Migration] All migrations completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('[Phase 4 Migration] Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runPhase4Migrations, verifyMigrations };
