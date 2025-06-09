#!/usr/bin/env node

/**
 * Error Handling Validation Script
 * 
 * This script validates that the centralized error handling system
 * is properly implemented and working correctly.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Error Handling Implementation...\n');

// Test 1: Check if error handling middleware files exist
console.log('1. Checking error handling middleware files...');

const backendErrorHandler = path.join(__dirname, '..', 'backend', 'middleware', 'errorHandler.js');
const dhlErrorHandler = path.join(__dirname, '..', 'dhl_login', 'middleware', 'errorHandler.js');

if (fs.existsSync(backendErrorHandler)) {
    console.log('   ✅ Backend error handler exists');
} else {
    console.log('   ❌ Backend error handler missing');
}

if (fs.existsSync(dhlErrorHandler)) {
    console.log('   ✅ DHL login error handler exists');
} else {
    console.log('   ❌ DHL login error handler missing');
}

// Test 2: Check if error classes can be imported
console.log('\n2. Testing error class imports...');

try {
    const backendErrors = require(backendErrorHandler);
    const requiredClasses = [
        'AppError', 'ValidationError', 'NotFoundError', 'AuthenticationError',
        'AuthorizationError', 'FileOperationError', 'EmailError', 'DatabaseError',
        'RateLimitError', 'globalErrorHandler', 'notFoundHandler', 'asyncHandler',
        'requestIdMiddleware', 'errorLogger'
    ];
    
    let allClassesPresent = true;
    requiredClasses.forEach(className => {
        if (backendErrors[className]) {
            console.log(`   ✅ ${className} available`);
        } else {
            console.log(`   ❌ ${className} missing`);
            allClassesPresent = false;
        }
    });
    
    if (allClassesPresent) {
        console.log('   ✅ All required error classes and middleware available');
    }
} catch (error) {
    console.log(`   ❌ Error importing backend error handler: ${error.message}`);
}

// Test 3: Test error class instantiation
console.log('\n3. Testing error class instantiation...');

try {
    const { 
        AppError, ValidationError, NotFoundError, AuthenticationError,
        DatabaseError, RateLimitError 
    } = require(backendErrorHandler);
    
    // Test AppError
    const appError = new AppError('Test error', 400, 'TEST_ERROR', { test: true });
    if (appError.statusCode === 400 && appError.code === 'TEST_ERROR') {
        console.log('   ✅ AppError instantiation works');
    } else {
        console.log('   ❌ AppError instantiation failed');
    }
    
    // Test ValidationError
    const validationError = new ValidationError('Invalid input');
    if (validationError.statusCode === 400 && validationError.code === 'VALIDATION_ERROR') {
        console.log('   ✅ ValidationError instantiation works');
    } else {
        console.log('   ❌ ValidationError instantiation failed');
    }
    
    // Test NotFoundError
    const notFoundError = new NotFoundError('User');
    if (notFoundError.statusCode === 404 && notFoundError.message === 'User not found') {
        console.log('   ✅ NotFoundError instantiation works');
    } else {
        console.log('   ❌ NotFoundError instantiation failed');
    }
    
    // Test AuthenticationError
    const authError = new AuthenticationError();
    if (authError.statusCode === 401 && authError.code === 'AUTHENTICATION_ERROR') {
        console.log('   ✅ AuthenticationError instantiation works');
    } else {
        console.log('   ❌ AuthenticationError instantiation failed');
    }
    
} catch (error) {
    console.log(`   ❌ Error testing class instantiation: ${error.message}`);
}

// Test 4: Check if request ID middleware works
console.log('\n4. Testing request ID middleware...');

try {
    const { requestIdMiddleware } = require(backendErrorHandler);
    
    const mockReq = {};
    const mockRes = {
        setHeader: function(name, value) {
            this.headers = this.headers || {};
            this.headers[name] = value;
        }
    };
    
    requestIdMiddleware(mockReq, mockRes, () => {});
    
    if (mockReq.requestId && mockRes.headers && mockRes.headers['X-Request-ID']) {
        console.log('   ✅ Request ID middleware works');
    } else {
        console.log('   ❌ Request ID middleware failed');
    }
} catch (error) {
    console.log(`   ❌ Error testing request ID middleware: ${error.message}`);
}

// Test 5: Check if async handler works
console.log('\n5. Testing async handler wrapper...');

try {
    const { asyncHandler } = require(backendErrorHandler);
    
    let errorCaught = false;
    const mockNext = (error) => {
        errorCaught = !!error;
    };
    
    const asyncFunction = async () => {
        throw new Error('Test async error');
    };
    
    const wrappedFunction = asyncHandler(asyncFunction);
    
    // This should catch the error and call next()
    wrappedFunction({}, {}, mockNext).then(() => {
        if (errorCaught) {
            console.log('   ✅ Async handler catches errors correctly');
        } else {
            console.log('   ❌ Async handler failed to catch error');
        }
    });
    
} catch (error) {
    console.log(`   ❌ Error testing async handler: ${error.message}`);
}

// Test 6: Check if health check routes exist
console.log('\n6. Checking health check routes...');

const backendHealthRoute = path.join(__dirname, '..', 'backend', 'routes', 'health.js');
const dhlHealthRoute = path.join(__dirname, '..', 'dhl_login', 'routes', 'health.js');

if (fs.existsSync(backendHealthRoute)) {
    console.log('   ✅ Backend health check route exists');
} else {
    console.log('   ❌ Backend health check route missing');
}

if (fs.existsSync(dhlHealthRoute)) {
    console.log('   ✅ DHL login health check route exists');
} else {
    console.log('   ❌ DHL login health check route missing');
}

// Test 7: Check if server files import error handling
console.log('\n7. Checking server integration...');

const backendServer = path.join(__dirname, '..', 'backend', 'server.js');
const dhlApp = path.join(__dirname, '..', 'dhl_login', 'app.js');

try {
    const backendServerContent = fs.readFileSync(backendServer, 'utf8');
    if (backendServerContent.includes('requestIdMiddleware') && 
        backendServerContent.includes('globalErrorHandler')) {
        console.log('   ✅ Backend server integrates error handling');
    } else {
        console.log('   ❌ Backend server missing error handling integration');
    }
} catch (error) {
    console.log(`   ❌ Error checking backend server: ${error.message}`);
}

try {
    const dhlAppContent = fs.readFileSync(dhlApp, 'utf8');
    if (dhlAppContent.includes('requestIdMiddleware') && 
        dhlAppContent.includes('globalErrorHandler')) {
        console.log('   ✅ DHL login app integrates error handling');
    } else {
        console.log('   ❌ DHL login app missing error handling integration');
    }
} catch (error) {
    console.log(`   ❌ Error checking DHL login app: ${error.message}`);
}

// Test 8: Check documentation
console.log('\n8. Checking documentation...');

const errorHandlingDoc = path.join(__dirname, '..', 'docs', 'ERROR_HANDLING.md');
if (fs.existsSync(errorHandlingDoc)) {
    console.log('   ✅ Error handling documentation exists');
} else {
    console.log('   ❌ Error handling documentation missing');
}

console.log('\n🎉 Error handling validation complete!');
console.log('\nNext steps:');
console.log('1. Start the backend server: cd backend && npm start');
console.log('2. Start the DHL login server: cd dhl_login && npm start');
console.log('3. Test health endpoints:');
console.log('   - http://localhost:3001/health');
console.log('   - http://localhost:3000/health');
console.log('4. Test error scenarios:');
console.log('   - http://localhost:3001/health/error-test/validation');
console.log('   - http://localhost:3000/health/error-test/auth');
