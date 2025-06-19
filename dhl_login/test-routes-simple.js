// Simple test to check if routes respond
const http = require('http');

function testRoute(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            resolve({
                path: path,
                status: res.statusCode,
                message: res.statusMessage,
                location: res.headers.location
            });
        });

        req.on('error', (error) => {
            resolve({
                path: path,
                status: 'ERROR',
                message: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                path: path,
                status: 'TIMEOUT',
                message: 'Request timed out'
            });
        });

        req.end();
    });
}

async function testAllRoutes() {
    console.log('🧪 Testing compliance routes...\n');
    
    const routes = [
        '/compliance',
        '/compliance/metrics',
        '/compliance/audit',
        '/compliance/non-compliance',
        '/compliance/validation-trends'
    ];
    
    for (const route of routes) {
        const result = await testRoute(route);
        console.log(`📍 ${result.path}`);
        console.log(`   Status: ${result.status} ${result.message}`);
        if (result.location) {
            console.log(`   Redirect: ${result.location}`);
        }
        
        if (result.status === 302) {
            console.log(`   ✅ Route exists (redirecting as expected)`);
        } else if (result.status === 200) {
            console.log(`   ✅ Route accessible`);
        } else if (result.status === 404) {
            console.log(`   ❌ Route not found`);
        } else if (result.status === 500) {
            console.log(`   ❌ Server error`);
        } else {
            console.log(`   ⚠️  Status: ${result.status}`);
        }
        console.log('');
    }
    
    console.log('🏁 Route testing completed!');
}

testAllRoutes().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
