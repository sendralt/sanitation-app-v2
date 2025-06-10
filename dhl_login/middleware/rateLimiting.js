/**
 * Rate Limiting Configuration for DHL Login Service
 * 
 * Implements rate limiting to prevent abuse and brute force attacks
 */

const rateLimit = require('express-rate-limit');

/**
 * General web page rate limiting
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Higher limit for web pages
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Strict rate limiting for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
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
    max: 100, // Limit each IP to 100 API requests per windowMs
    message: {
        error: 'Too many API requests, please slow down.',
        retryAfter: '15 minutes'
    },
});

module.exports = {
    generalLimiter,
    authLimiter,
    passwordResetLimiter,
    registrationLimiter,
    apiLimiter
};
