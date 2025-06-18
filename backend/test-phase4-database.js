// Phase 4 Database Testing Script
// Tests Phase 4 database structure and data

const db = require('./config/db');

async function testPhase4Database() {
    console.log('🧪 Phase 4 Database Testing Started...\n');

    try {
        // Test 1: Database Tables
        await testDatabaseTables();

        // Test 2: Database Views
        await testDatabaseViews();

        // Test 3: Default Data
        await testDefaultData();

        // Test 4: Table Structure
        await testTableStructure();

        console.log('\n✅ Phase 4 Database Testing Completed Successfully!');

    } catch (error) {
        console.error('\n❌ Phase 4 Database Testing Failed:', error);
        process.exit(1);
    }
}

async function testDatabaseTables() {
    console.log('🗄️  Testing Database Tables...');

    const tables = ['RoundRobinTracking', 'RPAWorkflows', 'RPAExecutionLog'];
    
    for (const tableName of tables) {
        const result = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        `, [tableName]);
        
        console.log(`   ✓ ${tableName}: ${result.rows[0].exists ? 'EXISTS' : 'MISSING'}`);
    }
    console.log('');
}

async function testDatabaseViews() {
    console.log('👁️  Testing Database Views...');

    const views = ['v_round_robin_analytics', 'v_rpa_analytics', 'v_recent_rpa_executions'];
    
    for (const viewName of views) {
        const result = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name = $1
            );
        `, [viewName]);
        
        console.log(`   ✓ ${viewName}: ${result.rows[0].exists ? 'EXISTS' : 'MISSING'}`);
    }
    console.log('');
}

async function testDefaultData() {
    console.log('📊 Testing Default Data...');

    // Test default RPA workflows
    const workflowsResult = await db.query(`
        SELECT "workflow_name", "workflow_type", "is_active"
        FROM "RPAWorkflows"
        WHERE "workflow_name" IN ('assignment-notification', 'escalation-management', 'ticket-creation', 'compliance-reporting')
        ORDER BY "workflow_name"
    `);

    console.log(`   ✓ Default RPA workflows: ${workflowsResult.rows.length}/4 inserted`);
    
    for (const workflow of workflowsResult.rows) {
        console.log(`     - ${workflow.workflow_name} (${workflow.workflow_type}) - ${workflow.is_active ? 'ACTIVE' : 'INACTIVE'}`);
    }

    // Test automation rules
    const rulesResult = await db.query(`
        SELECT COUNT(*) as count
        FROM "AutomationRules"
        WHERE "assignment_logic_type" = 'ROLE_BASED_ROUND_ROBIN'
    `);

    console.log(`   ✓ Round-robin automation rules: ${rulesResult.rows[0].count}`);
    console.log('');
}

async function testTableStructure() {
    console.log('🏗️  Testing Table Structure...');

    // Test RoundRobinTracking structure
    const roundRobinColumns = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'RoundRobinTracking'
        ORDER BY ordinal_position
    `);

    console.log(`   ✓ RoundRobinTracking columns: ${roundRobinColumns.rows.length}`);
    for (const col of roundRobinColumns.rows) {
        console.log(`     - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
    }

    // Test RPAWorkflows structure
    const rpaWorkflowColumns = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'RPAWorkflows'
        ORDER BY ordinal_position
    `);

    console.log(`\n   ✓ RPAWorkflows columns: ${rpaWorkflowColumns.rows.length}`);
    for (const col of rpaWorkflowColumns.rows) {
        console.log(`     - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
    }

    // Test indexes
    const indexesResult = await db.query(`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename IN ('RoundRobinTracking', 'RPAWorkflows', 'RPAExecutionLog')
        AND schemaname = 'public'
        ORDER BY tablename, indexname
    `);

    console.log(`\n   ✓ Phase 4 indexes: ${indexesResult.rows.length}`);
    for (const idx of indexesResult.rows) {
        console.log(`     - ${idx.indexname} on ${idx.tablename}`);
    }
    console.log('');
}

// Run tests if this script is executed directly
if (require.main === module) {
    testPhase4Database()
        .then(() => {
            console.log('🎉 Phase 4 database structure is ready!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Phase 4 database testing failed:', error);
            process.exit(1);
        });
}

module.exports = { testPhase4Database };
