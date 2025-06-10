/**
 * Centralized Error Handling Middleware for DHL Login Service
 * 
 * This module provides comprehensive error handling including:
 * - Custom error classes
 * - Error logging
 * - Web page error handling (redirects with flash messages)
 * - API error responses
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

class DatabaseError extends AppError {
    constructor(operation, details = null) {
        super(`Database operation failed: ${operation}`, 500, 'DATABASE_ERROR', details);
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
                session: req.session ? { id: req.sessionID } : null,
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
        delete sanitized.passwordHash;
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
 * Determine if request expects JSON response
 */
const expectsJson = (req) => {
    return req.xhr || 
           req.headers.accept?.includes('application/json') ||
           req.path.startsWith('/api/') ||
           req.headers['content-type']?.includes('application/json');
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
    if (err.name === 'SequelizeValidationError') {
        const details = err.errors.map(e => ({ field: e.path, message: e.message }));
        error = new ValidationError('Validation failed', details);
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        error = new ValidationError('Resource already exists');
    }

    if (err.name === 'SequelizeDatabaseError') {
        error = new DatabaseError('query execution', { originalError: err.message });
    }

    if (err.name === 'JsonWebTokenError') {
        error = new AuthenticationError('Invalid token');
    }

    if (err.name === 'TokenExpiredError') {
        error = new AuthenticationError('Token expired');
    }

    // Send appropriate response
    if (expectsJson(req)) {
        sendJsonErrorResponse(error, req, res);
    } else {
        sendWebErrorResponse(error, req, res);
    }
};

/**
 * Send JSON Error Response (for API endpoints)
 */
const sendJsonErrorResponse = (err, req, res) => {
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

    res.status(statusCode).json(errorResponse);
};

/**
 * Send Web Error Response (for web pages)
 */
const sendWebErrorResponse = (err, req, res) => {
    const statusCode = err.statusCode || 500;
    
    // Set flash message for user feedback
    if (req.flash) {
        const userMessage = err.isOperational ? err.message : 'An unexpected error occurred. Please try again.';
        req.flash('error', userMessage);
    }

    // Handle different status codes
    switch (statusCode) {
        case 401:
            // Redirect to login for authentication errors
            return res.redirect('/login-page');
            
        case 403:
            // Render access denied page or redirect to dashboard
            return res.status(403).render('error', {
                title: 'Access Denied',
                message: 'You do not have permission to access this resource.',
                statusCode: 403
            });
            
        case 404:
            // Render 404 page
            return res.status(404).render('error', {
                title: 'Page Not Found',
                message: 'The page you are looking for could not be found.',
                statusCode: 404
            });
            
        default:
            // For 500 errors, redirect to a safe page with error message
            if (statusCode >= 500) {
                return res.redirect('/dashboard');
            } else {
                // For other 4xx errors, redirect back or to dashboard
                const redirectUrl = req.get('Referer') || '/dashboard';
                return res.redirect(redirectUrl);
            }
    }
};

/**
 * 404 Handler for Web Pages
 */
const notFoundHandler = (req, res, next) => {
    if (expectsJson(req)) {
        const error = new AppError(`API endpoint ${req.originalUrl} not found`, 404, 'NOT_FOUND');
        return next(error);
    } else {
        return res.status(404).render('error', {
            title: 'Page Not Found',
            message: 'The page you are looking for could not be found.',
            statusCode: 404
        });
    }
};

/**
 * Request ID Middleware (for tracking requests)
 */
const requestIdMiddleware = (req, res, next) => {
    req.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    res.setHeader('X-Request-ID', req.requestId);
    next();
};

module.exports = {
    // Error Classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    DatabaseError,
    
    // Middleware
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    requestIdMiddleware,
    
    // Utilities
    expectsJson,
    
    // Logger
    errorLogger
};
