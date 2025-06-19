// Compliance Officer Dashboard Routes
// Phase 4: Compliance & Advanced Automation Implementation

const express = require('express');
const router = express.Router();
const { ensureCompliance } = require('../middleware/authMiddleware');

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to view this resource.');
  res.redirect('/login-page');
};

// Compliance dashboard main page
router.get('/', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Dashboard] User accessing compliance dashboard:', req.user ? req.user.username : 'No user');
  res.render('compliance/dashboard', { 
    title: 'Compliance Dashboard', 
    user: req.user 
  });
});

// Compliance metrics page
router.get('/metrics', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Metrics] User accessing compliance metrics:', req.user ? req.user.username : 'No user');
  res.render('compliance/metrics', { 
    title: 'Compliance Metrics', 
    user: req.user 
  });
});

// Audit trail page
router.get('/audit', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Audit] User accessing audit trail:', req.user ? req.user.username : 'No user');
  res.render('compliance/audit', { 
    title: 'Audit Trail', 
    user: req.user 
  });
});

// Non-compliance reports page
router.get('/non-compliance', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Non-Compliance] User accessing non-compliance reports:', req.user ? req.user.username : 'No user');
  res.render('compliance/non-compliance', { 
    title: 'Non-Compliance Reports', 
    user: req.user 
  });
});

// Validation trends page
router.get('/validation-trends', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Validation Trends] User accessing validation trends:', req.user ? req.user.username : 'No user');
  res.render('compliance/validation-trends', { 
    title: 'Validation Trends', 
    user: req.user 
  });
});

module.exports = router;
