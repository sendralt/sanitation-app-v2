#!/usr/bin/env node

/**
 * Generate Secure Secrets for Environment Variables
 * 
 * This script generates cryptographically secure random strings
 * for use as SESSION_SECRET and JWT_SECRET in your .env files.
 * 
 * Usage:
 *   node scripts/generate-secrets.js
 * 
 * Or make it executable and run directly:
 *   chmod +x scripts/generate-secrets.js
 *   ./scripts/generate-secrets.js
 */

const crypto = require('crypto');

console.log('🔐 Generating secure secrets for your environment variables...\n');

// Generate SESSION_SECRET (64 bytes = 128 hex characters)
const sessionSecret = crypto.randomBytes(64).toString('hex');

// Generate JWT_SECRET (64 bytes = 128 hex characters)
const jwtSecret = crypto.randomBytes(64).toString('hex');

console.log('📋 Copy these values to your .env files:\n');

console.log('For dhl_login/.env:');
console.log('==================');
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`JWT_SECRET=${jwtSecret}`);

console.log('\nFor backend/.env:');
console.log('=================');
console.log(`JWT_SECRET=${jwtSecret}`);

console.log('\n⚠️  Important Security Notes:');
console.log('   • Keep these secrets secure and never commit them to version control');
console.log('   • Use the same JWT_SECRET in both dhl_login and backend services');
console.log('   • Generate new secrets for each environment (dev, staging, production)');
console.log('   • Store production secrets securely (e.g., in a password manager)');

console.log('\n✅ Secrets generated successfully!');
