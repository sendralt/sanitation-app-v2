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

// Test route to check if routing works
router.get('/test', (req, res) => {
  res.send('Compliance routing works!');
});

// Compliance dashboard main page
router.get('/', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Dashboard] User accessing compliance dashboard:', req.user ? req.user.username : 'No user');
  try {
    res.render('compliance/dashboard', {
      title: 'Compliance Dashboard',
      user: req.user
    });
  } catch (error) {
    console.error('[Compliance Dashboard] Error rendering dashboard:', error);
    res.status(500).send('Error rendering compliance dashboard: ' + error.message);
  }
});

// Compliance metrics page
router.get('/metrics', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Metrics] User accessing compliance metrics:', req.user ? req.user.username : 'No user');
  try {
    res.render('compliance/metrics', {
      title: 'Compliance Metrics',
      user: req.user
    });
  } catch (error) {
    console.error('[Compliance Metrics] Error rendering metrics:', error);
    res.status(500).send('Error rendering compliance metrics: ' + error.message);
  }
});

// Audit trail page
router.get('/audit', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Audit] User accessing audit trail:', req.user ? req.user.username : 'No user');
  try {
    res.render('compliance/audit', {
      title: 'Audit Trail',
      user: req.user
    });
  } catch (error) {
    console.error('[Compliance Audit] Error rendering audit:', error);
    res.status(500).send('Error rendering audit trail: ' + error.message);
  }
});

// Non-compliance reports page
router.get('/non-compliance', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Non-Compliance] User accessing non-compliance reports:', req.user ? req.user.username : 'No user');
  try {
    res.render('compliance/non-compliance', {
      title: 'Non-Compliance Reports',
      user: req.user
    });
  } catch (error) {
    console.error('[Compliance Non-Compliance] Error rendering non-compliance:', error);
    res.status(500).send('Error rendering non-compliance reports: ' + error.message);
  }
});

// Validation trends page
router.get('/validation-trends', ensureAuthenticated, ensureCompliance, (req, res) => {
  console.log('[Compliance Validation Trends] User accessing validation trends:', req.user ? req.user.username : 'No user');
  try {
    res.render('compliance/validation-trends', {
      title: 'Validation Trends',
      user: req.user
    });
  } catch (error) {
    console.error('[Compliance Validation Trends] Error rendering validation trends:', error);
    res.status(500).send('Error rendering validation trends: ' + error.message);
  }
});

module.exports = router;
