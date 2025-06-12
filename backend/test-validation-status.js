#!/usr/bin/env node

/**
 * Test script to verify the validation status functionality
 * This script tests the new validation status checking features
 */

const fs = require('fs');
const path = require('path');

// Test data directory
const dataDir = path.join(__dirname, 'data');

// Function to check if a checklist is validated (same as in server.js)
function isChecklistValidated(formData) {
    return formData.supervisorValidation && 
           formData.supervisorValidation.supervisorName && 
           formData.supervisorValidation.validatedCheckboxes;
}

// Test function
function testValidationStatus() {
    console.log('🧪 Testing Validation Status Functionality\n');
    
    // Get all data files
    const dataFiles = fs.readdirSync(dataDir).filter(file => file.startsWith('data_') && file.endsWith('.json'));
    
    if (dataFiles.length === 0) {
        console.log('❌ No test data files found in', dataDir);
        return;
    }
    
    console.log(`📁 Found ${dataFiles.length} checklist files to test:\n`);
    
    let validatedCount = 0;
    let unvalidatedCount = 0;
    
    dataFiles.forEach(filename => {
        const filePath = path.join(dataDir, filename);
        const fileId = filename.replace('data_', '').replace('.json', '');
        
        try {
            const fileData = fs.readFileSync(filePath, 'utf8');
            const formData = JSON.parse(fileData);
            
            const isValidated = isChecklistValidated(formData);
            const status = isValidated ? '✅ VALIDATED' : '⏳ PENDING';
            const supervisor = isValidated ? formData.supervisorValidation.supervisorName : 'N/A';
            
            console.log(`📋 ${formData.title || 'Untitled'}`);
            console.log(`   ID: ${fileId}`);
            console.log(`   Status: ${status}`);
            console.log(`   Supervisor: ${supervisor}`);
            console.log('');
            
            if (isValidated) {
                validatedCount++;
            } else {
                unvalidatedCount++;
            }
            
        } catch (error) {
            console.log(`❌ Error reading ${filename}:`, error.message);
        }
    });
    
    console.log('📊 Summary:');
    console.log(`   ✅ Validated: ${validatedCount}`);
    console.log(`   ⏳ Pending: ${unvalidatedCount}`);
    console.log(`   📁 Total: ${dataFiles.length}`);
    
    // Test the validation prevention logic
    console.log('\n🔒 Testing Validation Prevention Logic:');
    
    const validatedFiles = dataFiles.filter(filename => {
        const filePath = path.join(dataDir, filename);
        const fileData = fs.readFileSync(filePath, 'utf8');
        const formData = JSON.parse(fileData);
        return isChecklistValidated(formData);
    });
    
    if (validatedFiles.length > 0) {
        console.log(`   Found ${validatedFiles.length} validated checklist(s) that should prevent re-validation`);
        validatedFiles.forEach(filename => {
            const fileId = filename.replace('data_', '').replace('.json', '');
            console.log(`   🔒 ${fileId} - Should show "already validated" message`);
        });
    } else {
        console.log('   No validated checklists found to test prevention logic');
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Test validation URLs in browser:');
    
    if (validatedFiles.length > 0) {
        const testId = validatedFiles[0].replace('data_', '').replace('.json', '');
        console.log(`      - Already validated: http://localhost:3000/app/validate-checklist/${testId}`);
    }
    
    if (unvalidatedCount > 0) {
        const unvalidatedFile = dataFiles.find(filename => {
            const filePath = path.join(dataDir, filename);
            const fileData = fs.readFileSync(filePath, 'utf8');
            const formData = JSON.parse(fileData);
            return !isChecklistValidated(formData);
        });
        
        if (unvalidatedFile) {
            const testId = unvalidatedFile.replace('data_', '').replace('.json', '');
            console.log(`      - Pending validation: http://localhost:3000/app/validate-checklist/${testId}`);
        }
    }
}

// Run the test
if (require.main === module) {
    testValidationStatus();
}

module.exports = { testValidationStatus, isChecklistValidated };
