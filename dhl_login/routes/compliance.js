const express = require('express');
const router = express.Router();
const { ensureCompliance } = require('../middleware/authMiddleware');

// Compliance dashboard
router.get('/', ensureCompliance, (req, res) => {
  res.render('compliance/dashboard', {
    title: 'Compliance Dashboard',
    user: req.user
  });
});

// Other compliance routes...

module.exports = router;
