#!/usr/bin/env node

/**
 * Test script to verify forgot password functionality
 */

const http = require('http');

function testForgotPasswordEndpoint() {
    console.log('🔐 Testing Forgot Password Functionality\n');

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/forgot-password',
            method: 'GET',
            headers: {
                'User-Agent': 'Node.js Test Script'
            }
        };

        const req = http.request(options, (res) => {
            console.log(`Status Code: ${res.statusCode}`);
            console.log(`Status Message: ${res.statusMessage}`);
            console.log(`Headers:`, res.headers);

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log('\n--- Response Analysis ---');
                
                if (res.statusCode === 200) {
                    console.log('✅ HTTP 200 OK - Page loads successfully');
                    
                    // Check if response contains HTML content
                    if (data.includes('<!DOCTYPE html>')) {
                        console.log('✅ Response contains valid HTML structure');
                    } else {
                        console.log('❌ Response does not contain HTML structure');
                    }
                    
                    // Check for password reset form elements
                    if (data.includes('Password Reset')) {
                        console.log('✅ Page contains "Password Reset" title');
                    } else {
                        console.log('❌ Page missing "Password Reset" title');
                    }
                    
                    if (data.includes('usernameForm')) {
                        console.log('✅ Username form is present');
                    } else {
                        console.log('❌ Username form is missing');
                    }
                    
                    if (data.includes('_csrf')) {
                        console.log('✅ CSRF protection is enabled');
                    } else {
                        console.log('❌ CSRF protection is missing');
                    }
                    
                    // Check for error content
                    if (data.includes('error') && data.includes('stack')) {
                        console.log('❌ Response contains error content');
                        console.log('Error details found in response');
                    } else {
                        console.log('✅ No error content detected');
                    }
                    
                } else {
                    console.log(`❌ HTTP ${res.statusCode} - Unexpected status code`);
                    console.log('Response body:', data.substring(0, 500));
                }
                
                resolve({
                    statusCode: res.statusCode,
                    success: res.statusCode === 200 && data.includes('Password Reset'),
                    hasError: data.includes('error') && data.includes('stack'),
                    responseLength: data.length
                });
            });
        });

        req.on('error', (err) => {
            console.error('❌ Request failed:', err.message);
            reject(err);
        });

        req.setTimeout(10000, () => {
            console.error('❌ Request timed out');
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

async function main() {
    try {
        const result = await testForgotPasswordEndpoint();
        
        console.log('\n📊 Test Summary:');
        console.log(`- Status Code: ${result.statusCode}`);
        console.log(`- Success: ${result.success ? 'Yes' : 'No'}`);
        console.log(`- Has Errors: ${result.hasError ? 'Yes' : 'No'}`);
        console.log(`- Response Length: ${result.responseLength} bytes`);
        
        if (result.success && !result.hasError) {
            console.log('\n🎉 Forgot password functionality is working correctly!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Issues detected with forgot password functionality');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n💥 Test failed:', error.message);
        process.exit(1);
    }
}

main();
