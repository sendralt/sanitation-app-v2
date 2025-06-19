/**
 * Unit Tests for Backend Middleware
 */

const request = require('supertest');
const express = require('express');
const {
    AppError,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    globalErrorHandler,
    notFoundHandler,
    requestIdMiddleware
} = require('../../middleware/errorHandler');

describe('Backend Middleware Tests', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use(requestIdMiddleware);
    });

    describe('Request ID Middleware', () => {
        it('should add request ID to all requests', async () => {
            app.get('/test', (req, res) => {
                res.json({ requestId: req.requestId });
            });

            const response = await request(app)
                .get('/test')
                .expect(200);

            expect(response.body.requestId).toBeDefined();
            expect(typeof response.body.requestId).toBe('string');
            expect(response.body.requestId.length).toBeGreaterThan(0);
        });

        it('should generate unique request IDs', async () => {
            app.get('/test', (req, res) => {
                res.json({ requestId: req.requestId });
            });

            const response1 = await request(app).get('/test');
            const response2 = await request(app).get('/test');

            expect(response1.body.requestId).not.toBe(response2.body.requestId);
        });
    });

    describe('Error Handler Middleware', () => {
        beforeEach(() => {
            app.use(globalErrorHandler);
        });

        it('should handle ValidationError correctly', async () => {
            app.get('/validation-error', (req, res, next) => {
                next(new ValidationError('Invalid input', { field: 'username' }));
            });

            const response = await request(app)
                .get('/validation-error')
                .expect(400);

            expect(response.body.status).toBe('fail');
            expect(response.body.message).toBe('Invalid input');
            expect(response.body.code).toBe('VALIDATION_ERROR');
            expect(response.body.details).toEqual({ field: 'username' });
        });

        it('should handle AuthenticationError correctly', async () => {
            app.get('/auth-error', (req, res, next) => {
                next(new AuthenticationError('Invalid credentials'));
            });

            const response = await request(app)
                .get('/auth-error')
                .expect(401);

            expect(response.body.status).toBe('fail');
            expect(response.body.message).toBe('Invalid credentials');
            expect(response.body.code).toBe('AUTHENTICATION_ERROR');
        });

        it('should handle generic errors', async () => {
            app.get('/generic-error', (req, res, next) => {
                next(new Error('Something went wrong'));
            });

            const response = await request(app)
                .get('/generic-error')
                .expect(500);

            expect(response.body.status).toBe('error');
            expect(response.body.message).toBeDefined();
        });

        it('should include request ID in error responses', async () => {
            app.get('/error-with-id', (req, res, next) => {
                next(new ValidationError('Test error'));
            });

            const response = await request(app)
                .get('/error-with-id')
                .expect(400);

            expect(response.body.requestId).toBeDefined();
            expect(typeof response.body.requestId).toBe('string');
        });
    });

    describe('Not Found Handler', () => {
        beforeEach(() => {
            app.use(notFoundHandler);
            app.use(globalErrorHandler);
        });

        it('should handle 404 errors', async () => {
            const response = await request(app)
                .get('/non-existent-route')
                .expect(404);

            expect(response.body.status).toBe('fail');
            expect(response.body.message).toContain('not found');
            expect(response.body.code).toBe('NOT_FOUND');
        });
    });

    describe('Custom Error Classes', () => {
        it('should create AppError with correct properties', () => {
            const error = new AppError('Test message', 400, 'TEST_CODE', { detail: 'test' });

            expect(error.message).toBe('Test message');
            expect(error.statusCode).toBe(400);
            expect(error.status).toBe('fail');
            expect(error.code).toBe('TEST_CODE');
            expect(error.details).toEqual({ detail: 'test' });
            expect(error.isOperational).toBe(true);
            expect(error.timestamp).toBeDefined();
        });

        it('should create ValidationError with default properties', () => {
            const error = new ValidationError('Validation failed');

            expect(error.message).toBe('Validation failed');
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.isOperational).toBe(true);
        });

        it('should create NotFoundError with default properties', () => {
            const error = new NotFoundError('Resource not found');

            expect(error.message).toBe('Resource not found');
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe('NOT_FOUND');
            expect(error.isOperational).toBe(true);
        });

        it('should create AuthenticationError with default properties', () => {
            const error = new AuthenticationError('Authentication failed');

            expect(error.message).toBe('Authentication failed');
            expect(error.statusCode).toBe(401);
            expect(error.code).toBe('AUTHENTICATION_ERROR');
            expect(error.isOperational).toBe(true);
        });
    });
});
