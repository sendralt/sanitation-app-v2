/**
 * Rate Limiting Configuration for DHL Login Service
 * 
 * Implements rate limiting to prevent abuse and brute force attacks
 */

const rateLimit = require('express-rate-limit');

/**
 * General web page rate limiting
 * More lenient limits for development and normal usage
 */
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: process.env.DISABLE_RATE_LIMITING === 'true' ? 999999 :
         (process.env.NODE_ENV === 'development' ? 1000 :
          parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200),
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip rate limiting for certain paths that should be unrestricted
    skip: (req) => {
        // Skip rate limiting for health checks and static assets
        const skipPaths = ['/health', '/favicon.ico', '/css/', '/js/', '/images/'];
        return skipPaths.some(path => req.path.startsWith(path));
    }
});

/**
 * Rate limiting for authentication endpoints
 * More reasonable limits while maintaining security
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.DISABLE_RATE_LIMITING === 'true' ? 999999 :
         (process.env.NODE_ENV === 'development' ? 50 :
          parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 10),
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Very strict rate limiting for password reset
 */
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset attempts per hour
    message: {
        error: 'Too many password reset attempts, please try again later.',
        retryAfter: '1 hour'
    },
});

/**
 * Rate limiting for user registration
 */
const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 registration attempts per hour
    message: {
        error: 'Too many registration attempts, please try again later.',
        retryAfter: '1 hour'
    },
});

/**
 * Rate limiting for API endpoints
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 2000 :
         parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        error: 'Too many API requests, please slow down.',
        retryAfter: '15 minutes'
    },
});

/**
 * More lenient rate limiting for authenticated API endpoints
 */
const authenticatedApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 5000 :
         parseInt(process.env.AUTHENTICATED_API_RATE_LIMIT_MAX_REQUESTS) || 500,
    message: {
        error: 'Too many authenticated API requests, please slow down.',
        retryAfter: '15 minutes'
    },
});

module.exports = {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
    registrationLimiter,
    apiLimiter,
    authenticatedApiLimiter
};
