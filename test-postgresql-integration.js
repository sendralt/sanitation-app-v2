// Test script to verify PostgreSQL integration

async function testSubmission() {
  try {
    console.log('Testing PostgreSQL integration...');
    
    // First, let's check if we can access the PostgreSQL dashboard
    console.log('1. Testing admin dashboard access...');
    
    // Create a test submission data
    const testSubmissionData = {
      title: 'Test Checklist - PostgreSQL Integration',
      original_checklist_filename: 'test_checklist.html',
      headings: [
        {
          heading: 'Test Heading 1',
          tasks: [
            { id: 'task1', label: 'Test Task 1', checked: true },
            { id: 'task2', label: 'Test Task 2', checked: false }
          ]
        }
      ]
    };

    console.log('2. Test data prepared:', JSON.stringify(testSubmissionData, null, 2));
    
    // Note: For a full test, we would need to:
    // 1. Login to get a JWT token
    // 2. Submit the form data to /submit-form endpoint
    // 3. Check if data appears in PostgreSQL
    // 4. Test supervisor validation
    // 5. Verify audit trail entries
    
    console.log('3. Manual testing steps:');
    console.log('   a. Open http://localhost:3000 in browser');
    console.log('   b. Login with admin credentials');
    console.log('   c. Navigate to checklist application');
    console.log('   d. Submit a test checklist');
    console.log('   e. Check admin dashboard at http://localhost:3000/admin/postgresql');
    console.log('   f. Verify data appears in PostgreSQL dashboard');
    
    console.log('\nPostgreSQL integration test setup complete!');
    
  } catch (error) {
    console.error('Error during test:', error.message);
  }
}

// Check if PostgreSQL is accessible
async function checkPostgreSQL() {
  const { Pool } = require('pg');
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'sanitation_user_1',
    password: 'Checklist123',
    database: 'sanitation_checklist_db',
  });

  try {
    console.log('Testing PostgreSQL connection...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ PostgreSQL connection successful!');
    console.log('Current time from DB:', result.rows[0].current_time);
    
    // Check table structure
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('✅ Available tables:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('PostgreSQL Integration Test');
  console.log('='.repeat(60));
  
  const pgConnected = await checkPostgreSQL();
  
  if (pgConnected) {
    await testSubmission();
  } else {
    console.log('❌ Cannot proceed with tests - PostgreSQL connection failed');
  }
  
  console.log('='.repeat(60));
}

main().catch(console.error);
