// Create the compliance metrics view only
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'sanitation_user_1',
  password: process.env.PG_PASSWORD || 'Checklist123',
  database: process.env.PG_DATABASE || 'sanitation_checklist_db',
  ssl: false
});

async function createView() {
    console.log('Creating compliance metrics view...');
    
    try {
        const client = await pool.connect();
        
        // Create a simple version of the view first
        await client.query(`
            DROP VIEW IF EXISTS "v_compliance_metrics" CASCADE;
            
            CREATE VIEW "v_compliance_metrics" AS
            SELECT 
                DATE_TRUNC('day', cs."submission_timestamp") as submission_date,
                cs."original_checklist_filename",
                COUNT(cs."submission_id") as total_submissions,
                COUNT(CASE WHEN cs."status" = 'SupervisorValidated' THEN 1 END) as validated_submissions,
                0 as supervisor_validations,
                0 as avg_completion_percentage,
                0 as avg_validation_success_percentage,
                0 as avg_validation_hours
            FROM "ChecklistSubmissions" cs
            GROUP BY DATE_TRUNC('day', cs."submission_timestamp"), cs."original_checklist_filename"
            ORDER BY submission_date DESC;
        `);
        
        console.log('✅ View created successfully');
        
        // Test the view
        const result = await client.query('SELECT COUNT(*) as count FROM "v_compliance_metrics"');
        console.log(`✅ View test: ${result.rows[0].count} records`);
        
        client.release();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
    
    await pool.end();
    console.log('Done.');
}

createView();
