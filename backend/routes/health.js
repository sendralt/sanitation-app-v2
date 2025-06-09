/**
 * Health Check Routes
 * 
 * Provides endpoints for monitoring application health,
 * including error handling system status.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { asyncHandler, errorLogger } = require('../middleware/errorHandler');

/**
 * Basic health check endpoint
 */
router.get('/health', asyncHandler(async (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'backend-api',
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
    const dataDir = path.join(__dirname, '..', 'data');
    const logsDir = path.join(__dirname, '..', 'logs');
    
    // Check data directory
    const dataDirectoryExists = fs.existsSync(dataDir);
    let dataDirectoryWritable = false;
    if (dataDirectoryExists) {
        try {
            const testFile = path.join(dataDir, 'health-check-test.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            dataDirectoryWritable = true;
        } catch (error) {
            // Directory not writable
        }
    }

    // Check logs directory
    const logsDirectoryExists = fs.existsSync(logsDir);
    let logsDirectoryWritable = false;
    if (logsDirectoryExists) {
        try {
            const testFile = path.join(logsDir, 'health-check-test.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            logsDirectoryWritable = true;
        } catch (error) {
            // Directory not writable
        }
    }

    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'backend-api',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        requestId: req.requestId,
        checks: {
            dataDirectory: {
                exists: dataDirectoryExists,
                writable: dataDirectoryWritable,
                path: dataDir
            },
            logsDirectory: {
                exists: logsDirectoryExists,
                writable: logsDirectoryWritable,
                path: logsDir
            },
            errorHandling: {
                middlewareLoaded: true,
                loggerActive: !!errorLogger
            }
        }
    };

    // Determine overall health status
    const allChecksHealthy = dataDirectoryExists && dataDirectoryWritable && 
                            logsDirectoryExists && logsDirectoryWritable;
    
    if (!allChecksHealthy) {
        healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
}));

/**
 * Error handling test endpoint
 * Allows testing different error scenarios
 */
router.get('/health/error-test/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;
    
    switch (type) {
        case 'validation':
            const { ValidationError } = require('../middleware/errorHandler');
            throw new ValidationError('Test validation error for health check');
            
        case 'notfound':
            const { NotFoundError } = require('../middleware/errorHandler');
            throw new NotFoundError('Test resource');
            
        case 'auth':
            const { AuthenticationError } = require('../middleware/errorHandler');
            throw new AuthenticationError('Test authentication error');
            
        case 'file':
            const { FileOperationError } = require('../middleware/errorHandler');
            throw new FileOperationError('read', 'test-file.txt', new Error('File not found'));
            
        case 'database':
            const { DatabaseError } = require('../middleware/errorHandler');
            throw new DatabaseError('connection', { originalError: 'Connection refused' });
            
        case 'generic':
            throw new Error('Generic test error for health check');
            
        default:
            res.status(400).json({
                error: 'Invalid error type',
                validTypes: ['validation', 'notfound', 'auth', 'file', 'database', 'generic'],
                requestId: req.requestId
            });
    }
}));

/**
 * Error statistics endpoint
 * Returns basic error logging statistics
 */
router.get('/health/error-stats', asyncHandler(async (req, res) => {
    const logsDir = path.join(__dirname, '..', 'logs');
    const stats = {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        errorLogs: {
            directory: logsDir,
            exists: fs.existsSync(logsDir),
            files: []
        }
    };

    if (stats.errorLogs.exists) {
        try {
            const files = fs.readdirSync(logsDir);
            const errorLogFiles = files.filter(file => file.startsWith('error-') && file.endsWith('.log'));
            
            stats.errorLogs.files = errorLogFiles.map(file => {
                const filePath = path.join(logsDir, file);
                const fileStat = fs.statSync(filePath);
                return {
                    name: file,
                    size: fileStat.size,
                    modified: fileStat.mtime,
                    created: fileStat.birthtime
                };
            });
        } catch (error) {
            stats.errorLogs.error = 'Unable to read logs directory';
        }
    }

    res.status(200).json(stats);
}));

/**
 * Readiness probe endpoint
 * Checks if the service is ready to handle requests
 */
router.get('/ready', asyncHandler(async (req, res) => {
    // Check if essential directories exist
    const dataDir = path.join(__dirname, '..', 'data');
    const logsDir = path.join(__dirname, '..', 'logs');
    
    const isReady = fs.existsSync(dataDir) && fs.existsSync(logsDir);
    
    const readinessStatus = {
        ready: isReady,
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
        checks: {
            dataDirectory: fs.existsSync(dataDir),
            logsDirectory: fs.existsSync(logsDir)
        }
    };

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json(readinessStatus);
}));

/**
 * Liveness probe endpoint
 * Simple endpoint to check if the service is alive
 */
router.get('/live', (req, res) => {
    res.status(200).json({
        alive: true,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
    });
});

module.exports = router;
