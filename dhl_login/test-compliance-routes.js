// Test script to check compliance routes
const http = require('http');

function makeRequest(path, callback) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: 'GET',
        headers: {
            'User-Agent': 'Test-Script'
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
                headers: res.headers,
                data: data.substring(0, 500) // Limit data for readability
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

async function testComplianceRoutes() {
    console.log('🧪 Testing compliance dashboard routes...\n');
    
    const routes = [
        '/compliance',
        '/compliance/metrics',
        '/compliance/audit',
        '/compliance/non-compliance',
        '/compliance/validation-trends'
    ];
    
    for (const route of routes) {
        console.log(`📍 Testing: ${route}`);
        
        try {
            const result = await new Promise((resolve, reject) => {
                makeRequest(route, (error, response) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(response);
                    }
                });
            });
            
            console.log(`📊 Status: ${result.statusCode} ${result.statusMessage}`);
            
            if (result.statusCode === 302) {
                console.log(`🔄 Redirect to: ${result.headers.location}`);
                console.log(`✅ Route exists (redirecting to login as expected)`);
            } else if (result.statusCode === 200) {
                console.log(`✅ Route accessible`);
            } else if (result.statusCode === 404) {
                console.log(`❌ Route not found`);
            } else {
                console.log(`⚠️  Unexpected status: ${result.statusCode}`);
            }
            
        } catch (error) {
            console.log(`💥 Request failed: ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
    }
    
    console.log('🏁 Route tests completed!');
}

testComplianceRoutes().then(() => {
    process.exit(0);
}).catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
});
