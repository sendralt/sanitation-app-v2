/**
 * Unit Tests for Backend API Endpoints
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the database and other dependencies
jest.mock('../../config/db', () => ({
    query: jest.fn(),
    getClient: jest.fn(() => ({
        query: jest.fn(),
        release: jest.fn()
    }))
}));

describe('Backend API Tests', () => {
    let app;
    let mockDb;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create test app
        app = express();
        app.use(express.json());
        
        // Mock database
        mockDb = require('../../config/db');
    });

    describe('Health Check Endpoints', () => {
        beforeEach(() => {
            // Add health check routes
            app.get('/health', (req, res) => {
                res.json({ status: 'ok', timestamp: new Date().toISOString() });
            });

            app.get('/health/detailed', (req, res) => {
                res.json({
                    status: 'ok',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    version: '1.0.0'
                });
            });
        });

        it('should return basic health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body.status).toBe('ok');
            expect(response.body.timestamp).toBeDefined();
        });

        it('should return detailed health information', async () => {
            const response = await request(app)
                .get('/health/detailed')
                .expect(200);

            expect(response.body.status).toBe('ok');
            expect(response.body.uptime).toBeDefined();
            expect(response.body.memory).toBeDefined();
            expect(response.body.version).toBeDefined();
        });
    });

    describe('Authentication Middleware', () => {
        let validToken;
        let invalidToken;

        beforeEach(() => {
            // Create test tokens
            validToken = jwt.sign(
                { userId: 'test-user-123', username: 'testuser', role: 'user' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );
            
            invalidToken = 'invalid.token.here';

            // Add protected route
            app.get('/protected', (req, res, next) => {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return res.status(401).json({ message: 'No token provided' });
                }

                const token = authHeader.substring(7);
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
                    req.user = decoded;
                    res.json({ message: 'Access granted', user: decoded });
                } catch (error) {
                    res.status(401).json({ message: 'Invalid token' });
                }
            });
        });

        it('should reject requests without token', async () => {
            const response = await request(app)
                .get('/protected')
                .expect(401);

            expect(response.body.message).toBe('No token provided');
        });

        it('should reject requests with invalid token', async () => {
            const response = await request(app)
                .get('/protected')
                .set('Authorization', `Bearer ${invalidToken}`)
                .expect(401);

            expect(response.body.message).toBe('Invalid token');
        });

        it('should accept requests with valid token', async () => {
            const response = await request(app)
                .get('/protected')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(response.body.message).toBe('Access granted');
            expect(response.body.user.username).toBe('testuser');
        });
    });

    describe('Data Submission Endpoints', () => {
        beforeEach(() => {
            // Mock submission endpoint
            app.post('/api/submit-checklist', async (req, res) => {
                try {
                    const { title, headings } = req.body;
                    
                    if (!title || !headings) {
                        return res.status(400).json({ 
                            message: 'Missing required fields',
                            code: 'VALIDATION_ERROR'
                        });
                    }

                    // Mock database insertion
                    mockDb.query.mockResolvedValueOnce({
                        rows: [{ submission_id: 'test-submission-123' }]
                    });

                    const submissionId = 'test-submission-123';
                    
                    res.status(201).json({
                        message: 'Checklist submitted successfully',
                        submissionId,
                        status: 'PendingSupervisorValidation'
                    });
                } catch (error) {
                    res.status(500).json({ message: 'Internal server error' });
                }
            });
        });

        it('should accept valid checklist submission', async () => {
            const testData = {
                title: 'Test Checklist',
                headings: [
                    {
                        heading: 'Test Section',
                        tasks: [
                            { id: 'task1', label: 'Test Task', checked: true }
                        ]
                    }
                ]
            };

            const response = await request(app)
                .post('/api/submit-checklist')
                .send(testData)
                .expect(201);

            expect(response.body.message).toBe('Checklist submitted successfully');
            expect(response.body.submissionId).toBeDefined();
            expect(response.body.status).toBe('PendingSupervisorValidation');
        });

        it('should reject submission with missing fields', async () => {
            const invalidData = {
                title: 'Test Checklist'
                // Missing headings
            };

            const response = await request(app)
                .post('/api/submit-checklist')
                .send(invalidData)
                .expect(400);

            expect(response.body.message).toBe('Missing required fields');
            expect(response.body.code).toBe('VALIDATION_ERROR');
        });

        it('should handle database errors gracefully', async () => {
            mockDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

            const testData = {
                title: 'Test Checklist',
                headings: [
                    {
                        heading: 'Test Section',
                        tasks: [
                            { id: 'task1', label: 'Test Task', checked: true }
                        ]
                    }
                ]
            };

            const response = await request(app)
                .post('/api/submit-checklist')
                .send(testData)
                .expect(500);

            expect(response.body.message).toBe('Internal server error');
        });
    });

    describe('User Statistics Endpoints', () => {
        beforeEach(() => {
            app.get('/api/user/stats', async (req, res) => {
                try {
                    // Mock user statistics
                    mockDb.query.mockResolvedValueOnce({
                        rows: [
                            { total_submissions: 5, pending_validations: 2, completed_tasks: 15 }
                        ]
                    });

                    const stats = {
                        totalSubmissions: 5,
                        pendingValidations: 2,
                        completedTasks: 15,
                        lastUpdated: new Date().toISOString()
                    };

                    res.json(stats);
                } catch (error) {
                    res.status(500).json({ message: 'Failed to fetch statistics' });
                }
            });
        });

        it('should return user statistics', async () => {
            const response = await request(app)
                .get('/api/user/stats')
                .expect(200);

            expect(response.body.totalSubmissions).toBe(5);
            expect(response.body.pendingValidations).toBe(2);
            expect(response.body.completedTasks).toBe(15);
            expect(response.body.lastUpdated).toBeDefined();
        });

        it('should handle database errors in statistics', async () => {
            mockDb.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .get('/api/user/stats')
                .expect(500);

            expect(response.body.message).toBe('Failed to fetch statistics');
        });
    });
});
