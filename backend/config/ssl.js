const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * SSL Configuration Module
 * Handles SSL certificate loading and HTTPS server creation
 */

/**
 * Load SSL certificates from the specified paths
 * @param {string} keyPath - Path to the private key file
 * @param {string} certPath - Path to the certificate file
 * @returns {Object|null} SSL options object or null if certificates not found
 */
function loadSSLCertificates(keyPath, certPath) {
    try {
        // Resolve paths relative to the application root
        const resolvedKeyPath = path.resolve(keyPath);
        const resolvedCertPath = path.resolve(certPath);

        console.log(`[SSL] Attempting to load SSL certificates:`);
        console.log(`[SSL] Key path: ${resolvedKeyPath}`);
        console.log(`[SSL] Cert path: ${resolvedCertPath}`);

        // Check if certificate files exist
        if (!fs.existsSync(resolvedKeyPath)) {
            console.error(`[SSL] SSL private key file not found: ${resolvedKeyPath}`);
            return null;
        }

        if (!fs.existsSync(resolvedCertPath)) {
            console.error(`[SSL] SSL certificate file not found: ${resolvedCertPath}`);
            return null;
        }

        // Read certificate files
        const privateKey = fs.readFileSync(resolvedKeyPath, 'utf8');
        const certificate = fs.readFileSync(resolvedCertPath, 'utf8');

        console.log(`[SSL] SSL certificates loaded successfully`);

        return {
            key: privateKey,
            cert: certificate,
            // Additional SSL options for security
            ciphers: [
                'ECDHE-RSA-AES128-GCM-SHA256',
                'ECDHE-RSA-AES256-GCM-SHA384',
                'ECDHE-RSA-AES128-SHA256',
                'ECDHE-RSA-AES256-SHA384'
            ].join(':'),
            honorCipherOrder: true,
            minVersion: 'TLSv1.2'
        };
    } catch (error) {
        console.error(`[SSL] Error loading SSL certificates:`, error.message);
        return null;
    }
}

/**
 * Create HTTPS server with the provided app and SSL options
 * @param {Object} app - Express application instance
 * @param {Object} sslOptions - SSL options object
 * @param {number} port - Port to listen on
 * @param {Function} callback - Callback function to execute when server starts
 * @returns {Object} HTTPS server instance
 */
function createHTTPSServer(app, sslOptions, port, callback) {
    const server = https.createServer(sslOptions, app);
    
    server.listen(port, '0.0.0.0', callback);
    
    server.on('error', (error) => {
        if (error.syscall !== 'listen') {
            throw error;
        }

        const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

        switch (error.code) {
            case 'EACCES':
                console.error(`[SSL] ${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(`[SSL] ${bind} is already in use`);
                process.exit(1);
                break;
            default:
                console.error(`[SSL] HTTPS server error: ${error.code}`, error);
                throw error;
        }
    });

    return server;
}

/**
 * Get SSL configuration based on environment variables
 * @returns {Object} Configuration object with SSL settings
 */
function getSSLConfig() {
    const enableSSL = process.env.ENABLE_SSL === 'true';
    const httpsPort = parseInt(process.env.HTTPS_PORT) || 3443;
    const httpPort = parseInt(process.env.PORT) || 3000;
    const sslKeyPath = process.env.SSL_KEY_PATH || 'ssl/server.key';
    const sslCertPath = process.env.SSL_CERT_PATH || 'ssl/server.crt';

    return {
        enableSSL,
        httpsPort,
        httpPort,
        sslKeyPath,
        sslCertPath
    };
}

module.exports = {
    loadSSLCertificates,
    createHTTPSServer,
    getSSLConfig
};
