#!/usr/bin/env node

/**
 * Test Supervisor Email Configuration
 * 
 * This script tests the supervisor email configuration to ensure it's working correctly
 * across the entire application stack.
 * 
 * Usage:
 *   node scripts/test-supervisor-email-config.js [dhl_login_url]
 * 
 * Default URL: http://localhost:3000
 */

const http = require('http');
const https = require('https');
const url = require('url');

const baseUrl = process.argv[2] || 'http://localhost:3000';
const configUrl = `${baseUrl}/api/config`;

console.log(`🧪 Testing supervisor email configuration\n`);
console.log(`📍 Base URL: ${baseUrl}`);
console.log(`🔧 Config URL: ${configUrl}\n`);

function makeRequest(testUrl) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(testUrl);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Supervisor-Email-Test-Script/1.0'
            }
        };
        
        const req = client.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

async function testSupervisorEmailConfig() {
    try {
        console.log('📡 Fetching configuration from server...');
        const response = await makeRequest(configUrl);
        
        console.log(`📊 Response Status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            try {
                const config = JSON.parse(response.body);
                console.log('\n✅ Configuration endpoint is working!');
                console.log('📝 Configuration Details:');
                console.log(`   Backend API URL: ${config.backendApiUrl || 'Not set'}`);
                console.log(`   Supervisor Email: ${config.supervisorEmail || 'Not set'}`);
                console.log(`   Environment: ${config.environment || 'Not set'}`);
                console.log(`   Version: ${config.version || 'Not set'}`);
                
                // Test supervisor email specifically
                console.log('\n🔍 Supervisor Email Analysis:');
                
                if (config.supervisorEmail) {
                    const email = config.supervisorEmail;
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    
                    if (emailRegex.test(email)) {
                        console.log(`   ✅ Valid email format: ${email}`);
                        
                        // Check if it's still the default/example email
                        if (email === 'supervisor@company.com') {
                            console.log('   ⚠️  Warning: Using default example email');
                            console.log('   💡 Recommendation: Set SUPERVISOR_EMAIL environment variable to actual email');
                        } else if (email === 'sendral.ts.1@pg.com') {
                            console.log('   ❌ Error: Still using old hardcoded email!');
                            console.log('   🔧 Action needed: Check environment variable configuration');
                            return false;
                        } else {
                            console.log('   ✅ Custom email configured correctly');
                        }
                    } else {
                        console.log(`   ❌ Invalid email format: ${email}`);
                        return false;
                    }
                } else {
                    console.log('   ❌ Supervisor email not found in configuration');
                    return false;
                }
                
                console.log('\n📋 Configuration Test Summary:');
                console.log('   ✅ Configuration endpoint accessible');
                console.log('   ✅ Supervisor email included in response');
                console.log('   ✅ Email format validation passed');
                
                if (config.supervisorEmail === 'supervisor@company.com') {
                    console.log('   ⚠️  Using default email (configure SUPERVISOR_EMAIL env var)');
                } else {
                    console.log('   ✅ Custom email configured');
                }
                
                return true;
                
            } catch (parseError) {
                console.log('\n❌ Failed to parse JSON response:', parseError.message);
                console.log('📄 Raw response:', response.body);
                return false;
            }
        } else {
            console.log(`\n❌ Configuration endpoint returned status ${response.statusCode}`);
            console.log('📄 Response body:', response.body);
            return false;
        }
        
    } catch (error) {
        console.log('\n❌ Failed to test supervisor email configuration:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   1. Make sure the dhl_login service is running');
        console.log('   2. Check that the service is accessible on the expected port');
        console.log('   3. Verify SUPERVISOR_EMAIL is set in dhl_login/.env');
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting supervisor email configuration tests...\n');
    
    const success = await testSupervisorEmailConfig();
    
    console.log('\n' + '='.repeat(60));
    
    if (success) {
        console.log('🎉 All tests passed! Supervisor email configuration is working correctly.');
        console.log('\n📝 Next steps:');
        console.log('   1. If using default email, set SUPERVISOR_EMAIL in both .env files');
        console.log('   2. Test form submission to verify email delivery');
        console.log('   3. Verify email configuration in backend service');
    } else {
        console.log('❌ Tests failed! Please check the configuration and try again.');
        console.log('\n🔧 Common fixes:');
        console.log('   1. Set SUPERVISOR_EMAIL in dhl_login/.env');
        console.log('   2. Set SUPERVISOR_EMAIL in backend/.env');
        console.log('   3. Restart both services after changing environment variables');
        console.log('   4. Check that both services are running and accessible');
    }
    
    process.exit(success ? 0 : 1);
}

// Run the tests
runTests();
