/**
 * Global Test Setup
 * This file is run before all tests to set up the testing environment
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock environment variables for consistent testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_sanitation_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.testUtils = {
    // Helper to create mock user data
    createMockUser: (overrides = {}) => ({
        id: 'test-user-123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'hashedpassword123',
        role: 'user',
        department: 'IT',
        isAdmin: false,
        securityQuestionId: 'q1',
        securityAnswerHash: 'hashedanswer123',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    }),

    // Helper to create mock admin user
    createMockAdmin: (overrides = {}) => ({
        id: 'test-admin-123',
        username: 'adminuser',
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: 'hashedpassword123',
        role: 'admin',
        department: 'Administration',
        isAdmin: true,
        securityQuestionId: 'q1',
        securityAnswerHash: 'hashedanswer123',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    }),

    // Helper to create mock checklist data
    createMockChecklist: (overrides = {}) => ({
        title: 'Test Checklist',
        headings: [
            {
                heading: 'Safety Checks',
                tasks: [
                    { id: 'task1', label: 'Check equipment', checked: true },
                    { id: 'task2', label: 'Verify safety protocols', checked: false }
                ]
            },
            {
                heading: 'Cleaning Tasks',
                tasks: [
                    { id: 'task3', label: 'Clean work area', checked: true },
                    { id: 'task4', label: 'Sanitize tools', checked: true }
                ]
            }
        ],
        submittedBy: 'test-user-123',
        submittedAt: new Date(),
        ...overrides
    }),

    // Helper to create mock JWT token
    createMockJWT: (payload = {}) => {
        const jwt = require('jsonwebtoken');
        const defaultPayload = {
            userId: 'test-user-123',
            username: 'testuser',
            role: 'user',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
        };
        
        return jwt.sign(
            { ...defaultPayload, ...payload },
            process.env.JWT_SECRET
        );
    },

    // Helper to create mock Express request
    createMockRequest: (overrides = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        session: {},
        user: null,
        flash: jest.fn(() => []),
        ...overrides
    }),

    // Helper to create mock Express response
    createMockResponse: () => {
        const res = {
            status: jest.fn(() => res),
            json: jest.fn(() => res),
            send: jest.fn(() => res),
            redirect: jest.fn(() => res),
            render: jest.fn(() => res),
            cookie: jest.fn(() => res),
            clearCookie: jest.fn(() => res),
            locals: {}
        };
        return res;
    },

    // Helper to create mock next function
    createMockNext: () => jest.fn(),

    // Helper to wait for async operations
    wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),

    // Helper to generate random test data
    randomString: (length = 10) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Helper to generate random email
    randomEmail: () => {
        const username = global.testUtils.randomString(8);
        const domain = global.testUtils.randomString(6);
        return `${username}@${domain}.com`;
    }
};

// Global mocks for common modules
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: jest.fn(() => Promise.resolve({ messageId: 'test-message-id' }))
    }))
}));

// Console override for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
    // Suppress console.error and console.warn during tests unless explicitly needed
    console.error = jest.fn();
    console.warn = jest.fn();
});

afterAll(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});

// Global cleanup
afterEach(() => {
    // Clear all mocks after each test
    jest.clearAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process in tests, just log the error
});

// Export for use in test files
module.exports = global.testUtils;
