#!/usr/bin/env node

/**
 * Verify Supervisor Email Implementation
 * 
 * This script verifies that all the supervisor email configuration changes
 * have been properly implemented across the codebase.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Supervisor Email Implementation\n');

const checks = [];
let allPassed = true;

function checkFile(filePath, description, checkFunction) {
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const result = checkFunction(content);
        checks.push({ file: filePath, description, passed: result.passed, details: result.details });
        if (!result.passed) allPassed = false;
        console.log(`${result.passed ? '✅' : '❌'} ${description}`);
        if (result.details) {
            console.log(`   ${result.details}`);
        }
    } else {
        checks.push({ file: filePath, description, passed: false, details: 'File not found' });
        allPassed = false;
        console.log(`❌ ${description} - File not found: ${filePath}`);
    }
}

console.log('📋 Checking Environment Configuration Files...');

// Check backend .env.example
checkFile('backend/.env.example', 'Backend .env.example has SUPERVISOR_EMAIL', (content) => {
    const hasSupervisorEmail = content.includes('SUPERVISOR_EMAIL=');
    const hasComment = content.includes('Supervisor email address for receiving checklist notifications');
    return {
        passed: hasSupervisorEmail && hasComment,
        details: hasSupervisorEmail ? 
            (hasComment ? 'Variable and comment present' : 'Variable present but missing comment') :
            'SUPERVISOR_EMAIL variable missing'
    };
});

// Check dhl_login .env.example
checkFile('dhl_login/.env.example', 'DHL Login .env.example has SUPERVISOR_EMAIL', (content) => {
    const hasSupervisorEmail = content.includes('SUPERVISOR_EMAIL=');
    const hasComment = content.includes('Supervisor email address for receiving checklist notifications');
    return {
        passed: hasSupervisorEmail && hasComment,
        details: hasSupervisorEmail ? 
            (hasComment ? 'Variable and comment present' : 'Variable present but missing comment') :
            'SUPERVISOR_EMAIL variable missing'
    };
});

console.log('\n📡 Checking Configuration API...');

// Check dhl_login app.js for config endpoint
checkFile('dhl_login/app.js', 'Configuration API includes supervisor email', (content) => {
    const hasConfigEndpoint = content.includes('/api/config');
    const hasSupervisorEmail = content.includes('supervisorEmail: process.env.SUPERVISOR_EMAIL');
    return {
        passed: hasConfigEndpoint && hasSupervisorEmail,
        details: hasConfigEndpoint ? 
            (hasSupervisorEmail ? 'Endpoint and supervisor email present' : 'Endpoint present but supervisor email missing') :
            'Configuration endpoint missing'
    };
});

console.log('\n🌐 Checking Frontend Configuration...');

// Check Public/config.js
checkFile('Public/config.js', 'Frontend config module supports supervisor email', (content) => {
    const hasSupervisorEmailProperty = content.includes('supervisorEmail: null');
    const hasGetterFunction = content.includes('getSupervisorEmail');
    const hasConfigUpdate = content.includes('window.AppConfig.supervisorEmail = config.supervisorEmail');
    return {
        passed: hasSupervisorEmailProperty && hasGetterFunction && hasConfigUpdate,
        details: `Property: ${hasSupervisorEmailProperty}, Getter: ${hasGetterFunction}, Update: ${hasConfigUpdate}`
    };
});

// Check Public/scripts.js
checkFile('Public/scripts.js', 'Frontend scripts use configurable supervisor email', (content) => {
    const noHardcodedEmail = !content.includes('sendral.ts.1@pg.com');
    const usesConfigEmail = content.includes('window.AppConfig.getSupervisorEmail()');
    const hasConfigWait = content.includes('window.AppConfig.waitForConfig()');
    return {
        passed: noHardcodedEmail && usesConfigEmail && hasConfigWait,
        details: `No hardcoded: ${noHardcodedEmail}, Uses config: ${usesConfigEmail}, Waits for config: ${hasConfigWait}`
    };
});

console.log('\n🔧 Checking Backend Implementation...');

// Check backend server.js
checkFile('backend/server.js', 'Backend uses environment variable fallback', (content) => {
    const hasEnvFallback = content.includes('formData.supervisorEmail || process.env.SUPERVISOR_EMAIL');
    const hasImprovedErrorMessage = content.includes('Please configure SUPERVISOR_EMAIL environment variable');
    return {
        passed: hasEnvFallback && hasImprovedErrorMessage,
        details: `Env fallback: ${hasEnvFallback}, Improved error: ${hasImprovedErrorMessage}`
    };
});

console.log('\n📚 Checking Documentation...');

// Check README.md
checkFile('README.md', 'README.md mentions SUPERVISOR_EMAIL', (content) => {
    const mentionsSupervisorEmail = content.includes('SUPERVISOR_EMAIL');
    const hasDescription = content.includes('Email address for receiving checklist notifications');
    return {
        passed: mentionsSupervisorEmail && hasDescription,
        details: `Mentions variable: ${mentionsSupervisorEmail}, Has description: ${hasDescription}`
    };
});

// Check production deployment plan
checkFile('production_deployment_plan.md', 'Production deployment plan includes SUPERVISOR_EMAIL', (content) => {
    const mentionsSupervisorEmail = content.includes('SUPERVISOR_EMAIL');
    return {
        passed: mentionsSupervisorEmail,
        details: mentionsSupervisorEmail ? 'Variable mentioned' : 'Variable not mentioned'
    };
});

console.log('\n🧪 Checking Test Scripts...');

// Check test configuration script
checkFile('scripts/test-config-endpoint.js', 'Test script checks supervisor email', (content) => {
    const checksSupervisorEmail = content.includes('config.supervisorEmail');
    const hasWarning = content.includes('supervisorEmail is not set');
    return {
        passed: checksSupervisorEmail && hasWarning,
        details: `Checks email: ${checksSupervisorEmail}, Has warning: ${hasWarning}`
    };
});

// Check if our new test script exists
checkFile('scripts/test-supervisor-email-config.js', 'Supervisor email test script exists', (content) => {
    const isTestScript = content.includes('Test Supervisor Email Configuration');
    return {
        passed: isTestScript,
        details: isTestScript ? 'Test script properly configured' : 'Not a valid test script'
    };
});

console.log('\n' + '='.repeat(60));
console.log('📊 Implementation Verification Summary');
console.log('='.repeat(60));

const passedChecks = checks.filter(check => check.passed).length;
const totalChecks = checks.length;
const successRate = Math.round((passedChecks / totalChecks) * 100);

console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks (${successRate}%)`);

if (allPassed) {
    console.log('\n🎉 All checks passed! Supervisor email implementation is complete.');
    console.log('\n📝 Next steps:');
    console.log('   1. Set SUPERVISOR_EMAIL in both .env files');
    console.log('   2. Test the configuration: node scripts/test-supervisor-email-config.js');
    console.log('   3. Test form submission with the new configurable email');
    console.log('   4. Proceed with implementing the next code review item');
} else {
    console.log('\n❌ Some checks failed. Please review the implementation.');
    console.log('\n🔧 Failed checks:');
    checks.filter(check => !check.passed).forEach(check => {
        console.log(`   - ${check.description}: ${check.details}`);
    });
}

console.log('\n💡 To test the implementation:');
console.log('   node scripts/test-supervisor-email-config.js');

process.exit(allPassed ? 0 : 1);
