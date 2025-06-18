// Auth routes routes/auth.js
const express = require('express');
const passport = require('passport');
const router = express.Router();
const bcrypt = require('bcryptjs'); // For direct use if not fully relying on utils for some checks
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto'); // For temporary tokens if needed

const User = require('../models/user');
const {
    generateToken,
    hashPassword,
    comparePassword,
    getSecurityQuestions,
    getSecurityQuestionById,
    normalizeAnswer,
    hashAnswer,
    compareAnswer,
    PREDEFINED_SECURITY_QUESTIONS
} = require('../utils/auth');
const { authenticateJwt } = require('../middleware/authMiddleware');
const {
    ValidationError,
    AuthenticationError,
    DatabaseError,
    asyncHandler
} = require('../middleware/errorHandler');

// --- API Auth Routes (to be prefixed with /api/auth in app.js) ---

// Rate limiter for sensitive auth actions
const authApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs for most auth actions
    message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 registration attempts per hour
    message: { message: 'Too many registration attempts from this IP, please try again later.'},
    standardHeaders: true,
    legacyHeaders: false,
});

// 1. Get Security Questions: GET /security-questions
router.get('/security-questions', (req, res) => {
    const questions = getSecurityQuestions();
    res.status(200).json(questions);
});

// 2. Registration: POST /register
router.post('/register', registrationLimiter, asyncHandler(async (req, res) => {
    const { username, password, securityAnswers } = req.body;

    // Validation
    if (!username || !validator.isLength(username, { min: 3, max: 30 }) /* || !validator.isAlphanumeric(username)*/) {
        throw new ValidationError('Username must be 3-30 characters long.'); // and alphanumeric
    }
    if (!password || !validator.isLength(password, { min: 8 })) {
        throw new ValidationError('Password must be at least 8 characters long.');
    }
    if (!Array.isArray(securityAnswers) || securityAnswers.length !== 2) {
        throw new ValidationError('Exactly two security answers are required.');
    }

    const questionIds = securityAnswers.map(sa => sa.questionId);
    if (new Set(questionIds).size !== 2) {
        throw new ValidationError('Security questions must be unique.');
    }

    for (const sa of securityAnswers) {
        if (!sa.questionId || !getSecurityQuestionById(sa.questionId) || typeof sa.answer !== 'string' || sa.answer.trim() === '') {
            throw new ValidationError('Invalid security question or answer provided.');
        }
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
        throw new ValidationError('Username already exists.');
    }

    const passwordHash = await hashPassword(password);
    const securityAnswer1Hash = await hashAnswer(securityAnswers[0].answer);
    const securityAnswer2Hash = await hashAnswer(securityAnswers[1].answer);

    const newUser = await User.create({
        username,
        passwordHash,
        securityQuestion1Id: securityAnswers[0].questionId,
        securityAnswer1Hash,
        securityQuestion2Id: securityAnswers[1].questionId,
        securityAnswer2Hash,
    });

    res.status(201).json({ message: 'User registered successfully.', userId: newUser.id });
}));

// 3. Login: POST /login (API Login)
// Renamed to /login-api to avoid conflict with existing web /login POST route
// This route will be mounted under /api/auth, so full path is /api/auth/login-api
router.post('/login-api', authApiLimiter, asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        throw new ValidationError('Username and password are required.');
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
        throw new AuthenticationError('Invalid credentials.');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
        throw new AuthenticationError('Invalid credentials.');
    }

    const token = generateToken(user);
    res.status(200).json({
        message: 'Login successful.',
        token,
        user: {
            id: user.id,
            username: user.username,
            role: user.role || (user.isAdmin ? 'admin' : 'user'),
            isAdmin: user.isAdmin || false,
            managerId: user.managerId || null,
            department: user.department || null
        },
    });
}));

// 4. Request Password Reset - Step 1: Get Security Questions for User
router.post('/request-password-reset-questions', authApiLimiter, async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ message: 'Username is required.' });
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            // Generic message for security
            return res.status(404).json({ message: 'User not found or unable to reset password.' });
        }

        const q1 = getSecurityQuestionById(user.securityQuestion1Id);
        const q2 = getSecurityQuestionById(user.securityQuestion2Id);

        if (!q1 || !q2) {
             console.error(`User ${username} has invalid security question IDs: Q1ID=${user.securityQuestion1Id}, Q2ID=${user.securityQuestion2Id}`);
             return res.status(500).json({ message: 'Error retrieving security questions configuration for user.' });
        }

        res.status(200).json({
            username: user.username,
            questions: [
                { questionId: q1.id, text: q1.text },
                { questionId: q2.id, text: q2.text },
            ],
        });
    } catch (error) {
        console.error('Request password reset questions error:', error);
        res.status(500).json({ message: 'An error occurred.' });
    }
});

