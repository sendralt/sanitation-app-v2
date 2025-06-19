// Direct endpoint test without complex database operations
const http = require('http');

function makeRequest(path, callback) {
    const options = {
        hostname: 'localhost',
        port: 3001,
        path: path,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json'
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            callback(null, {
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                data: data
            });
        });
    });

    req.on('error', (error) => {
        callback(error, null);
    });

    req.setTimeout(5000, () => {
        req.destroy();
        callback(new Error('Request timeout'), null);
    });

    req.end();
}

async function testEndpoints() {
    console.log('🧪 Testing compliance analytics endpoints directly...\n');
    
    const endpoints = [
        '/api/analytics/compliance?days=30',
        '/api/analytics/compliance?days=7',
        '/api/analytics/completion-trends?days=30',
        '/api/analytics/validation-turnaround?days=30'
    ];
    
    for (const endpoint of endpoints) {
        console.log(`📍 Testing: ${endpoint}`);
        
        try {
            const result = await new Promise((resolve, reject) => {
                makeRequest(endpoint, (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
            
            console.log(`📊 Status: ${result.statusCode} ${result.statusMessage}`);
            
            if (result.statusCode === 200) {
                try {
                    const jsonData = JSON.parse(result.data);
                    console.log(`✅ Success! Response keys:`, Object.keys(jsonData));
                    if (jsonData.complianceMetrics) {
                        console.log(`📈 Compliance metrics count: ${jsonData.complianceMetrics.length}`);
                    }
                } catch (parseError) {
                    console.log(`⚠️  Response not JSON:`, result.data.substring(0, 200));
                }
            } else {
                console.log(`❌ Error response:`, result.data.substring(0, 200));
            }
            
        } catch (error) {
            console.log(`💥 Request failed:`, error.message);
        }
        
        console.log(''); // Empty line for readability
    }
    
    console.log('🏁 Endpoint tests completed!');
}

testEndpoints().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
});
