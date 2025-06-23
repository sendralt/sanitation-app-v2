const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../middleware/authMiddleware');
const User = require('../models/user');
const { hashPassword, hashAnswer, PREDEFINED_SECURITY_QUESTIONS } = require('../utils/auth');
const { v4: uuidv4 } = require('uuid');

// Middleware to log requests to this router
router.use((req, res, next) => {
  console.log(`[Admin Route Middleware] ${req.method} ${req.originalUrl} - User authenticated: ${req.isAuthenticated()}`);
  if (req.user) {
    console.log(`[Admin Route Middleware] User: ${req.user.username}, role: ${req.user.role}, isAdmin: ${req.user.isAdmin}`);
  }
  next();
});

// Remove the test route we added
// router.get('/test', (req, res) => {
//   res.send('Admin router is working!');
// });

// Admin dashboard
router.get('/', ensureAdmin, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    user: req.user
  });
});

// Create User - GET (show form)
router.get('/create-user', ensureAdmin, (req, res) => {
  res.render('admin/create-user', {
    title: 'Create User',
    user: req.user,
    securityQuestions: PREDEFINED_SECURITY_QUESTIONS
  });
});

// Create User - POST (handle form submission)
router.post('/create-user', ensureAdmin, async (req, res) => {
  try {
    const { username, firstName, lastName, password, role, department, securityAnswer1, securityAnswer2 } = req.body;

    // Validation
    if (!username || !firstName || !lastName || !password || !role) {
      req.flash('error', 'All required fields must be filled');
      return res.redirect('/admin/create-user');
    }

    // Check if username already exists
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      req.flash('error', 'Username already exists');
      return res.redirect('/admin/create-user');
    }

    // Hash password and security answers
    const passwordHash = await hashPassword(password);
    const securityAnswer1Hash = await hashAnswer(securityAnswer1 || 'default');
    const securityAnswer2Hash = await hashAnswer(securityAnswer2 || 'default');

    // Create user
    const newUser = await User.create({
      id: uuidv4(),
      username,
      firstName,
      lastName,
      passwordHash,
      role,
      department: department || null,
      isAdmin: role === 'admin',
      securityQuestion1Id: 1, // Default to first question
      securityAnswer1Hash,
      securityQuestion2Id: 3, // Default to third question
      securityAnswer2Hash
    });

    req.flash('success', `User "${username}" created successfully`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('[Admin] Error creating user:', error);
    req.flash('error', 'Error creating user: ' + error.message);
    res.redirect('/admin/create-user');
  }
});

// Manage Users - GET (list all users)
router.get('/users', ensureAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'firstName', 'lastName', 'role', 'department', 'isAdmin', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.render('admin/users', {
      title: 'Manage Users',
      user: req.user,
      users: users
    });
  } catch (error) {
    console.error('[Admin] Error fetching users:', error);
    req.flash('error', 'Error loading users');
    res.redirect('/admin');
  }
});

// PostgreSQL Dashboard - simplified route with minimal dependencies
router.get('/postgresql-dashboard', (req, res) => {
  console.log('[PostgreSQL Dashboard] Route accessed');

  try {
    res.render('admin/postgresql-dashboard', {
      title: 'PostgreSQL Dashboard',
      user: req.user || { username: 'Unknown' },
      backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:3001',
      BASE_URL: process.env.BASE_URL || 'https://localhost:3443'
    });
  } catch (error) {
    console.error('[PostgreSQL Dashboard] Error:', error);
    res.status(500).send('Error loading PostgreSQL dashboard: ' + error.message);
  }
});

// System Settings
router.get('/settings', ensureAdmin, (req, res) => {
  res.render('admin/settings', {
    title: 'System Settings',
    user: req.user
  });
});

// Audit Logs
router.get('/audit-logs', ensureAdmin, (req, res) => {
  res.render('admin/audit-logs', {
    title: 'Audit Logs',
    user: req.user
  });
});

// Backup System
router.get('/backup', ensureAdmin, (req, res) => {
  res.render('admin/backup', {
    title: 'System Backup',
    user: req.user
  });
});

module.exports = router;
