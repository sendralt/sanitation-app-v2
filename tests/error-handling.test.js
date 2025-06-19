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
    // These tests require the actual Express apps to be running
    // They test the end-to-end error handling behavior

    describe('Backend API Error Handling', () => {
        it('should return 404 for non-existent routes', async () => {
            // Mock Express app for testing
            const express = require('express');
            const app = express();

            // Add the error handling middleware
            app.use(globalErrorHandler);
            app.use(notFoundHandler);

            const response = await request(app)
                .get('/non-existent-route')
                .expect(404);

            expect(response.body).to.have.property('status', 'fail');
            expect(response.body).to.have.property('message');
            expect(response.body).to.have.property('code', 'NOT_FOUND');
        });

        it('should return 401 for unauthorized access', async () => {
            const express = require('express');
            const app = express();

            // Add a protected route that throws AuthenticationError
            app.get('/protected', (req, res, next) => {
                next(new AuthenticationError('Authentication required'));
            });

            app.use(globalErrorHandler);

            const response = await request(app)
                .get('/protected')
                .expect(401);

            expect(response.body).to.have.property('status', 'fail');
            expect(response.body).to.have.property('message', 'Authentication required');
            expect(response.body).to.have.property('code', 'AUTHENTICATION_ERROR');
        });

        it('should return 400 for validation errors', async () => {
            const express = require('express');
            const app = express();

            app.post('/validate', (req, res, next) => {
                next(new ValidationError('Invalid input data', { field: 'username' }));
            });

            app.use(globalErrorHandler);

            const response = await request(app)
                .post('/validate')
                .expect(400);

            expect(response.body).to.have.property('status', 'fail');
            expect(response.body).to.have.property('message', 'Invalid input data');
            expect(response.body).to.have.property('code', 'VALIDATION_ERROR');
            expect(response.body).to.have.property('details');
        });

        it('should return 500 for server errors', async () => {
            const express = require('express');
            const app = express();

            app.get('/error', (req, res, next) => {
                // Simulate an unexpected error
                throw new Error('Unexpected server error');
            });

            app.use(globalErrorHandler);

            const response = await request(app)
                .get('/error')
                .expect(500);

            expect(response.body).to.have.property('status', 'error');
            expect(response.body).to.have.property('message');
        });

        it('should include request ID in all error responses', async () => {
            const express = require('express');
            const app = express();

            app.use(requestIdMiddleware);

            app.get('/test-error', (req, res, next) => {
                next(new ValidationError('Test error'));
            });

            app.use(globalErrorHandler);

            const response = await request(app)
                .get('/test-error')
                .expect(400);

            expect(response.body).to.have.property('requestId');
            expect(response.body.requestId).to.be.a('string');
            expect(response.body.requestId).to.have.length.greaterThan(0);
        });
    });

    describe('DHL Login Error Handling', () => {
        it('should handle authentication errors appropriately', () => {
            // Test that authentication errors are handled correctly
            const error = new AuthenticationError('Invalid credentials');
            const req = { method: 'POST', originalUrl: '/login' };
            const res = {
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(data) {
                    this.responseData = data;
                },
                redirect: function(url) {
                    this.redirectUrl = url;
                }
            };
            const next = () => {};

            globalErrorHandler(error, req, res, next);

            expect(res.statusCode).to.equal(401);
            expect(res.responseData).to.have.property('status', 'fail');
            expect(res.responseData).to.have.property('message', 'Invalid credentials');
        });

        it('should handle validation errors with proper formatting', () => {
            const error = new ValidationError('Form validation failed', {
                username: 'Username is required',
                password: 'Password must be at least 8 characters'
            });
            const req = { method: 'POST', originalUrl: '/register' };
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
            expect(res.responseData).to.have.property('status', 'fail');
            expect(res.responseData).to.have.property('details');
            expect(res.responseData.details).to.have.property('username');
            expect(res.responseData.details).to.have.property('password');
        });

        it('should handle database errors gracefully', () => {
            const error = new DatabaseError('Connection failed', 'DB_CONNECTION_ERROR');
            const req = { method: 'GET', originalUrl: '/users' };
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

            expect(res.statusCode).to.equal(500);
            expect(res.responseData).to.have.property('status', 'error');
            expect(res.responseData).to.have.property('code', 'DB_CONNECTION_ERROR');
        });

        it('should handle rate limit errors correctly', () => {
            const error = new RateLimitError('Too many requests');
            const req = { method: 'POST', originalUrl: '/api/login' };
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

            expect(res.statusCode).to.equal(429);
            expect(res.responseData).to.have.property('status', 'fail');
            expect(res.responseData).to.have.property('message', 'Too many requests');
            expect(res.responseData).to.have.property('code', 'RATE_LIMIT_ERROR');
        });
    });
});
