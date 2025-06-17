// Manager Dashboard Routes
// Phase 3: Manager & Advanced Dashboards Implementation

const express = require('express');
const router = express.Router();
const { ensureManager } = require('../middleware/authMiddleware');

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to view this resource.');
  res.redirect('/login-page');
};

// Manager dashboard main page
router.get('/', ensureAuthenticated, ensureManager, (req, res) => {
  console.log('[Manager Dashboard] User accessing manager dashboard:', req.user ? req.user.username : 'No user');
  res.render('manager/dashboard', { 
    title: 'Manager Dashboard', 
    user: req.user 
  });
});

// Team management page
router.get('/teams', ensureAuthenticated, ensureManager, (req, res) => {
  console.log('[Manager Teams] User accessing team management:', req.user ? req.user.username : 'No user');
  res.render('manager/teams', { 
    title: 'Team Management', 
    user: req.user 
  });
});

// Team performance analytics page
router.get('/performance', ensureAuthenticated, ensureManager, (req, res) => {
  console.log('[Manager Performance] User accessing performance analytics:', req.user ? req.user.username : 'No user');
  res.render('manager/performance', { 
    title: 'Team Performance Analytics', 
    user: req.user 
  });
});

// Manual assignment page
router.get('/assignments', ensureAuthenticated, ensureManager, (req, res) => {
  console.log('[Manager Assignments] User accessing manual assignments:', req.user ? req.user.username : 'No user');
  res.render('manager/assignments', { 
    title: 'Manual Assignments', 
    user: req.user 
  });
});

module.exports = router;
