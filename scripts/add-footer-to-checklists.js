#!/usr/bin/env node

/**
 * Script to add DHL footer to all checklist HTML files
 * This script adds the footer to all checklist files that don't already have it
 */

const fs = require('fs');
const path = require('path');

// Define the footer HTML to be added
const footerHTML = `
        <div class="footer" style="text-align: center; margin-top: 2rem; font-size: 0.8rem; color: #666;">
            &copy; 2025 DHL Supply Chain | Warehouse Sanitation Checklists
        </div>`;

// Define the Public directory path
const publicDir = path.join(__dirname, '..', 'Public');

// List of all checklist files (excluding the one we already updated)
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

console.log('🔄 Adding DHL footer to checklist HTML files...\n');

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
        
        // Check if footer is already present
        if (content.includes('&copy; 2025 DHL Supply Chain | Warehouse Sanitation Checklists')) {
            console.log(`✅ Footer already exists: ${filename}`);
            skippedCount++;
            continue;
        }
        
        // Find the pattern to replace - looking for the closing structure
        // Pattern: </div>\n    </div>\n</body>\n</html>
        const pattern = /(\s*<\/div>\s*<\/div>\s*<\/body>\s*<\/html>)/;
        
        if (pattern.test(content)) {
            // Insert footer before the closing tags
            const replacement = `${footerHTML}
    </div>
</body>
</html>`;
            
            content = content.replace(pattern, replacement);
            
            // Write updated content back to file
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Added footer to: ${filename}`);
            updatedCount++;
        } else {
            console.log(`⚠️  Closing pattern not found in: ${filename}`);
            skippedCount++;
        }
        
    } catch (error) {
        console.error(`❌ Error updating ${filename}:`, error.message);
        errorCount++;
    }
}

// Summary
console.log('\n📊 Summary:');
console.log(`✅ Files updated: ${updatedCount}`);
console.log(`⚠️  Files skipped: ${skippedCount}`);
console.log(`❌ Errors: ${errorCount}`);
console.log(`📁 Total files processed: ${checklistFiles.length}`);

if (updatedCount > 0) {
    console.log('\n🎉 Footer successfully added to all applicable checklist files!');
    console.log('   The footer will now appear on all checklist pages with DHL branding.');
} else if (skippedCount === checklistFiles.length) {
    console.log('\n✨ All files already have the footer - no updates needed!');
} else {
    console.log('\n⚠️  Some files could not be updated. Please check the warnings above.');
}
