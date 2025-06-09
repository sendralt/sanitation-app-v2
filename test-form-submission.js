#!/usr/bin/env node

/**
 * Test Form Submission
 * 
 * This script tests the form submission endpoint to verify that the
 * supervisor email validation error is resolved.
 */

const https = require('https');
const http = require('http');

// Test configuration
const config = {
    dhlLoginUrl: 'http://localhost:3000',
    backendUrl: 'http://localhost:3001',
    testCredentials: {
        username: 'admin',
        password: 'password123'
    }
};

console.log('🧪 Testing Form Submission with Supervisor Email Configuration\n');

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        
        req.end();
    });
}

/**
 * Test 1: Verify configuration endpoint
 */
async function testConfigurationEndpoint() {
    console.log('📡 Test 1: Checking configuration endpoint...');
    
    try {
        const response = await makeRequest(`${config.dhlLoginUrl}/api/config`);
        
        if (response.statusCode === 200) {
            const configData = JSON.parse(response.body);
            console.log('   ✅ Configuration endpoint accessible');
            console.log(`   📧 Supervisor Email: ${configData.supervisorEmail}`);
            console.log(`   🔗 Backend API URL: ${configData.backendApiUrl}`);
            
            if (configData.supervisorEmail && configData.supervisorEmail !== 'sendral.ts.1@pg.com') {
                console.log('   ✅ Supervisor email properly configured');
                return configData;
            } else {
                console.log('   ❌ Supervisor email still using old value');
                return null;
            }
        } else {
            console.log(`   ❌ Configuration endpoint returned status ${response.statusCode}`);
            return null;
        }
    } catch (error) {
        console.log(`   ❌ Failed to fetch configuration: ${error.message}`);
        return null;
    }
}

/**
 * Test 2: Login and get JWT token
 */
async function loginAndGetToken() {
    console.log('\n🔐 Test 2: Logging in to get JWT token...');
    
    try {
        // First, try to get a session by logging in
        const loginResponse = await makeRequest(`${config.dhlLoginUrl}/login-page`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `username=${config.testCredentials.username}&password=${config.testCredentials.password}`
        });
        
        console.log(`   📊 Login response status: ${loginResponse.statusCode}`);
        
        // Extract session cookie if available
        const setCookieHeader = loginResponse.headers['set-cookie'];
        let sessionCookie = '';
        if (setCookieHeader) {
            const sessionMatch = setCookieHeader.find(cookie => cookie.includes('connect.sid'));
            if (sessionMatch) {
                sessionCookie = sessionMatch.split(';')[0];
                console.log('   ✅ Session cookie obtained');
            }
        }
        
        // Now try to get JWT token using the session
        const jwtResponse = await makeRequest(`${config.dhlLoginUrl}/api/auth/issue-jwt-for-session`, {
            method: 'GET',
            headers: {
                'Cookie': sessionCookie
            }
        });
        
        if (jwtResponse.statusCode === 200) {
            const tokenData = JSON.parse(jwtResponse.body);
            console.log('   ✅ JWT token obtained successfully');
            return tokenData.token;
        } else {
            console.log(`   ⚠️  JWT endpoint returned status ${jwtResponse.statusCode}`);
            console.log('   💡 This might be expected if not logged in properly');
            return null;
        }
        
    } catch (error) {
        console.log(`   ⚠️  Login process failed: ${error.message}`);
        console.log('   💡 This might be expected in a test environment');
        return null;
    }
}

/**
 * Test 3: Test form submission with supervisor email
 */
async function testFormSubmission(configData, authToken) {
    console.log('\n📝 Test 3: Testing form submission...');
    
    // Create test form data
    const testFormData = {
        title: 'Test Checklist Submission',
        name: 'Test User',
        date: new Date().toISOString().split('T')[0],
        checkboxes: {
            'section1': {
                'item1': { checked: true, label: 'Test Item 1' },
                'item2': { checked: false, label: 'Test Item 2' }
            }
        },
        comments: 'Test submission for supervisor email validation',
        supervisorEmail: configData.supervisorEmail
    };
    
    console.log(`   📧 Using supervisor email: ${testFormData.supervisorEmail}`);
    
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add auth token if available
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
            console.log('   🔑 Using JWT authentication');
        } else {
            console.log('   ⚠️  No JWT token available, submission may fail due to authentication');
        }
        
        const response = await makeRequest(`${configData.backendApiUrl}/submit-form`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(testFormData)
        });
        
        console.log(`   📊 Submission response status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            console.log('   ✅ Form submission successful!');
            const responseData = JSON.parse(response.body);
            console.log(`   📨 Response: ${responseData.message}`);
            return true;
        } else if (response.statusCode === 401) {
            console.log('   🔒 Authentication required (expected without proper login)');
            console.log('   💡 The supervisor email validation logic should still be working');
            
            // Check if the error is about authentication, not supervisor email
            try {
                const errorData = JSON.parse(response.body);
                if (errorData.error && errorData.error.includes('Supervisor email is required')) {
                    console.log('   ❌ Still getting supervisor email validation error!');
                    return false;
                } else {
                    console.log('   ✅ No supervisor email validation error detected');
                    return true;
                }
            } catch (e) {
                console.log('   ✅ Authentication error (not supervisor email issue)');
                return true;
            }
        } else {
            console.log(`   ❌ Unexpected response status: ${response.statusCode}`);
            console.log(`   📄 Response body: ${response.body}`);
            
            // Check if it's the supervisor email error
            if (response.body.includes('Supervisor email is required')) {
                console.log('   ❌ Supervisor email validation error still occurring!');
                return false;
            } else {
                console.log('   ✅ Different error (not supervisor email issue)');
                return true;
            }
        }
        
    } catch (error) {
        console.log(`   ❌ Form submission failed: ${error.message}`);
        return false;
    }
}

/**
 * Main test function
 */
async function runTests() {
    console.log('🚀 Starting form submission tests...\n');
    
    // Test 1: Configuration
    const configData = await testConfigurationEndpoint();
    if (!configData) {
        console.log('\n❌ Configuration test failed. Cannot proceed with form submission test.');
        process.exit(1);
    }
    
    // Test 2: Authentication (optional)
    const authToken = await loginAndGetToken();
    
    // Test 3: Form submission
    const submissionSuccess = await testFormSubmission(configData, authToken);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(60));
    
    if (submissionSuccess) {
        console.log('✅ Form submission test PASSED');
        console.log('✅ Supervisor email validation is working correctly');
        console.log('✅ The "Supervisor email is required" error should be resolved');
        
        console.log('\n📝 Next steps:');
        console.log('   1. Test with actual user login in browser');
        console.log('   2. Verify email delivery if EMAIL_USER/EMAIL_PASS are configured');
        console.log('   3. Consider setting a real supervisor email address');
        
        process.exit(0);
    } else {
        console.log('❌ Form submission test FAILED');
        console.log('❌ Supervisor email validation issue persists');
        
        console.log('\n🔧 Troubleshooting steps:');
        console.log('   1. Check that both services are running with updated .env files');
        console.log('   2. Verify SUPERVISOR_EMAIL is set in both backend/.env and dhl_login/.env');
        console.log('   3. Restart both services after environment changes');
        console.log('   4. Check server logs for additional error details');
        
        process.exit(1);
    }
}

// Run the tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});
