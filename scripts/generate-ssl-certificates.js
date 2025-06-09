#!/usr/bin/env node

/**
 * SSL Certificate Generation Script
 * Generates self-signed SSL certificates for development use
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    dhlLogin: {
        sslDir: path.join(__dirname, '..', 'dhl_login', 'ssl'),
        keyFile: 'server.key',
        certFile: 'server.crt'
    },
    backend: {
        sslDir: path.join(__dirname, '..', 'backend', 'ssl'),
        keyFile: 'server.key',
        certFile: 'server.crt'
    },
    certConfig: {
        country: 'US',
        state: 'State',
        city: 'City',
        organization: 'DHL Supply Chain',
        organizationalUnit: 'IT Department',
        commonName: 'localhost',
        days: 365,
        keySize: 4096
    }
};

/**
 * Create directory if it doesn't exist
 */
function ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✓ Created directory: ${dirPath}`);
    }
}

/**
 * Generate SSL certificate for a service
 */
function generateCertificate(serviceName, serviceConfig) {
    console.log(`\n🔐 Generating SSL certificate for ${serviceName}...`);
    
    ensureDirectory(serviceConfig.sslDir);
    
    const keyPath = path.join(serviceConfig.sslDir, serviceConfig.keyFile);
    const certPath = path.join(serviceConfig.sslDir, serviceConfig.certFile);
    
    // Build OpenSSL command
    const subject = `/C=${config.certConfig.country}/ST=${config.certConfig.state}/L=${config.certConfig.city}/O=${config.certConfig.organization}/OU=${config.certConfig.organizationalUnit}/CN=${config.certConfig.commonName}`;
    
    const opensslCommand = [
        'openssl req',
        '-x509',
        `-newkey rsa:${config.certConfig.keySize}`,
        `-keyout "${keyPath}"`,
        `-out "${certPath}"`,
        `-days ${config.certConfig.days}`,
        '-nodes',
        `-subj "${subject}"`
    ].join(' ');
    
    try {
        console.log(`   Executing: ${opensslCommand}`);
        execSync(opensslCommand, { stdio: 'inherit' });
        
        // Verify files were created
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            console.log(`✓ Certificate generated successfully for ${serviceName}`);
            console.log(`   Key:  ${keyPath}`);
            console.log(`   Cert: ${certPath}`);
            
            // Display certificate info
            try {
                const certInfo = execSync(`openssl x509 -in "${certPath}" -text -noout | grep -E "(Subject:|Not Before|Not After)"`, { encoding: 'utf8' });
                console.log(`   Certificate details:\n${certInfo}`);
            } catch (e) {
                // Ignore if we can't get cert info
            }
        } else {
            throw new Error('Certificate files were not created');
        }
    } catch (error) {
        console.error(`❌ Failed to generate certificate for ${serviceName}:`, error.message);
        process.exit(1);
    }
}

/**
 * Check if OpenSSL is available
 */
function checkOpenSSL() {
    try {
        execSync('openssl version', { stdio: 'pipe' });
        console.log('✓ OpenSSL is available');
    } catch (error) {
        console.error('❌ OpenSSL is not available. Please install OpenSSL first.');
        console.error('   On Ubuntu/Debian: sudo apt-get install openssl');
        console.error('   On macOS: brew install openssl');
        console.error('   On Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
        process.exit(1);
    }
}

/**
 * Main function
 */
function main() {
    console.log('🚀 DHL Sanitation App - SSL Certificate Generator');
    console.log('================================================');
    
    // Check prerequisites
    checkOpenSSL();
    
    // Generate certificates for both services
    generateCertificate('DHL Login Service', config.dhlLogin);
    generateCertificate('Backend API Service', config.backend);
    
    console.log('\n🎉 SSL certificate generation completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Update your .env files to enable SSL (ENABLE_SSL=true)');
    console.log('   2. Start your applications with: npm start');
    console.log('   3. Access your apps via HTTPS:');
    console.log('      - DHL Login: https://localhost:3443');
    console.log('      - Backend API: https://localhost:3444');
    console.log('\n⚠️  Note: These are self-signed certificates for development only.');
    console.log('   Your browser will show a security warning - this is normal.');
    console.log('   For production, use certificates from a trusted CA.');
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    generateCertificate,
    config
};
