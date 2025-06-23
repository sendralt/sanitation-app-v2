const express = require('express');
const router = express.Router();
const { ensureManager } = require('../middleware/authMiddleware');

// Middleware to log requests to this router
router.use((req, res, next) => {
  console.log(`[Manager Route Middleware] ${req.method} ${req.originalUrl} - User authenticated: ${req.isAuthenticated()}`);
  if (req.user) {
    console.log(`[Manager Route Middleware] User: ${req.user.username}, role: ${req.user.role}`);
  }
  next();
});

// Manager dashboard
router.get('/', ensureManager, (req, res) => {
  res.render('manager/dashboard', {
    title: 'Manager Dashboard',
    user: req.user
  });
});

// Team Management
router.get('/team', ensureManager, (req, res) => {
  res.render('manager/team', {
    title: 'Team Management',
    user: req.user
  });
});

// Reports
router.get('/reports', ensureManager, (req, res) => {
  res.render('manager/reports', {
    title: 'Manager Reports',
    user: req.user
  });
});

// Checklist Validation
router.get('/validate', ensureManager, (req, res) => {
  res.render('manager/validate', {
    title: 'Validate Checklists',
    user: req.user
  });
});

// Schedule Management
router.get('/schedules', ensureManager, (req, res) => {
  res.render('manager/schedules', {
    title: 'Schedule Management',
    user: req.user
  });
});

// Assign Task
router.get('/assign-task', ensureManager, (req, res) => {
  res.render('manager/assign-task', {
    title: 'Assign Task',
    user: req.user
  });
});

module.exports = router;
