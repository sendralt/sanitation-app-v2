// Test script for compliance analytics endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

// Mock JWT token for testing (you'll need a real token in production)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZSI6ImFkbWluIiwiaXNBZG1pbiI6dHJ1ZSwiaWF0IjoxNjQwOTk1MjAwfQ.test-signature';

async function testEndpoint(endpoint, description) {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📍 Endpoint: ${endpoint}`);
    
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`📊 Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Success! Response:`, JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log(`❌ Error Response:`, errorText);
        }
    } catch (error) {
        console.log(`💥 Request Failed:`, error.message);
    }
}

async function runTests() {
    console.log('🚀 Starting Compliance Analytics Endpoint Tests...\n');
    
    // Test the main compliance analytics endpoints
    await testEndpoint('/api/analytics/compliance?days=30', 'Compliance Analytics - 30 days');
    await testEndpoint('/api/analytics/compliance?days=7', 'Compliance Analytics - 7 days');
    
    // Test other analytics endpoints
    await testEndpoint('/api/analytics/completion-trends?days=30', 'Completion Trends - 30 days');
    await testEndpoint('/api/analytics/validation-turnaround?days=30', 'Validation Turnaround - 30 days');
    await testEndpoint('/api/analytics/team-productivity?days=30', 'Team Productivity - 30 days');
    
    console.log('\n🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error);
