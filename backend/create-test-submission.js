// Create a test submission to verify PostgreSQL integration
const db = require('./config/db');

async function createTestSubmission() {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    console.log('Creating test submission...');
    
    // Insert test submission
    const submissionRes = await client.query(
      `INSERT INTO "ChecklistSubmissions"
       ("original_checklist_filename", "checklist_title", "submitted_by_user_id", "submitted_by_username", "status", "json_file_path")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING "submission_id"`,
      [
        '1_A_Cell_West_Side_Daily.html',
        'Test Checklist - A Cell West Side Daily',
        'test-user-123',
        'testuser',
        'PendingSupervisorValidation',
        'backend/data/test_data_' + Date.now() + '.json'
      ]
    );
    
    const submissionId = submissionRes.rows[0].submission_id;
    console.log(`✅ Created submission with ID: ${submissionId}`);
    
    // Insert test heading
    const headingRes = await client.query(
      `INSERT INTO "SubmissionHeadings" ("submission_id", "heading_text", "display_order")
       VALUES ($1, $2, $3) RETURNING "heading_id"`,
      [submissionId, 'Wipe Around Door, Dock Lock Boxes, Trac Guards, and Frames Daily A West', 1]
    );
    
    const headingId = headingRes.rows[0].heading_id;
    console.log(`✅ Created heading with ID: ${headingId}`);
    
    // Insert test tasks
    const tasks = [
      { id: 'A76', label: 'A76', checked: true },
      { id: 'door274', label: 'Door 274', checked: false },
      { id: 'A77', label: 'A77', checked: true }
    ];
    
    for (const task of tasks) {
      await client.query(
        `INSERT INTO "SubmissionTasks" 
         ("heading_id", "task_identifier_in_json", "task_label", "is_checked_on_submission", "current_status")
         VALUES ($1, $2, $3, $4, $5)`,
        [headingId, task.id, task.label, task.checked, 'Pending']
      );
      console.log(`✅ Created task: ${task.label}`);
    }
    
    // Insert audit trail entry
    await client.query(
      `INSERT INTO "AuditTrail" 
       ("user_id", "username", "action_type", "description", "affected_record_id", "affected_table")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'test-user-123',
        'testuser',
        'Submission',
        'Test checklist submitted for PostgreSQL integration testing',
        submissionId,
        'ChecklistSubmissions'
      ]
    );
    console.log('✅ Created audit trail entry');
    
    // Create a test supervisor validation
    const validationRes = await client.query(
      `INSERT INTO "SupervisorValidationsLog" 
       ("submission_id", "validated_by_user_id", "validated_by_username", "overall_status", "comments")
       VALUES ($1, $2, $3, $4, $5) RETURNING "validation_id"`,
      [
        submissionId,
        'supervisor-456',
        'supervisor',
        'OK',
        'Test validation for PostgreSQL integration'
      ]
    );
    
    const validationId = validationRes.rows[0].validation_id;
    console.log(`✅ Created validation with ID: ${validationId}`);
    
    // Insert validation audit trail
    await client.query(
      `INSERT INTO "AuditTrail" 
       ("user_id", "username", "action_type", "description", "affected_record_id", "affected_table")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'supervisor-456',
        'supervisor',
        'Validation',
        'Test supervisor validation completed',
        submissionId,
        'ChecklistSubmissions'
      ]
    );
    console.log('✅ Created validation audit trail entry');
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Test submission created successfully!');
    console.log(`📊 View the data at: http://localhost:3000/admin/postgresql`);
    console.log(`📋 View submission details at: http://localhost:3000/admin/postgresql/submissions/${submissionId}`);
    
    return submissionId;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating test submission:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Creating Test Submission for PostgreSQL Integration');
  console.log('='.repeat(60));
  
  try {
    const submissionId = await createTestSubmission();
    
    // Verify the data was inserted
    console.log('\n📊 Verifying data insertion...');
    
    const submissionCount = await db.query('SELECT COUNT(*) as count FROM "ChecklistSubmissions"');
    const headingCount = await db.query('SELECT COUNT(*) as count FROM "SubmissionHeadings"');
    const taskCount = await db.query('SELECT COUNT(*) as count FROM "SubmissionTasks"');
    const validationCount = await db.query('SELECT COUNT(*) as count FROM "SupervisorValidationsLog"');
    const auditCount = await db.query('SELECT COUNT(*) as count FROM "AuditTrail"');
    
    console.log(`✅ Submissions: ${submissionCount.rows[0].count}`);
    console.log(`✅ Headings: ${headingCount.rows[0].count}`);
    console.log(`✅ Tasks: ${taskCount.rows[0].count}`);
    console.log(`✅ Validations: ${validationCount.rows[0].count}`);
    console.log(`✅ Audit entries: ${auditCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('='.repeat(60));
}

main().catch(console.error);
