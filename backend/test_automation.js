// Test script for automation workflows
const db = require('./config/db');
const automationEngine = require('./automation/automationEngine');

async function testAutomationWorkflow() {
    console.log('🧪 Starting Automation Workflow Test...\n');
    
    try {
        // Step 1: Create a test submission for 1_A_Cell_West_Side_Daily.html
        console.log('📝 Step 1: Creating test submission...');

        const timestamp = Date.now();
        const testSubmission = await db.query(`
            INSERT INTO "ChecklistSubmissions" (
                "original_checklist_filename",
                "checklist_title",
                "submitted_by_user_id",
                "submitted_by_username",
                "status",
                "json_file_path"
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING "submission_id"
        `, [
            '1_A_Cell_West_Side_Daily.html',
            'Test A Cell West Side Daily',
            'test_user_123',
            'test_user',
            'PendingSupervisorValidation',
            `test_data_${timestamp}.json`
        ]);
        
        const submissionId = testSubmission.rows[0].submission_id;
        console.log(`✅ Created test submission with ID: ${submissionId}`);
        
        // Step 2: Check initial state
        console.log('\n📊 Step 2: Checking initial state...');
        const initialAssignments = await db.query('SELECT COUNT(*) as count FROM "ChecklistAssignments"');
        console.log(`Initial assignments count: ${initialAssignments.rows[0].count}`);
        
        // Step 3: Trigger automation for submission complete
        console.log('\n🤖 Step 3: Triggering automation for ON_SUBMISSION_COMPLETE...');
        await automationEngine.processAutomationTrigger(
            submissionId,
            'ON_SUBMISSION_COMPLETE',
            '1_A_Cell_West_Side_Daily.html'
        );
        
        // Step 4: Check if automation created new assignment
        console.log('\n🔍 Step 4: Checking automation results...');
        const newAssignments = await db.query(`
            SELECT 
                cs."submission_id",
                cs."original_checklist_filename",
                cs."assigned_to_user_id",
                cs."status",
                ca."assignment_id",
                ca."automation_rule_id"
            FROM "ChecklistSubmissions" cs
            LEFT JOIN "ChecklistAssignments" ca ON cs."submission_id" = ca."submission_id"
            WHERE cs."original_checklist_filename" = '1_A_Cell_West_Side_Weekly.html'
        `);
        
        if (newAssignments.rows.length > 0) {
            console.log('✅ Automation successful! Created assignment:');
            newAssignments.rows.forEach(assignment => {
                console.log(`   - Submission ID: ${assignment.submission_id}`);
                console.log(`   - Checklist: ${assignment.original_checklist_filename}`);
                console.log(`   - Assigned to: ${assignment.assigned_to_user_id}`);
                console.log(`   - Status: ${assignment.status}`);
                console.log(`   - Rule ID: ${assignment.automation_rule_id}`);
            });
        } else {
            console.log('❌ No automation assignment created');
        }
        
        // Step 5: Test supervisor validation trigger
        console.log('\n📋 Step 5: Testing supervisor validation trigger...');
        
        // Update original submission to validated status
        await db.query(`
            UPDATE "ChecklistSubmissions" 
            SET "status" = 'SupervisorValidated' 
            WHERE "submission_id" = $1
        `, [submissionId]);
        
        // Trigger automation for supervisor validation
        await automationEngine.processAutomationTrigger(
            submissionId,
            'ON_SUPERVISOR_VALIDATION',
            '1_A_Cell_West_Side_Daily.html'
        );
        
        // Step 6: Check supervisor validation automation results
        console.log('\n🔍 Step 6: Checking supervisor validation automation...');
        const validationAssignments = await db.query(`
            SELECT 
                cs."submission_id",
                cs."original_checklist_filename",
                cs."assigned_to_user_id",
                cs."status",
                ca."assignment_id",
                ca."automation_rule_id"
            FROM "ChecklistSubmissions" cs
            LEFT JOIN "ChecklistAssignments" ca ON cs."submission_id" = ca."submission_id"
            WHERE cs."original_checklist_filename" = '2_B_Cell_East_Side_Daily.html'
        `);
        
        if (validationAssignments.rows.length > 0) {
            console.log('✅ Supervisor validation automation successful! Created assignment:');
            validationAssignments.rows.forEach(assignment => {
                console.log(`   - Submission ID: ${assignment.submission_id}`);
                console.log(`   - Checklist: ${assignment.original_checklist_filename}`);
                console.log(`   - Assigned to: ${assignment.assigned_to_user_id}`);
                console.log(`   - Status: ${assignment.status}`);
                console.log(`   - Rule ID: ${assignment.automation_rule_id}`);
            });
        } else {
            console.log('❌ No supervisor validation automation assignment created');
        }
        
        // Step 7: Show audit trail
        console.log('\n📜 Step 7: Checking audit trail...');
        const auditLogs = await db.query(`
            SELECT 
                "timestamp",
                "user_id",
                "action_type",
                "details"
            FROM "AuditTrail"
            WHERE "details"::text LIKE '%automation%' OR "action_type" LIKE '%AUTOMATION%'
            ORDER BY "timestamp" DESC
            LIMIT 10
        `);
        
        console.log('Recent automation audit logs:');
        auditLogs.rows.forEach(log => {
            console.log(`   - ${log.timestamp}: ${log.action_type} by ${log.user_id || 'system'}`);
        });
        
        // Step 8: Summary
        console.log('\n📊 Step 8: Test Summary');
        const totalSubmissions = await db.query('SELECT COUNT(*) as count FROM "ChecklistSubmissions"');
        const totalAssignments = await db.query('SELECT COUNT(*) as count FROM "ChecklistAssignments"');
        const totalAuditLogs = await db.query('SELECT COUNT(*) as count FROM "AuditTrail"');
        
        console.log(`Total submissions: ${totalSubmissions.rows[0].count}`);
        console.log(`Total assignments: ${totalAssignments.rows[0].count}`);
        console.log(`Total audit logs: ${totalAuditLogs.rows[0].count}`);
        
        console.log('\n🎉 Automation workflow test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testAutomationWorkflow()
        .then(() => {
            console.log('\n✅ All tests passed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = { testAutomationWorkflow };
