/**
 * Security Headers Middleware for DHL Login Service
 * 
 * Implements security headers to protect against common attacks
 */

const helmet = require('helmet');

/**
 * Configure security headers for web application
 */
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for EJS templates
            scriptSrc: ["'self'", "'unsafe-inline'", "https://code.jquery.com"], // Allow jQuery CDN
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://localhost:3001", "https://dot1hundred.com"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            formAction: ["'self'"], // Only allow forms to submit to same origin
        },
    },
    crossOriginEmbedderPolicy: false, // Disable for compatibility
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    }
});

/**
 * Additional security middleware
 */
const additionalSecurity = (req, res, next) => {
    // Remove server information
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add cache control for sensitive pages
    if (req.path.includes('/admin') || 
        req.path.includes('/login') || 
        req.path.includes('/forgot-password') ||
        req.path.includes('/api/auth')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    
    next();
};

/**
 * CSRF protection middleware
 */
const csrfProtection = (req, res, next) => {
    // Add CSRF token to all form responses
    if (req.method === 'GET' && res.render) {
        const originalRender = res.render;
        res.render = function(view, options = {}) {
            if (req.csrfToken) {
                options._csrf = req.csrfToken();
            }
            return originalRender.call(this, view, options);
        };
    }
    next();
};

module.exports = {
    securityHeaders,
    additionalSecurity,
    csrfProtection
};
