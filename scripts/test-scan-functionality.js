#!/usr/bin/env node

/**
 * Scan Functionality Test Script
 * 
 * This script tests the scan functionality by simulating browser behavior
 * and checking for common issues that might prevent scanning from working.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Scan Functionality...\n');

// Test 1: Check if the HTML file exists and has the scanner input
console.log('1. Checking HTML file structure...');

const htmlFile = path.join(__dirname, '..', 'Public', '1_A_Cell_West_Side_Daily.html');
if (!fs.existsSync(htmlFile)) {
    console.log('   ❌ HTML file not found:', htmlFile);
    process.exit(1);
}

const htmlContent = fs.readFileSync(htmlFile, 'utf8');

// Check for scanner input
if (htmlContent.includes('id="scannerInput"')) {
    console.log('   ✅ Scanner input field found');
} else {
    console.log('   ❌ Scanner input field missing');
}

// Check for scripts
if (htmlContent.includes('scripts.js')) {
    console.log('   ✅ scripts.js included');
} else {
    console.log('   ❌ scripts.js not included');
}

if (htmlContent.includes('config.js')) {
    console.log('   ✅ config.js included');
} else {
    console.log('   ❌ config.js not included');
}

// Test 2: Check scripts.js for scanner functionality
console.log('\n2. Checking scripts.js for scanner functionality...');

const scriptsFile = path.join(__dirname, '..', 'Public', 'scripts.js');
if (!fs.existsSync(scriptsFile)) {
    console.log('   ❌ scripts.js file not found');
    process.exit(1);
}

const scriptsContent = fs.readFileSync(scriptsFile, 'utf8');

// Check for scanner functions
const scannerChecks = [
    { name: 'handleScannerInput function', pattern: 'function handleScannerInput' },
    { name: 'scannerInput element selection', pattern: 'getElementById(\'scannerInput\')' },
    { name: 'keydown event listener', pattern: 'addEventListener(\'keydown\'' },
    { name: 'Enter key handling', pattern: 'event.key === \'Enter\'' },
    { name: 'checkbox toggling', pattern: 'targetCheckbox.checked = !targetCheckbox.checked' },
    { name: 'highlight-scan class', pattern: 'highlight-scan' }
];

scannerChecks.forEach(check => {
    if (scriptsContent.includes(check.pattern)) {
        console.log(`   ✅ ${check.name} found`);
    } else {
        console.log(`   ❌ ${check.name} missing`);
    }
});

// Test 3: Check CSS for highlight styles
console.log('\n3. Checking CSS for highlight styles...');

const cssFile = path.join(__dirname, '..', 'Public', 'dhl-unified.css');
if (!fs.existsSync(cssFile)) {
    console.log('   ❌ CSS file not found');
} else {
    const cssContent = fs.readFileSync(cssFile, 'utf8');
    if (cssContent.includes('.highlight-scan')) {
        console.log('   ✅ highlight-scan CSS class found');
    } else {
        console.log('   ❌ highlight-scan CSS class missing');
    }
}

// Test 4: Analyze checkbox IDs in the HTML file
console.log('\n4. Analyzing checkbox structure...');

const checkboxMatches = htmlContent.match(/id="([^"]+)"/g);
if (checkboxMatches) {
    const checkboxIds = checkboxMatches
        .map(match => match.replace(/id="([^"]+)"/, '$1'))
        .filter(id => id !== 'scannerInput' && id !== 'date' && id !== 'comments');
    
    console.log(`   ✅ Found ${checkboxIds.length} potential checkbox IDs`);
    
    // Check for problematic IDs (spaces, special characters)
    const problematicIds = checkboxIds.filter(id => 
        id.includes(' ') || 
        id.includes('-') || 
        /[^a-zA-Z0-9_]/.test(id)
    );
    
    if (problematicIds.length > 0) {
        console.log(`   ⚠️  Found ${problematicIds.length} IDs with spaces or special characters:`);
        problematicIds.slice(0, 5).forEach(id => {
            console.log(`      - "${id}"`);
        });
        if (problematicIds.length > 5) {
            console.log(`      ... and ${problematicIds.length - 5} more`);
        }
        console.log('   ⚠️  IDs with spaces may cause scanning issues');
    } else {
        console.log('   ✅ All checkbox IDs are properly formatted');
    }
    
    // Sample some IDs for testing
    console.log('\n   Sample checkbox IDs for testing:');
    checkboxIds.slice(0, 5).forEach(id => {
        console.log(`      - "${id}"`);
    });
} else {
    console.log('   ❌ No checkbox IDs found');
}

// Test 5: Check for missing name attributes
console.log('\n5. Checking for missing name attributes...');

const inputMatches = htmlContent.match(/<input[^>]*type="checkbox"[^>]*>/g);
if (inputMatches) {
    const missingNameInputs = inputMatches.filter(input => !input.includes('name='));
    
    if (missingNameInputs.length > 0) {
        console.log(`   ⚠️  Found ${missingNameInputs.length} checkboxes without name attributes`);
        missingNameInputs.slice(0, 3).forEach(input => {
            const idMatch = input.match(/id="([^"]+)"/);
            if (idMatch) {
                console.log(`      - Checkbox with ID: "${idMatch[1]}"`);
            }
        });
    } else {
        console.log('   ✅ All checkboxes have name attributes');
    }
} else {
    console.log('   ❌ No checkbox inputs found');
}

// Test 6: Common scanning issues
console.log('\n6. Common scanning issues to check:');

console.log('   📋 Manual testing checklist:');
console.log('      1. Open the page in a browser');
console.log('      2. Check browser console for JavaScript errors');
console.log('      3. Verify the hidden scanner input has focus');
console.log('      4. Test typing a checkbox ID and pressing Enter');
console.log('      5. Check if the checkbox toggles and highlights');
console.log('      6. Verify the scanner input clears after each scan');

console.log('\n   🔧 Troubleshooting steps:');
console.log('      1. Check if JavaScript is enabled');
console.log('      2. Verify no other elements are capturing focus');
console.log('      3. Test with simple IDs first (e.g., "A76")');
console.log('      4. Check for case sensitivity issues');
console.log('      5. Ensure the page is fully loaded before scanning');

console.log('\n   🎯 Test these specific IDs:');
console.log('      - "A76" (simple alphanumeric)');
console.log('      - "door274" (alphanumeric with text)');
console.log('      - "A-B West Transition" (contains spaces and hyphens)');

console.log('\n🎉 Scan functionality analysis complete!');
console.log('\nNext steps:');
console.log('1. Open http://localhost:3000/app/1_A_Cell_West_Side_Daily.html');
console.log('2. Open browser developer tools (F12)');
console.log('3. Check the Console tab for any JavaScript errors');
console.log('4. Try typing "A76" and pressing Enter to test scanning');
console.log('5. Look for the green highlight effect on the checkbox');
