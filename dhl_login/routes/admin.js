const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../middleware/authMiddleware');

// Admin dashboard
router.get('/', ensureAuthenticated, ensureAdmin, (req, res) => {
  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    user: req.user
  });
});

// PostgreSQL Dashboard - simplified route with minimal dependencies
router.get('/postgresql-dashboard', (req, res) => {
  console.log('[PostgreSQL Dashboard] Route accessed');
  
  try {
    res.render('admin/postgresql-dashboard', {
      title: 'PostgreSQL Dashboard',
      user: req.user || { username: 'Unknown' },
      backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:3001'
    });
  } catch (error) {
    console.error('[PostgreSQL Dashboard] Error:', error);
    res.status(500).send('Error loading PostgreSQL dashboard: ' + error.message);
  }
});

// Other admin routes...

module.exports = router;
