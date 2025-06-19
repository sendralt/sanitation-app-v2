// Simple test to check server and database
const db = require('./config/db');

async function simpleTest() {
    console.log('🧪 Running simple tests...\n');
    
    try {
        // Test 1: Database connection
        console.log('1️⃣ Testing database connection...');
        const dbTest = await db.query('SELECT NOW() as current_time');
        console.log('✅ Database connected:', dbTest.rows[0].current_time);
        
        // Test 2: Check if tables exist
        console.log('\n2️⃣ Checking if main tables exist...');
        const tables = ['ChecklistSubmissions', 'SubmissionHeadings', 'SubmissionTasks', 'SupervisorValidationsLog'];
        
        for (const table of tables) {
            try {
                const result = await db.query(`SELECT COUNT(*) as count FROM "${table}"`);
                console.log(`✅ ${table}: ${result.rows[0].count} records`);
            } catch (error) {
                console.log(`❌ ${table}: ${error.message}`);
            }
        }
        
        // Test 3: Try to create a simple view manually
        console.log('\n3️⃣ Creating simple compliance view...');
        try {
            await db.query(`
                DROP VIEW IF EXISTS "v_compliance_metrics" CASCADE;
                
                CREATE VIEW "v_compliance_metrics" AS
                SELECT 
                    DATE_TRUNC('day', cs."submission_timestamp") as submission_date,
                    cs."original_checklist_filename",
                    COUNT(cs."submission_id") as total_submissions,
                    COUNT(CASE WHEN cs."status" = 'SupervisorValidated' THEN 1 END) as validated_submissions
                FROM "ChecklistSubmissions" cs
                GROUP BY DATE_TRUNC('day', cs."submission_timestamp"), cs."original_checklist_filename"
                ORDER BY submission_date DESC;
            `);
            console.log('✅ Simple compliance view created');
            
            // Test the view
            const viewTest = await db.query(`SELECT COUNT(*) as count FROM "v_compliance_metrics"`);
            console.log(`✅ View test: ${viewTest.rows[0].count} records`);
            
        } catch (error) {
            console.log(`❌ View creation failed: ${error.message}`);
        }
        
        console.log('\n🎉 Simple tests completed!');
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
    
    process.exit(0);
}

simpleTest();
