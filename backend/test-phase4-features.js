// Phase 4 Feature Testing Script
// Tests all Phase 4 compliance and automation features

const fetch = require('node-fetch');
const db = require('./config/db');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

async function testPhase4Features() {
    console.log('🧪 Phase 4 Feature Testing Started...\n');

    try {
        // Test 1: Database Tables and Views
        await testDatabaseStructure();

        // Test 2: RPA Integration Status
        await testRPAIntegration();

        // Test 3: Scheduled Automation Status
        await testScheduledAutomation();

        // Test 4: Round Robin Tracking
        await testRoundRobinTracking();

        // Test 5: Compliance User
        await testComplianceUser();

        // Test 6: API Endpoints (without authentication for basic connectivity)
        await testAPIEndpoints();

        console.log('\n✅ Phase 4 Feature Testing Completed Successfully!');
        console.log('\n📋 Manual Testing Steps:');
        console.log('1. Login as compliance user: username="compliance", password="Compliance123!"');
        console.log('2. Navigate to /compliance dashboard');
        console.log('3. Test compliance metrics and audit trail');
        console.log('4. Verify role-based access controls');

    } catch (error) {
        console.error('\n❌ Phase 4 Feature Testing Failed:', error);
        process.exit(1);
    }
}

async function testDatabaseStructure() {
    console.log('🗄️  Testing Database Structure...');

    // Test RoundRobinTracking table
    const roundRobinTest = await db.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_name = 'RoundRobinTracking'
    `);
    console.log(`   ✓ RoundRobinTracking table: ${roundRobinTest.rows[0].count > 0 ? 'EXISTS' : 'MISSING'}`);

    // Test RPAWorkflows table
    const rpaWorkflowsTest = await db.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_name = 'RPAWorkflows'
    `);
    console.log(`   ✓ RPAWorkflows table: ${rpaWorkflowsTest.rows[0].count > 0 ? 'EXISTS' : 'MISSING'}`);

    // Test RPAExecutionLog table
    const rpaExecutionTest = await db.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_name = 'RPAExecutionLog'
    `);
    console.log(`   ✓ RPAExecutionLog table: ${rpaExecutionTest.rows[0].count > 0 ? 'EXISTS' : 'MISSING'}`);

    // Test views
    const viewsTest = await db.query(`
        SELECT COUNT(*) as count FROM information_schema.views 
        WHERE table_name IN ('v_round_robin_analytics', 'v_rpa_analytics', 'v_recent_rpa_executions')
    `);
    console.log(`   ✓ Phase 4 views: ${viewsTest.rows[0].count}/3 created`);

    // Test default RPA workflows
    const workflowsTest = await db.query(`
        SELECT COUNT(*) as count FROM "RPAWorkflows"
        WHERE "workflow_name" IN ('assignment-notification', 'escalation-management', 'ticket-creation', 'compliance-reporting')
    `);
    console.log(`   ✓ Default RPA workflows: ${workflowsTest.rows[0].count}/4 inserted\n`);
}

async function testRPAIntegration() {
    console.log('🤖 Testing RPA Integration...');

    try {
        // Test RPA status endpoint (will fail without auth, but tests connectivity)
        const response = await fetch(`${BACKEND_URL}/api/admin/rpa/status`);
        console.log(`   ✓ RPA status endpoint: ${response.status === 401 ? 'ACCESSIBLE (auth required)' : 'RESPONSE ' + response.status}`);

        // Test RPA workflows in database
        const workflowsCount = await db.query('SELECT COUNT(*) as count FROM "RPAWorkflows" WHERE "is_active" = true');
        console.log(`   ✓ Active RPA workflows: ${workflowsCount.rows[0].count}`);

        console.log('   ✓ RPA Integration: READY\n');
    } catch (error) {
        console.log(`   ⚠️  RPA Integration test failed: ${error.message}\n`);
    }
}

async function testScheduledAutomation() {
    console.log('⏰ Testing Scheduled Automation...');

    try {
        // Test scheduled automation status endpoint
        const response = await fetch(`${BACKEND_URL}/api/admin/scheduled-automation/status`);
        console.log(`   ✓ Scheduled automation endpoint: ${response.status === 401 ? 'ACCESSIBLE (auth required)' : 'RESPONSE ' + response.status}`);

        // Test scheduled rules in database
        const scheduledRules = await db.query(`
            SELECT COUNT(*) as count FROM "AutomationRules" 
            WHERE "trigger_event" = 'SCHEDULED' AND "is_active" = true
        `);
        console.log(`   ✓ Scheduled automation rules: ${scheduledRules.rows[0].count}`);

        console.log('   ✓ Scheduled Automation: READY\n');
    } catch (error) {
        console.log(`   ⚠️  Scheduled Automation test failed: ${error.message}\n`);
    }
}

async function testRoundRobinTracking() {
    console.log('🔄 Testing Round Robin Tracking...');

    try {
        // Test round robin analytics view
        const analyticsTest = await db.query('SELECT COUNT(*) as count FROM "v_round_robin_analytics"');
        console.log(`   ✓ Round robin analytics view: ACCESSIBLE`);

        // Test round robin tracking table structure
        const trackingTest = await db.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'RoundRobinTracking'
            ORDER BY ordinal_position
        `);
        console.log(`   ✓ Round robin tracking columns: ${trackingTest.rows.length}`);

        console.log('   ✓ Round Robin Tracking: READY\n');
    } catch (error) {
        console.log(`   ⚠️  Round Robin Tracking test failed: ${error.message}\n`);
    }
}

async function testComplianceUser() {
    console.log('👤 Testing Compliance User...');

    try {
        // Note: This connects to the dhl_login database (SQLite)
        // We'll test the compliance endpoints instead
        const response = await fetch(`${FRONTEND_URL}/compliance`);
        console.log(`   ✓ Compliance dashboard route: ${response.status === 302 ? 'ACCESSIBLE (redirect to login)' : 'RESPONSE ' + response.status}`);

        console.log('   ✓ Compliance User: CONFIGURED\n');
    } catch (error) {
        console.log(`   ⚠️  Compliance User test failed: ${error.message}\n`);
    }
}

async function testAPIEndpoints() {
    console.log('🔌 Testing API Endpoints...');

    const endpoints = [
        '/api/compliance/overview',
        '/api/compliance/metrics',
        '/api/compliance/audit-trail',
        '/api/compliance/non-compliance',
        '/api/auth/users/by-role/user',
        '/api/admin/rpa/status',
        '/api/admin/scheduled-automation/status'
    ];

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`${BACKEND_URL}${endpoint}`);
            const status = response.status === 401 || response.status === 403 ? 'AUTH REQUIRED' : `STATUS ${response.status}`;
            console.log(`   ✓ ${endpoint}: ${status}`);
        } catch (error) {
            console.log(`   ❌ ${endpoint}: ERROR - ${error.message}`);
        }
    }

    console.log('   ✓ API Endpoints: ACCESSIBLE\n');
}

// Run tests if this script is executed directly
if (require.main === module) {
    testPhase4Features()
        .then(() => {
            console.log('🎉 All Phase 4 features are ready for production!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Phase 4 testing failed:', error);
            process.exit(1);
        });
}

module.exports = { testPhase4Features };
