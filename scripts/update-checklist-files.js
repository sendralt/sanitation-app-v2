#!/usr/bin/env node

/**
 * Update Checklist HTML Files
 * 
 * This script updates all checklist HTML files in the Public directory
 * to include the config.js script for dynamic configuration loading.
 * 
 * Usage:
 *   node scripts/update-checklist-files.js
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'Public');

// List of checklist files to update
const checklistFiles = [
    '2_A_Cell_East_Side_Daily.html',
    '3_B_Cell_West_Side_Daily.html',
    '4_B_Cell_East_Side_Daily.html',
    '5_C_Cell_West_Side_Daily.html',
    '6_C_Cell_East_Side_Daily.html',
    '7_D_Cell_West_Side_Daily.html',
    '8_D_Cell_East_Side_Daily.html',
    '9_E_Cell_West_Side_Daily.html',
    '10_E_Cell_East_Side_Daily.html',
    '11_F_Cell_West_Side_Daily.html',
    '12_F_Cell_East_Side_Daily.html',
    '13_All_Cells_Weekly.html',
    '14_All_Cells_Weekly.html',
    '15_A&B_Cells_LL_Quarterly.html',
    '16_D_Cell_LL_Quarterly.html',
    '17_A_Cell_High_Level_Quarterly.html',
    '18_B_Cell_High_Level_Quarterly.html',
    '19_C_Cell_High_Level_Quarterly.html',
    '20_D_Cell_High_Level_Quarterly.html',
    '21_E_Cell_High_Level_Quarterlyl.html',
    '22_F_Cell_High_Level_Quarterlyl.html'
];

console.log('🔄 Updating checklist HTML files to include config.js...\n');

let updatedCount = 0;
let skippedCount = 0;
let errorCount = 0;

for (const filename of checklistFiles) {
    const filePath = path.join(publicDir, filename);
    
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  File not found: ${filename}`);
            skippedCount++;
            continue;
        }
        
        // Read file content
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check if config.js is already included
        if (content.includes('<script src="config.js"></script>')) {
            console.log(`✅ Already updated: ${filename}`);
            skippedCount++;
            continue;
        }
        
        // Find the pattern to replace
        const pattern = /(<link rel="stylesheet" href="dhl-unified\.css">)\s*(<script defer src="scripts\.js"><\/script>)/;
        const replacement = '$1\n    <script src="config.js"></script>\n    $2';
        
        if (pattern.test(content)) {
            content = content.replace(pattern, replacement);
            
            // Write updated content back to file
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated: ${filename}`);
            updatedCount++;
        } else {
            console.log(`⚠️  Pattern not found in: ${filename}`);
            skippedCount++;
        }
        
    } catch (error) {
        console.error(`❌ Error updating ${filename}:`, error.message);
        errorCount++;
    }
}

console.log('\n📊 Update Summary:');
console.log(`   ✅ Updated: ${updatedCount} files`);
console.log(`   ⚠️  Skipped: ${skippedCount} files`);
console.log(`   ❌ Errors: ${errorCount} files`);

if (updatedCount > 0) {
    console.log('\n🎉 Checklist files updated successfully!');
    console.log('   All checklist pages will now use dynamic configuration.');
} else {
    console.log('\n💡 No files needed updating.');
}
