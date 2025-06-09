/**
 * Comprehensive Error Handling Tests
 * 
 * Tests the centralized error handling middleware implementation
 * across both backend and dhl_login services.
 */

const request = require('supertest');
const { expect } = require('chai');

// Import error handling middleware for unit testing
const {
    AppError,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    AuthorizationError,
    FileOperationError,
    EmailError,
    DatabaseError,
    RateLimitError,
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    requestIdMiddleware,
    errorLogger
} = require('../backend/middleware/errorHandler');

describe('Error Handling Middleware', () => {
    describe('Custom Error Classes', () => {
        it('should create AppError with correct properties', () => {
            const error = new AppError('Test error', 400, 'TEST_ERROR', { detail: 'test' });
            
            expect(error.message).to.equal('Test error');
            expect(error.statusCode).to.equal(400);
            expect(error.status).to.equal('fail');
            expect(error.code).to.equal('TEST_ERROR');
            expect(error.details).to.deep.equal({ detail: 'test' });
            expect(error.isOperational).to.be.true;
            expect(error.timestamp).to.be.a('string');
        });

        it('should create ValidationError with 400 status', () => {
            const error = new ValidationError('Invalid input');
            
            expect(error.statusCode).to.equal(400);
            expect(error.code).to.equal('VALIDATION_ERROR');
            expect(error.status).to.equal('fail');
        });

        it('should create NotFoundError with 404 status', () => {
            const error = new NotFoundError('User');
            
            expect(error.message).to.equal('User not found');
            expect(error.statusCode).to.equal(404);
            expect(error.code).to.equal('NOT_FOUND');
        });

        it('should create AuthenticationError with 401 status', () => {
            const error = new AuthenticationError();
            
            expect(error.statusCode).to.equal(401);
            expect(error.code).to.equal('AUTHENTICATION_ERROR');
        });

        it('should create DatabaseError with 500 status', () => {
            const error = new DatabaseError('connection');
            
            expect(error.message).to.equal('Database connection operation failed');
            expect(error.statusCode).to.equal(500);
            expect(error.code).to.equal('DATABASE_ERROR');
        });

        it('should create RateLimitError with 429 status', () => {
            const error = new RateLimitError();
            
            expect(error.statusCode).to.equal(429);
            expect(error.code).to.equal('RATE_LIMIT_ERROR');
        });
    });

    describe('Request ID Middleware', () => {
        it('should add request ID to request and response headers', () => {
            const req = {};
            const res = {
                setHeader: function(name, value) {
                    this.headers = this.headers || {};
                    this.headers[name] = value;
                }
            };
            const next = () => {};

            requestIdMiddleware(req, res, next);

            expect(req.requestId).to.be.a('string');
            expect(req.requestId.length).to.be.greaterThan(0);
            expect(res.headers['X-Request-ID']).to.equal(req.requestId);
        });
    });

    describe('Async Handler Wrapper', () => {
        it('should catch async errors and pass to next', async () => {
            let caughtError = null;
            const next = (error) => { caughtError = error; };
            
            const asyncFunction = async () => {
                throw new Error('Async error');
            };
            
            const wrappedFunction = asyncHandler(asyncFunction);
            await wrappedFunction({}, {}, next);
            
            expect(caughtError).to.be.an('error');
            expect(caughtError.message).to.equal('Async error');
        });

        it('should handle successful async operations', async () => {
            let nextCalled = false;
            const next = () => { nextCalled = true; };
            
            const asyncFunction = async (req, res) => {
                res.status(200).json({ success: true });
            };
            
            const mockRes = {
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    this.data = data;
                }
            };
            
            const wrappedFunction = asyncHandler(asyncFunction);
            await wrappedFunction({}, mockRes, next);
            
            expect(nextCalled).to.be.false;
            expect(mockRes.statusCode).to.equal(200);
            expect(mockRes.data).to.deep.equal({ success: true });
        });
    });

    describe('Global Error Handler', () => {
        it('should handle ValidationError correctly', () => {
            const error = new ValidationError('Invalid data');
            const req = { method: 'POST', originalUrl: '/test' };
            const res = {
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    this.responseData = data;
                }
            };
            const next = () => {};

            globalErrorHandler(error, req, res, next);

            expect(res.statusCode).to.equal(400);
            expect(res.responseData.status).to.equal('fail');
            expect(res.responseData.message).to.equal('Invalid data');
            expect(res.responseData.code).to.equal('VALIDATION_ERROR');
        });

        it('should handle JWT errors correctly', () => {
            const error = new Error('Invalid token');
            error.name = 'JsonWebTokenError';
            
            const req = { method: 'GET', originalUrl: '/protected' };
            const res = {
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    this.responseData = data;
                }
            };
            const next = () => {};

            globalErrorHandler(error, req, res, next);

            expect(res.statusCode).to.equal(401);
            expect(res.responseData.code).to.equal('AUTHENTICATION_ERROR');
        });

        it('should include request ID in error response', () => {
            const error = new ValidationError('Test error');
            const req = { 
                method: 'POST', 
                originalUrl: '/test',
                requestId: 'test-request-id-123'
            };
            const res = {
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    this.responseData = data;
                }
            };
            const next = () => {};

            globalErrorHandler(error, req, res, next);

            expect(res.responseData.requestId).to.equal('test-request-id-123');
        });
    });

    describe('Error Logger', () => {
        it('should log errors with proper structure', () => {
            const originalConsoleError = console.error;
            let loggedData = null;
            
            console.error = (prefix, data) => {
                if (prefix === '[ERROR]') {
                    loggedData = JSON.parse(data);
                }
            };

            const error = new ValidationError('Test validation error');
            const req = {
                method: 'POST',
                url: '/test',
                headers: { 'content-type': 'application/json' },
                body: { test: 'data' },
                user: { id: 1, username: 'testuser' },
                ip: '127.0.0.1'
            };

            errorLogger.log(error, req);

            expect(loggedData).to.not.be.null;
            expect(loggedData.error.message).to.equal('Test validation error');
            expect(loggedData.request.method).to.equal('POST');
            expect(loggedData.request.user.username).to.equal('testuser');
            expect(loggedData.timestamp).to.be.a('string');

            console.error = originalConsoleError;
        });
    });
});

describe('Error Handling Integration Tests', () => {
    // These tests would require the actual Express apps to be running
    // They test the end-to-end error handling behavior
    
    describe('Backend API Error Handling', () => {
        it('should return 404 for non-existent routes');
        it('should return 401 for unauthorized access');
        it('should return 400 for validation errors');
        it('should return 500 for server errors');
        it('should include request ID in all error responses');
    });

    describe('DHL Login Error Handling', () => {
        it('should redirect to login for authentication errors');
        it('should render error pages for web requests');
        it('should return JSON for API requests');
        it('should handle database errors gracefully');
    });
});
