#!/usr/bin/env node

/**
 * Verify Implementation
 * 
 * This script verifies that the environment configuration and
 * dynamic URL configuration implementations are working correctly.
 * 
 * Usage:
 *   node scripts/verify-implementation.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Implementation of Issues 1.1 and 1.2...\n');

let allChecks = [];

// Check 1.1: Environment Configuration Templates
console.log('📋 Checking Issue 1.1: Environment Configuration Templates');

const envFiles = [
    'dhl_login/.env.example',
    'backend/.env.example',
    '.env.example'
];

envFiles.forEach(file => {
    const exists = fs.existsSync(file);
    allChecks.push(exists);
    console.log(`   ${exists ? '✅' : '❌'} ${file} ${exists ? 'exists' : 'missing'}`);
});

// Check for secret generation script
const secretScript = 'scripts/generate-secrets.js';
const secretScriptExists = fs.existsSync(secretScript);
allChecks.push(secretScriptExists);
console.log(`   ${secretScriptExists ? '✅' : '❌'} ${secretScript} ${secretScriptExists ? 'exists' : 'missing'}`);

// Check 1.2: Dynamic Configuration System
console.log('\n📋 Checking Issue 1.2: Dynamic Configuration System');

// Check for config.js
const configJs = 'Public/config.js';
const configJsExists = fs.existsSync(configJs);
allChecks.push(configJsExists);
console.log(`   ${configJsExists ? '✅' : '❌'} ${configJs} ${configJsExists ? 'exists' : 'missing'}`);

// Check for configuration endpoint in app.js
const appJs = 'dhl_login/app.js';
if (fs.existsSync(appJs)) {
    const appContent = fs.readFileSync(appJs, 'utf8');
    const hasConfigEndpoint = appContent.includes('/api/config');
    allChecks.push(hasConfigEndpoint);
    console.log(`   ${hasConfigEndpoint ? '✅' : '❌'} Configuration endpoint ${hasConfigEndpoint ? 'added to' : 'missing from'} app.js`);
} else {
    allChecks.push(false);
    console.log(`   ❌ app.js file missing`);
}

// Check for updated scripts.js
const scriptsJs = 'Public/scripts.js';
if (fs.existsSync(scriptsJs)) {
    const scriptsContent = fs.readFileSync(scriptsJs, 'utf8');
    const hasConfigUsage = scriptsContent.includes('AppConfig.waitForConfig');
    const noHardcodedUrls = !scriptsContent.includes('http://localhost:3001');
    allChecks.push(hasConfigUsage);
    allChecks.push(noHardcodedUrls);
    console.log(`   ${hasConfigUsage ? '✅' : '❌'} scripts.js ${hasConfigUsage ? 'uses' : 'does not use'} AppConfig`);
    console.log(`   ${noHardcodedUrls ? '✅' : '❌'} scripts.js ${noHardcodedUrls ? 'has no' : 'still has'} hardcoded URLs`);
} else {
    allChecks.push(false);
    allChecks.push(false);
    console.log(`   ❌ scripts.js file missing`);
}

// Check sample checklist files for config.js inclusion
const sampleChecklistFiles = [
    'Public/1_A_Cell_West_Side_Daily.html',
    'Public/validate-checklist.html',
    'Public/index.html'
];

console.log('\n📋 Checking Frontend Files for config.js inclusion');

sampleChecklistFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const hasConfigJs = content.includes('<script src="config.js"></script>');
        allChecks.push(hasConfigJs);
        console.log(`   ${hasConfigJs ? '✅' : '❌'} ${path.basename(file)} ${hasConfigJs ? 'includes' : 'missing'} config.js`);
    } else {
        allChecks.push(false);
        console.log(`   ❌ ${file} missing`);
    }
});

// Check for updated environment variables in .env.example
console.log('\n📋 Checking Environment Variable Updates');

const dhlEnvExample = 'dhl_login/.env.example';
if (fs.existsSync(dhlEnvExample)) {
    const content = fs.readFileSync(dhlEnvExample, 'utf8');
    const hasBackendApiUrl = content.includes('BACKEND_API_URL');
    allChecks.push(hasBackendApiUrl);
    console.log(`   ${hasBackendApiUrl ? '✅' : '❌'} dhl_login/.env.example ${hasBackendApiUrl ? 'includes' : 'missing'} BACKEND_API_URL`);
} else {
    allChecks.push(false);
    console.log(`   ❌ dhl_login/.env.example missing`);
}

// Summary
console.log('\n📊 Verification Summary');
const passedChecks = allChecks.filter(check => check).length;
const totalChecks = allChecks.length;
const successRate = Math.round((passedChecks / totalChecks) * 100);

console.log(`   ✅ Passed: ${passedChecks}/${totalChecks} checks (${successRate}%)`);

if (successRate === 100) {
    console.log('\n🎉 All implementations verified successfully!');
    console.log('   Both Issue 1.1 and 1.2 have been properly implemented.');
} else {
    console.log('\n⚠️  Some checks failed. Please review the implementation.');
}

console.log('\n💡 Next Steps:');
console.log('   1. Test the configuration endpoint: node scripts/test-config-endpoint.js');
console.log('   2. Start both services and verify dynamic URL resolution');
console.log('   3. Proceed with implementing Issue 2.1 (Error Handling)');

process.exit(successRate === 100 ? 0 : 1);
