const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../middleware/authMiddleware');
const { getSecurityQuestions, getSecurityQuestionById } = require('../utils/auth');
const User = require('../models/user'); // Needed for checking username existence, etc.
const { hashPassword, hashAnswer } = require('../utils/auth');
const lusca = require('lusca');

// Middleware to ensure user is authenticated (example, adjust if your setup is different)
// This is a basic check. In a real app, you'd likely have a more robust `ensureAuthenticated` middleware.
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to view this resource.');
  res.redirect('/login-page');
};

// Admin dashboard or landing page
router.get('/', ensureAuthenticated, ensureAdmin, (req, res) => {
  console.log('[Admin Dashboard] User accessing admin dashboard:', req.user ? req.user.username : 'No user');
  res.render('admin/dashboard', { title: 'Admin Dashboard', user: req.user });
});

// GET route to display the new user creation form
router.get('/users/new', ensureAuthenticated, ensureAdmin, lusca.csrf(), (req, res) => {
  console.log('[Admin Create User] Route accessed by user:', req.user ? req.user.username : 'No user');
  try {
    const securityQuestions = getSecurityQuestions();
    console.log('[Admin Create User] Security questions loaded:', securityQuestions.length);

    // CSRF token should be available since we're using lusca.csrf() middleware
    const csrfToken = req.csrfToken();

    res.render('admin/create-user', {
      title: 'Create New User',
      securityQuestions: securityQuestions,
      user: req.user, // Pass the logged-in admin user if needed by the layout
      formData: {}, // To hold onto form data if re-rendering after validation error
      errorMessages: req.flash('error'), // For displaying general errors
      validationErrors: {}, // To hold specific field validation errors
      _csrf: csrfToken // Pass CSRF token to the view
    });
  } catch (error) {
    console.error('[Admin Create User] Error in route:', error);
    req.flash('error', 'Failed to load the user creation form.');
    res.redirect('/admin'); // Or some other appropriate admin error page or dashboard
  }
});

// POST route to handle new user creation
router.post('/users', ensureAuthenticated, ensureAdmin, lusca.csrf(), async (req, res) => {
  const { username, password, firstName, lastName, securityQuestion1Id, securityAnswer1, securityQuestion2Id, securityAnswer2 } = req.body;
  const securityAnswers = [
    { questionId: parseInt(securityQuestion1Id, 10), answer: securityAnswer1 },
    { questionId: parseInt(securityQuestion2Id, 10), answer: securityAnswer2 }
  ];
  const formData = req.body; // To repopulate form on error
  let validationErrors = {};

  // --- Basic Validation ---
  if (!firstName || firstName.trim() === '') {
    validationErrors.firstName = 'First Name is required.';
  }
  if (!lastName || lastName.trim() === '') {
    validationErrors.lastName = 'Last Name is required.';
  }
  if (!username || username.trim().length < 3 || username.trim().length > 30) {
    validationErrors.username = 'Username must be 3-30 characters long.';
  }
  // Add more username validation if needed (e.g., alphanumeric)

  if (!password || password.length < 8) {
    validationErrors.password = 'Password must be at least 8 characters long.';
  }

  if (securityAnswers.length !== 2 || !securityAnswers[0].questionId || !securityAnswers[1].questionId ||
      securityAnswers[0].answer.trim() === '' || securityAnswers[1].answer.trim() === '') {
    validationErrors.securityAnswers = 'Two security questions and answers are required.';
  } else if (securityAnswers[0].questionId === securityAnswers[1].questionId) {
    validationErrors.securityAnswers = 'Security questions must be unique.';
  } else {
    const q1 = getSecurityQuestionById(securityAnswers[0].questionId);
    const q2 = getSecurityQuestionById(securityAnswers[1].questionId);
    if (!q1 || !q2) {
        validationErrors.securityAnswers = 'Invalid security question ID provided.';
    }
  }
  
  // Check if username already exists
  if (!validationErrors.username) {
    try {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        validationErrors.username = 'Username already exists.';
      }
    } catch (dbError) {
      console.error('Error checking existing username:', dbError);
      req.flash('error', 'An error occurred during validation.');
      // Re-render form with error
      const securityQuestions = getSecurityQuestions();
      return res.render('admin/create-user', {
        title: 'Create New User',
        securityQuestions,
        user: req.user,
        formData,
        errorMessages: req.flash('error'),
        validationErrors,
        _csrf: req.csrfToken() // Pass CSRF token
      });
    }
  }


  if (Object.keys(validationErrors).length > 0) {
    const securityQuestions = getSecurityQuestions();
    return res.render('admin/create-user', {
      title: 'Create New User',
      securityQuestions,
      user: req.user,
      formData, // Pass back the submitted data to repopulate the form
      errorMessages: req.flash('error'), // General flash messages
      validationErrors, // Specific field validation errors
      _csrf: req.csrfToken() // Pass CSRF token
    });
  }

  // --- If Validation Passes ---
  try {
    const passwordHash = await hashPassword(password);
    const securityAnswer1Hash = await hashAnswer(securityAnswers[0].answer);
    const securityAnswer2Hash = await hashAnswer(securityAnswers[1].answer);

    await User.create({
      username,
      firstName,
      lastName,
      passwordHash,
      securityQuestion1Id: securityAnswers[0].questionId,
      securityAnswer1Hash,
      securityQuestion2Id: securityAnswers[1].questionId,
      securityAnswer2Hash,
      isAdmin: false, // By default, users created via this form are not admins
                      // Add a checkbox in the form if admin creation is desired here
    });

    req.flash('success', `User '${username}' created successfully.`);
    res.redirect('/admin/users/new'); // Or redirect to a user list page: /admin/users
  } catch (error) {
    console.error('Error creating user:', error);
    req.flash('error', 'An error occurred while creating the user.');
    // Re-render form with error
    const securityQuestions = getSecurityQuestions();
    res.render('admin/create-user', {
      title: 'Create New User',
      securityQuestions,
      user: req.user,
      formData,
      errorMessages: req.flash('error'),
      validationErrors, // Keep any validation errors if they occurred before this catch
      _csrf: req.csrfToken() // Pass CSRF token
    });
  }
});

module.exports = router;
