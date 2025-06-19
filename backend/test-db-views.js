// Test script to check if database views exist
const db = require('./config/db');

async function testDatabaseViews() {
    console.log('🔍 Testing database views...\n');
    
    try {
        // Test if v_compliance_metrics view exists
        console.log('📊 Testing v_compliance_metrics view...');
        const viewExists = await db.query(`
            SELECT COUNT(*) as count
            FROM information_schema.views 
            WHERE table_schema = 'public' 
            AND table_name = 'v_compliance_metrics'
        `);
        
        if (viewExists.rows[0].count > 0) {
            console.log('✅ v_compliance_metrics view exists');
            
            // Test querying the view
            console.log('📋 Testing query on v_compliance_metrics...');
            const testQuery = await db.query(`
                SELECT * FROM "v_compliance_metrics"
                WHERE "submission_date" >= NOW() - INTERVAL $1
                ORDER BY "submission_date" DESC
                LIMIT 5
            `, ['30 days']);
            
            console.log(`📈 Found ${testQuery.rows.length} records in v_compliance_metrics`);
            if (testQuery.rows.length > 0) {
                console.log('📄 Sample record:', JSON.stringify(testQuery.rows[0], null, 2));
            }
        } else {
            console.log('❌ v_compliance_metrics view does not exist');
        }
        
        // Test other views
        const otherViews = ['v_validation_metrics', 'v_assignment_analytics', 'v_team_performance'];
        
        for (const viewName of otherViews) {
            console.log(`\n📊 Testing ${viewName} view...`);
            const exists = await db.query(`
                SELECT COUNT(*) as count
                FROM information_schema.views 
                WHERE table_schema = 'public' 
                AND table_name = $1
            `, [viewName]);
            
            if (exists.rows[0].count > 0) {
                console.log(`✅ ${viewName} view exists`);
            } else {
                console.log(`❌ ${viewName} view does not exist`);
            }
        }
        
    } catch (error) {
        console.error('💥 Database test failed:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('\n🏁 Database view tests completed!');
    process.exit(0);
}

testDatabaseViews();