// Temporary store for password reset tokens (in a real app, use Redis or a database table)
const passwordResetTokens = new Map(); // { username: { token, expiresAt } }

// 5. Request Password Reset - Step 2: Verify Security Answers & Get Reset Token
router.post('/verify-security-answers', authApiLimiter, async (req, res) => {
    const { username, answers } = req.body;

    if (!username || !Array.isArray(answers) || answers.length !== 2) {
        return res.status(400).json({ message: 'Username and two answers are required.' });
    }

    try {
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' }); // Or generic
        }

        // Implement attempt throttling
        const now = new Date();
        // Check if lastPasswordResetAttempt is not null and is a valid date
        const lastAttemptTime = user.lastPasswordResetAttempt ? new Date(user.lastPasswordResetAttempt).getTime() : 0;
        
        if (user.passwordResetAttemptCount >= 5 && (now.getTime() - lastAttemptTime) < (15 * 60 * 1000) ) { // 15 min lockout after 5 attempts
             return res.status(429).json({ message: 'Too many attempts. Please try again after 15 minutes.' });
        }
        // Reset attempt count if lockout period has passed
        if (user.passwordResetAttemptCount >= 5 && (now.getTime() - lastAttemptTime) >= (15 * 60 * 1000)) {
            user.passwordResetAttemptCount = 0;
        }
        
        let matchedAnswers = 0;
        let answer1Correct = false;
        let answer2Correct = false;

        for (const ans of answers) {
            const questionId = parseInt(ans.questionId, 10);
            if (questionId === user.securityQuestion1Id) {
                if (await compareAnswer(ans.answer, user.securityAnswer1Hash)) {
                    answer1Correct = true;
                }
            } else if (questionId === user.securityQuestion2Id) {
                if (await compareAnswer(ans.answer, user.securityAnswer2Hash)) {
                    answer2Correct = true;
                }
            }
        }
        
        if (answer1Correct && answer2Correct) {
            matchedAnswers = 2;
        }


        if (matchedAnswers !== 2) {
            user.passwordResetAttemptCount += 1;
            user.lastPasswordResetAttempt = now;
            await user.save();
            return res.status(401).json({ message: 'Incorrect security answers.' });
        }

        // Reset attempts on success
        user.passwordResetAttemptCount = 0;
        user.lastPasswordResetAttempt = null;
        await user.save();

        const tempResetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes
        passwordResetTokens.set(username, { token: tempResetToken, expiresAt });


        res.status(200).json({
            message: 'Security questions verified.',
            passwordResetToken: tempResetToken,
        });

    } catch (error) {
        console.error('Verify security answers error:', error);
        res.status(500).json({ message: 'An error occurred.' });
    }
});

// 6. Reset Password: POST /reset-password
router.post('/reset-password', authApiLimiter, async (req, res) => {
    const { username, passwordResetToken, newPassword } = req.body;

    if (!username || !passwordResetToken || !newPassword) {
        return res.status(400).json({ message: 'Username, reset token, and new password are required.' });
    }
    if (!validator.isLength(newPassword, { min: 8 })) {
        return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    try {
        const storedTokenData = passwordResetTokens.get(username);
        if (!storedTokenData || storedTokenData.token !== passwordResetToken || Date.now() > storedTokenData.expiresAt) {
            passwordResetTokens.delete(username); // Clean up expired/invalid token attempt
            return res.status(401).json({ message: 'Invalid or expired password reset token.' });
        }

        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.passwordHash = await hashPassword(newPassword);
        user.passwordResetAttemptCount = 0; 
        user.lastPasswordResetAttempt = null;
        await user.save();

        passwordResetTokens.delete(username); // Invalidate the token after successful use

        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'An error occurred during password reset.' });
    }
});


// 7. Issue JWT for active session: GET /issue-jwt-for-session (Requires Session)
// This route will be mounted under /api/auth, so full path is /api/auth/issue-jwt-for-session
router.get('/issue-jwt-for-session', (req, res) => {
    console.log(`[Auth Router /issue-jwt-for-session] Received request. Path: ${req.path}`);
    const isAuthenticated = req.isAuthenticated && req.isAuthenticated(); // Call the function
    console.log(`[Auth Router /issue-jwt-for-session] req.isAuthenticated(): ${isAuthenticated}`);
    console.log(`[Auth Router /issue-jwt-for-session] req.user:`, req.user ? { id: req.user.id, username: req.user.username } : null);

    if (!isAuthenticated) {
        console.log('[Auth Router /issue-jwt-for-session] User NOT authenticated via session. Sending 401.');
        return res.status(401).json({ message: 'User not authenticated via session.' });
    }

    try {
        const user = req.user; // User object from session
        console.log('[Auth Router /issue-jwt-for-session] User IS authenticated. Issuing JWT for user:', user.username);
        const token = generateToken(user); // Use existing utility
        res.status(200).json({
            message: 'JWT issued successfully for active session.',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role || (user.isAdmin ? 'admin' : 'user'),
                isAdmin: user.isAdmin || false,
                managerId: user.managerId || null,
                department: user.department || null
            }
        });
    } catch (error) {
        console.error('[Auth Router /issue-jwt-for-session] Error issuing JWT for session:', error);
        res.status(500).json({ message: 'An error occurred while issuing JWT for session.' });
    }
});

