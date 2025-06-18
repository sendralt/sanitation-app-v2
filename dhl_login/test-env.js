#!/usr/bin/env node

/**
 * Test script to verify .env configuration is loaded correctly
 * Run with: node test-env.js
 */

require('dotenv').config();

console.log('=== DHL Login Frontend Environment Configuration Test ===\n');

// Test required environment variables
const requiredVars = [
    'PORT',
    'NODE_ENV',
    'JWT_SECRET',
    'SESSION_SECRET',
    'CSRF_SECRET'
];

const optionalVars = [
    'HTTPS_PORT',
    'ENABLE_SSL',
    'BACKEND_API_URL',
    'SUPERVISOR_EMAIL',
    'BASE_URL',
    'CORS_ALLOWED_ORIGINS'
];

console.log('Required Environment Variables:');
console.log('================================');
let allRequiredPresent = true;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✓' : '✗';
    const displayValue = varName.includes('SECRET') ? 
        (value ? `${value.substring(0, 8)}...` : 'NOT SET') : 
        (value || 'NOT SET');
    
    console.log(`${status} ${varName}: ${displayValue}`);
    
    if (!value) {
        allRequiredPresent = false;
    }
});

console.log('\nOptional Environment Variables:');
console.log('===============================');

optionalVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✓' : '-';
    const displayValue = value || 'NOT SET';
    
    console.log(`${status} ${varName}: ${displayValue}`);
});

console.log('\nConfiguration Summary:');
console.log('======================');
console.log(`Frontend Port: ${process.env.PORT || 'NOT SET'}`);
console.log(`HTTPS Port: ${process.env.HTTPS_PORT || 'NOT SET'}`);
console.log(`SSL Enabled: ${process.env.ENABLE_SSL || 'false'}`);
console.log(`Backend API: ${process.env.BACKEND_API_URL || 'NOT SET'}`);
console.log(`Base URL: ${process.env.BASE_URL || 'NOT SET'}`);
console.log(`Environment: ${process.env.NODE_ENV || 'NOT SET'}`);

if (allRequiredPresent) {
    console.log('\n✅ All required environment variables are set!');
    console.log('The frontend is ready to start on port', process.env.PORT);
} else {
    console.log('\n❌ Some required environment variables are missing!');
    console.log('Please check your .env file configuration.');
    process.exit(1);
}

// Test CORS origins parsing
if (process.env.CORS_ALLOWED_ORIGINS) {
    console.log('\nCORS Configuration:');
    console.log('===================');
    const origins = process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
    origins.forEach((origin, index) => {
        console.log(`${index + 1}. ${origin}`);
    });
}

console.log('\n🚀 Environment configuration test completed successfully!');
