#!/usr/bin/env node

/**
 * Test Configuration Endpoint
 * 
 * This script tests the /api/config endpoint to ensure it's working correctly.
 * 
 * Usage:
 *   node scripts/test-config-endpoint.js [url]
 * 
 * Default URL: http://localhost:3000/api/config
 */

const http = require('http');
const https = require('https');
const url = require('url');

const testUrl = process.argv[2] || 'http://localhost:3000/api/config';

console.log(`🧪 Testing configuration endpoint: ${testUrl}\n`);

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
                'User-Agent': 'Config-Test-Script/1.0'
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

async function testConfig() {
    try {
        const response = await makeRequest(testUrl);
        
        console.log(`📊 Response Status: ${response.statusCode}`);
        console.log(`📋 Response Headers:`, response.headers);
        console.log(`📄 Response Body:`, response.body);
        
        if (response.statusCode === 200) {
            try {
                const config = JSON.parse(response.body);
                console.log('\n✅ Configuration endpoint is working!');
                console.log('📝 Parsed Configuration:');
                console.log(`   Backend API URL: ${config.backendApiUrl || 'Not set'}`);
                console.log(`   Supervisor Email: ${config.supervisorEmail || 'Not set'}`);
                console.log(`   Environment: ${config.environment || 'Not set'}`);
                console.log(`   Version: ${config.version || 'Not set'}`);

                // Validate required fields
                if (!config.backendApiUrl) {
                    console.log('\n⚠️  Warning: backendApiUrl is not set in configuration');
                }
                if (!config.supervisorEmail) {
                    console.log('\n⚠️  Warning: supervisorEmail is not set in configuration');
                }
                
                return true;
            } catch (parseError) {
                console.log('\n❌ Failed to parse JSON response:', parseError.message);
                return false;
            }
        } else {
            console.log(`\n❌ Configuration endpoint returned status ${response.statusCode}`);
            return false;
        }
        
    } catch (error) {
        console.log('\n❌ Failed to test configuration endpoint:', error.message);
        console.log('\n💡 Make sure the dhl_login service is running on the expected port.');
        return false;
    }
}

// Run the test
testConfig().then((success) => {
    process.exit(success ? 0 : 1);
});