// 8. Get JWT token for dashboard: POST /token (Requires Session)
router.post('/token', (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({
            success: false,
            message: 'User not authenticated via session.'
        });
    }

    try {
        const user = req.user;
        const token = generateToken(user);
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                isAdmin: user.isAdmin,
                role: user.role || (user.isAdmin ? 'admin' : 'user'),
                managerId: user.managerId || null,
                department: user.department || null
            }
        });
    } catch (error) {
        console.error('[Auth Router /token] Error issuing JWT:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while issuing JWT.'
        });
    }
});

// 9. Protected Route Example: GET /me (Requires JWT)
// This route will be mounted under /api/auth, so full path is /api/auth/me
router.get('/me', authenticateJwt, (req, res) => {
    // req.user is populated by authenticateJwt middleware
    res.status(200).json({
        id: req.user.id,
        username: req.user.username,
    });
});

// Phase 4: Role Management API Endpoints for Advanced Automation

// 10. Get users by role (for automation assignment logic)
// This route will be mounted under /api/auth, so full path is /api/auth/users/by-role/:roleName
router.get('/users/by-role/:roleName', authenticateJwt, asyncHandler(async (req, res) => {
    const { roleName } = req.params;
    const requestingUser = req.user;

    // Only allow managers, admins, and compliance officers to access this endpoint
    if (!['manager', 'admin', 'compliance'].includes(requestingUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient privileges to access user role data'
        });
    }

    // Validate role name
    const validRoles = ['user', 'manager', 'admin', 'compliance'];
    if (!validRoles.includes(roleName)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid role name'
        });
    }

    try {
        const users = await User.findByRole(roleName);

        // Return limited user information for security
        const userList = users.map(user => ({
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            department: user.department
        }));

        res.json({
            success: true,
            role: roleName,
            users: userList,
            count: userList.length
        });
    } catch (error) {
        console.error('[Auth Router /users/by-role] Error fetching users by role:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users by role'
        });
    }
}));

// 11. Get user details by ID (for automation and dashboard features)
// This route will be mounted under /api/auth, so full path is /api/auth/users/:userId/details
router.get('/users/:userId/details', authenticateJwt, asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const requestingUser = req.user;

    // Only allow managers, admins, and compliance officers to access this endpoint
    if (!['manager', 'admin', 'compliance'].includes(requestingUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient privileges to access user details'
        });
    }

    try {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'firstName', 'lastName', 'role', 'department', 'managerId'],
            include: [{
                model: User,
                as: 'manager',
                attributes: ['id', 'username', 'firstName', 'lastName']
            }]
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                department: user.department,
                manager: user.manager ? {
                    id: user.manager.id,
                    username: user.manager.username,
                    firstName: user.manager.firstName,
                    lastName: user.manager.lastName
                } : null
            }
        });
    } catch (error) {
        console.error('[Auth Router /users/:userId/details] Error fetching user details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details'
        });
    }
}));

// 12. Get all users with optional role filtering (for team management and assignment)
// This route will be mounted under /api/auth, so full path is /api/auth/users
router.get('/users', authenticateJwt, asyncHandler(async (req, res) => {
    const requestingUser = req.user;
    const { role, department, limit = 100 } = req.query;

    // Only allow managers, admins, and compliance officers to access this endpoint
    if (!['manager', 'admin', 'compliance'].includes(requestingUser.role)) {
        return res.status(403).json({
            success: false,
            message: 'Insufficient privileges to access user list'
        });
    }

    try {
        const whereClause = {};

        // Apply role filter if provided
        if (role) {
            const validRoles = ['user', 'manager', 'admin', 'compliance'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role filter'
                });
            }
            whereClause.role = role;
        }

        // Apply department filter if provided
        if (department) {
            whereClause.department = department;
        }

        const users = await User.findAll({
            where: whereClause,
            attributes: ['id', 'username', 'firstName', 'lastName', 'role', 'department'],
            limit: parseInt(limit),
            order: [['firstName', 'ASC'], ['lastName', 'ASC']]
        });

        res.json({
            success: true,
            users: users,
            count: users.length,
            filters: {
                role: role || 'all',
                department: department || 'all'
            }
        });
    } catch (error) {
        console.error('[Auth Router /users] Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
}));

module.exports = router;