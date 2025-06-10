/**
 * Health Check Routes for DHL Login Service
 * 
 * Provides endpoints for monitoring application health,
 * including error handling system status and database connectivity.
 */

const express = require('express');
const router = express.Router();
const { asyncHandler, errorLogger } = require('../middleware/errorHandler');
const User = require('../models/user');

/**
 * Basic health check endpoint
 */
router.get('/health', asyncHandler(async (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'dhl-login',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        requestId: req.requestId
    };

    res.status(200).json(healthStatus);
}));

/**
 * Detailed health check with system information
 */
router.get('/health/detailed', asyncHandler(async (req, res) => {
    let databaseHealthy = false;
    let databaseError = null;
    
    // Test database connectivity
    try {
        await User.findOne({ limit: 1 });
        databaseHealthy = true;
    } catch (error) {
        databaseError = error.message;
    }

    // Check session configuration
    const sessionConfigured = !!process.env.SESSION_SECRET;
    
    // Check JWT configuration
    const jwtConfigured = !!process.env.JWT_SECRET;

    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'dhl-login',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        requestId: req.requestId,
        checks: {
            database: {
                healthy: databaseHealthy,
                error: databaseError
            },
            session: {
                configured: sessionConfigured
            },
            jwt: {
                configured: jwtConfigured
            },
            errorHandling: {
                middlewareLoaded: true,
                loggerActive: !!errorLogger
            }
        }
    };

    // Determine overall health status
    const allChecksHealthy = databaseHealthy && sessionConfigured && jwtConfigured;
    
    if (!allChecksHealthy) {
        healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
}));

/**
 * Database connectivity test endpoint
 */
router.get('/health/database', asyncHandler(async (req, res) => {
    let status = 'healthy';
    let error = null;
    let userCount = 0;
    
    try {
        // Test basic database connectivity
        const result = await User.findAndCountAll({ limit: 1 });
        userCount = result.count;
    } catch (err) {
        status = 'unhealthy';
        error = err.message;
    }

    const dbStatus = {
        status,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        database: {
            connected: status === 'healthy',
            userCount,
            error
        }
    };

    const statusCode = status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(dbStatus);
}));

/**
 * Error handling test endpoint
 * Allows testing different error scenarios for web and API requests
 */
router.get('/health/error-test/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;
    
    switch (type) {
        case 'validation':
            const { ValidationError } = require('../middleware/errorHandler');
            throw new ValidationError('Test validation error for health check');
            
        case 'auth':
            const { AuthenticationError } = require('../middleware/errorHandler');
            throw new AuthenticationError('Test authentication error');
            
        case 'database':
            const { DatabaseError } = require('../middleware/errorHandler');
            throw new DatabaseError('query execution', { originalError: 'Test database error' });
            
        case 'generic':
            throw new Error('Generic test error for health check');
            
        default:
            res.status(400).json({
                error: 'Invalid error type',
                validTypes: ['validation', 'auth', 'database', 'generic'],
                requestId: req.requestId
            });
    }
}));

/**
 * Authentication system test endpoint
 */
router.get('/health/auth-test', asyncHandler(async (req, res) => {
    const { generateToken, hashPassword, comparePassword } = require('../utils/auth');
    
    let authSystemHealthy = true;
    const testResults = {};
    
    try {
        // Test password hashing
        const testPassword = 'test-password-123';
        const hashedPassword = await hashPassword(testPassword);
        const passwordMatch = await comparePassword(testPassword, hashedPassword);
        
        testResults.passwordHashing = {
            success: passwordMatch,
            error: passwordMatch ? null : 'Password comparison failed'
        };
        
        if (!passwordMatch) {
            authSystemHealthy = false;
        }
    } catch (error) {
        testResults.passwordHashing = {
            success: false,
            error: error.message
        };
        authSystemHealthy = false;
    }
    
    try {
        // Test JWT token generation
        const testUser = { id: 999, username: 'test-user' };
        const token = generateToken(testUser);
        
        testResults.jwtGeneration = {
            success: !!token,
            error: token ? null : 'Token generation failed'
        };
        
        if (!token) {
            authSystemHealthy = false;
        }
    } catch (error) {
        testResults.jwtGeneration = {
            success: false,
            error: error.message
        };
        authSystemHealthy = false;
    }

    const authStatus = {
        status: authSystemHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        authSystem: {
            healthy: authSystemHealthy,
            tests: testResults
        }
    };

    const statusCode = authSystemHealthy ? 200 : 503;
    res.status(statusCode).json(authStatus);
}));

/**
 * Readiness probe endpoint
 */
router.get('/ready', asyncHandler(async (req, res) => {
    let isReady = true;
    const checks = {};
    
    // Check database connectivity
    try {
        await User.findOne({ limit: 1 });
        checks.database = true;
    } catch (error) {
        checks.database = false;
        isReady = false;
    }
    
    // Check essential environment variables
    checks.sessionSecret = !!process.env.SESSION_SECRET;
    checks.jwtSecret = !!process.env.JWT_SECRET;
    
    if (!checks.sessionSecret || !checks.jwtSecret) {
        isReady = false;
    }
    
    const readinessStatus = {
        ready: isReady,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        checks
    };

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json(readinessStatus);
}));

/**
 * Liveness probe endpoint
 */
router.get('/live', (req, res) => {
    res.status(200).json({
        alive: true,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
    });
});

module.exports = router;
