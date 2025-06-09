/**
 * Centralized Error Handling Middleware for Backend Service
 * 
 * This module provides comprehensive error handling including:
 * - Custom error classes
 * - Error logging
 * - Standardized error responses
 * - Development vs production error details
 */

const fs = require('fs');
const path = require('path');

/**
 * Custom Error Classes
 */
class AppError extends Error {
    constructor(message, statusCode, code = null, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, 400, 'VALIDATION_ERROR', details);
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class FileOperationError extends AppError {
    constructor(operation, filename, originalError = null) {
        super(`Failed to ${operation} file: ${filename}`, 500, 'FILE_OPERATION_ERROR', {
            operation,
            filename,
            originalError: originalError?.message
        });
    }
}

class EmailError extends AppError {
    constructor(message = 'Failed to send email', details = null) {
        super(message, 500, 'EMAIL_ERROR', details);
    }
}

class DatabaseError extends AppError {
    constructor(operation, details = null) {
        super(`Database ${operation} operation failed`, 500, 'DATABASE_ERROR', details);
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

/**
 * Error Logger
 */
class ErrorLogger {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    log(error, req = null, additionalInfo = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            error: {
                message: error.message,
                stack: error.stack,
                statusCode: error.statusCode,
                code: error.code,
                details: error.details
            },
            request: req ? {
                method: req.method,
                url: req.url,
                headers: this.sanitizeHeaders(req.headers),
                body: this.sanitizeBody(req.body),
                user: req.user ? { id: req.user.id, username: req.user.username } : null,
                ip: req.ip || req.connection?.remoteAddress
            } : null,
            additionalInfo,
            environment: process.env.NODE_ENV || 'development'
        };

        // Log to console
        console.error('[ERROR]', JSON.stringify(logEntry, null, 2));

        // Log to file in production
        if (process.env.NODE_ENV === 'production') {
            const logFile = path.join(this.logDir, `error-${new Date().toISOString().split('T')[0]}.log`);
            fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        }
    }

    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        delete sanitized.authorization;
        delete sanitized.cookie;
        return sanitized;
    }

    sanitizeBody(body) {
        if (!body) return null;
        const sanitized = { ...body };
        delete sanitized.password;
        delete sanitized.token;
        return sanitized;
    }
}

const errorLogger = new ErrorLogger();

/**
 * Async Error Handler Wrapper
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Global Error Handler Middleware
 */
const globalErrorHandler = (err, req, res, next) => {
    // Log the error
    errorLogger.log(err, req);

    // Set default error values
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.name === 'CastError') {
        error = new ValidationError('Invalid ID format');
    }

    if (err.code === 'ENOENT') {
        error = new FileOperationError('read', err.path || 'unknown file', err);
    }

    if (err.name === 'JsonWebTokenError') {
        error = new AuthenticationError('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = new AuthenticationError('Token expired');
    }

    if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
        error = new ValidationError('Invalid JSON format in request body');
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        error = new ValidationError('File size too large');
    }

    if (err.code === 'ECONNREFUSED') {
        error = new DatabaseError('connection', { originalError: err.message });
    }

    // Send error response
    sendErrorResponse(error, req, res);
};

/**
 * Send Error Response
 */
const sendErrorResponse = (err, req, res) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Ensure we have a status code
    const statusCode = err.statusCode || 500;
    
    // Base error response
    const errorResponse = {
        status: err.status || 'error',
        message: err.message || 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    };

    // Add error code if available
    if (err.code) {
        errorResponse.code = err.code;
    }

    // Add details in development or for operational errors
    if (isDevelopment || err.isOperational) {
        if (err.details) {
            errorResponse.details = err.details;
        }
    }

    // Add stack trace in development
    if (isDevelopment) {
        errorResponse.stack = err.stack;
    }

    // Add request ID if available
    if (req.requestId) {
        errorResponse.requestId = req.requestId;
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * Request ID Middleware (for tracking requests)
 */
const requestIdMiddleware = (req, res, next) => {
    req.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    res.setHeader('X-Request-ID', req.requestId);
    next();
};

/**
 * 404 Handler
 */
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl}`);
    next(error);
};

module.exports = {
    // Error Classes
    AppError,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    AuthorizationError,
    FileOperationError,
    EmailError,
    DatabaseError,
    RateLimitError,

    // Middleware
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    requestIdMiddleware,

    // Logger
    errorLogger
};
