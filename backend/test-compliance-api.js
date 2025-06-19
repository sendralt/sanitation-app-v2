// Test the compliance API endpoint directly
const http = require('http');

function testComplianceAPI() {
    const postData = JSON.stringify({
        username: 'compliance',
        password: 'compliance123'
    });

    // First, get a JWT token
    const loginOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    console.log('🔐 Testing compliance API authentication...');

    const loginReq = http.request(loginOptions, (loginRes) => {
        let loginData = '';

        loginRes.on('data', (chunk) => {
            loginData += chunk;
        });

        loginRes.on('end', () => {
            console.log(`Login Status: ${loginRes.statusCode}`);
            
            if (loginRes.statusCode === 200) {
                try {
                    const loginResponse = JSON.parse(loginData);
                    const token = loginResponse.token;
                    console.log('✅ Login successful, token received');

                    // Now test the compliance overview endpoint
                    const complianceOptions = {
                        hostname: 'localhost',
                        port: 3001,
                        path: '/api/compliance/overview',
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    };

                    console.log('📊 Testing compliance overview endpoint...');

                    const complianceReq = http.request(complianceOptions, (complianceRes) => {
                        let complianceData = '';

                        complianceRes.on('data', (chunk) => {
                            complianceData += chunk;
                        });

                        complianceRes.on('end', () => {
                            console.log(`Compliance API Status: ${complianceRes.statusCode}`);
                            console.log('Response:', complianceData);
                            
                            if (complianceRes.statusCode === 200) {
                                console.log('✅ Compliance API working correctly!');
                            } else {
                                console.log('❌ Compliance API error');
                            }
                        });
                    });

                    complianceReq.on('error', (error) => {
                        console.error('❌ Compliance API request error:', error.message);
                    });

                    complianceReq.end();

                } catch (error) {
                    console.error('❌ Error parsing login response:', error.message);
                }
            } else {
                console.log('❌ Login failed:', loginData);
            }
        });
    });

    loginReq.on('error', (error) => {
        console.error('❌ Login request error:', error.message);
    });

    loginReq.write(postData);
    loginReq.end();
}

testComplianceAPI();
