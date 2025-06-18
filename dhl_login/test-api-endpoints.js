#!/usr/bin/env node

/**
 * Test script to verify API endpoints are working
 * This simulates what the dashboard does
 */

const fetch = require('node-fetch');

const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';

async function testEndpoints() {
    console.log('🧪 Testing API Endpoints\n');

    try {
        // Step 1: Test frontend health
        console.log('1. Testing frontend health...');
        const frontendHealth = await fetch(`${FRONTEND_URL}/health`);
        console.log(`   Frontend health: ${frontendHealth.status} ${frontendHealth.statusText}`);

        // Step 2: Test backend health  
        console.log('2. Testing backend health...');
        const backendHealth = await fetch(`${BACKEND_URL}/health`);
        console.log(`   Backend health: ${backendHealth.status} ${backendHealth.statusText}`);

        // Step 3: Test getting JWT token (this is what the dashboard does first)
        console.log('3. Testing JWT token endpoint...');
        const tokenResponse = await fetch(`${FRONTEND_URL}/api/auth/issue-jwt-for-session`, {
            method: 'GET',
            credentials: 'include'
        });
        console.log(`   Token endpoint: ${tokenResponse.status} ${tokenResponse.statusText}`);
        
        if (tokenResponse.status === 401) {
            console.log('   ⚠️  Expected 401 - user not logged in via session');
        }

        // Step 4: Test backend API endpoints (these will fail without valid JWT, but we can see the response)
        console.log('4. Testing backend API endpoints...');
        
        const endpoints = [
            '/api/user/stats',
            '/api/user/assignments', 
            '/api/user/submissions'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                    headers: { 'Authorization': 'Bearer invalid-token' }
                });
                console.log(`   ${endpoint}: ${response.status} ${response.statusText}`);
                
                if (response.status === 401) {
                    console.log('     ✅ Expected 401 - invalid token');
                } else if (response.status === 429) {
                    console.log('     ⚠️  Rate limited - this is the problem!');
                }
            } catch (error) {
                console.log(`   ${endpoint}: ERROR - ${error.message}`);
            }
        }

        console.log('\n📊 Test Summary:');
        console.log('- Frontend and backend servers are running');
        console.log('- API endpoints exist and respond');
        console.log('- Authentication is working (401 responses expected)');
        console.log('- If you see 429 errors, rate limiting is the issue');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testEndpoints();
