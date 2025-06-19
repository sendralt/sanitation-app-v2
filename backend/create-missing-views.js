// Script to create missing database views for compliance analytics
const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function createMissingViews() {
    console.log('🔧 Creating missing database views for compliance analytics...\n');
    
    let client;
    try {
        client = await db.getClient();
        console.log('✅ Connected to PostgreSQL database');
        
        // Create v_compliance_metrics view
        console.log('📊 Creating v_compliance_metrics view...');
        await client.query(`
            DROP VIEW IF EXISTS "v_compliance_metrics" CASCADE;
            
            CREATE VIEW "v_compliance_metrics" AS
            SELECT 
                DATE_TRUNC('day', cs."submission_timestamp") as submission_date,
                cs."original_checklist_filename",
                
                -- Daily submission counts
                COUNT(cs."submission_id") as total_submissions,
                COUNT(CASE WHEN cs."status" = 'SupervisorValidated' THEN 1 END) as validated_submissions,
                COUNT(CASE WHEN svl."validation_timestamp" IS NOT NULL THEN 1 END) as supervisor_validations,
                
                -- Quality metrics
                AVG(CASE 
                    WHEN total_tasks.task_count > 0 
                    THEN (completed_tasks.completed_count::decimal / total_tasks.task_count) * 100 
                END) as avg_completion_percentage,
                
                AVG(CASE 
                    WHEN validated_tasks.validated_count > 0 
                    THEN (validated_ok_tasks.ok_count::decimal / validated_tasks.validated_count) * 100 
                END) as avg_validation_success_percentage,
                
                -- Turnaround metrics
                AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as avg_validation_hours

            FROM "ChecklistSubmissions" cs
            LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
            LEFT JOIN (
                SELECT 
                    cs2."submission_id",
                    COUNT(st."task_id") as task_count
                FROM "ChecklistSubmissions" cs2
                JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
                JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
                GROUP BY cs2."submission_id"
            ) total_tasks ON cs."submission_id" = total_tasks."submission_id"
            LEFT JOIN (
                SELECT 
                    cs2."submission_id",
                    COUNT(CASE WHEN st."is_checked_on_submission" = true THEN 1 END) as completed_count
                FROM "ChecklistSubmissions" cs2
                JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
                JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
                GROUP BY cs2."submission_id"
            ) completed_tasks ON cs."submission_id" = completed_tasks."submission_id"
            LEFT JOIN (
                SELECT 
                    cs2."submission_id",
                    COUNT(CASE WHEN st."supervisor_validated_status" IS NOT NULL THEN 1 END) as validated_count
                FROM "ChecklistSubmissions" cs2
                JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
                JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
                GROUP BY cs2."submission_id"
            ) validated_tasks ON cs."submission_id" = validated_tasks."submission_id"
            LEFT JOIN (
                SELECT 
                    cs2."submission_id",
                    COUNT(CASE WHEN st."supervisor_validated_status" = true THEN 1 END) as ok_count
                FROM "ChecklistSubmissions" cs2
                JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
                JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
                GROUP BY cs2."submission_id"
            ) validated_ok_tasks ON cs."submission_id" = validated_ok_tasks."submission_id"
            GROUP BY DATE_TRUNC('day', cs."submission_timestamp"), cs."original_checklist_filename"
            ORDER BY submission_date DESC;
        `);
        console.log('✅ v_compliance_metrics view created successfully');
        
        // Create v_validation_metrics view
        console.log('📊 Creating v_validation_metrics view...');
        await client.query(`
            DROP VIEW IF EXISTS "v_validation_metrics" CASCADE;
            
            CREATE VIEW "v_validation_metrics" AS
            SELECT 
                svl."supervisor_name",
                DATE_TRUNC('month', svl."validation_timestamp") as validation_month,
                
                -- Volume metrics
                COUNT(svl."validation_log_id") as total_validations,
                COUNT(DISTINCT cs."submitted_by_user_id") as unique_submitters,
                COUNT(DISTINCT cs."original_checklist_filename") as unique_checklists,
                
                -- Performance metrics
                AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as avg_turnaround_hours,
                MIN(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as min_turnaround_hours,
                MAX(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as max_turnaround_hours

            FROM "SupervisorValidationsLog" svl
            JOIN "ChecklistSubmissions" cs ON svl."submission_id" = cs."submission_id"
            GROUP BY svl."supervisor_name", DATE_TRUNC('month', svl."validation_timestamp")
            ORDER BY validation_month DESC, total_validations DESC;
        `);
        console.log('✅ v_validation_metrics view created successfully');
        
        // Create v_assignment_analytics view
        console.log('📊 Creating v_assignment_analytics view...');
        await client.query(`
            DROP VIEW IF EXISTS "v_assignment_analytics" CASCADE;
            
            CREATE VIEW "v_assignment_analytics" AS
            SELECT 
                ca."assignment_id",
                ca."assigned_to_user_id",
                ca."assignment_timestamp",
                ca."due_timestamp",
                ca."status",
                cs."checklist_title",
                cs."original_checklist_filename",
                
                -- Time metrics
                EXTRACT(EPOCH FROM (NOW() - ca."assignment_timestamp"))/3600 as hours_since_assignment,
                CASE 
                    WHEN ca."due_timestamp" IS NOT NULL 
                    THEN EXTRACT(EPOCH FROM (ca."due_timestamp" - ca."assignment_timestamp"))/3600 
                END as allocated_hours,
                CASE 
                    WHEN ca."due_timestamp" IS NOT NULL AND ca."due_timestamp" < NOW()
                    THEN EXTRACT(EPOCH FROM (NOW() - ca."due_timestamp"))/3600 
                END as hours_overdue

            FROM "ChecklistAssignments" ca
            JOIN "ChecklistSubmissions" cs ON ca."submission_id" = cs."submission_id";
        `);
        console.log('✅ v_assignment_analytics view created successfully');
        
        // Test the views
        console.log('\n🧪 Testing created views...');
        
        const views = ['v_compliance_metrics', 'v_validation_metrics', 'v_assignment_analytics'];
        for (const viewName of views) {
            try {
                const result = await client.query(`SELECT COUNT(*) as count FROM "${viewName}"`);
                console.log(`✅ ${viewName}: ${result.rows[0].count} records`);
            } catch (error) {
                console.log(`❌ ${viewName}: Error - ${error.message}`);
            }
        }
        
        console.log('\n🎉 Database views created successfully!');
        
    } catch (error) {
        console.error('💥 Error creating views:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (client) {
            client.release();
            console.log('\n🔌 Database connection closed');
        }
    }
    
    process.exit(0);
}

createMissingViews();
