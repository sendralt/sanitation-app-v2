require('dotenv').config();
console.log('Environment variables:');
console.log('SUPERVISOR_EMAIL:', process.env.SUPERVISOR_EMAIL);
console.log('BACKEND_API_URL:', process.env.BACKEND_API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const config = {
    backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:3001',
    supervisorEmail: process.env.SUPERVISOR_EMAIL || 'supervisor@company.com',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.2'
};

console.log('Config object:', JSON.stringify(config, null, 2));
