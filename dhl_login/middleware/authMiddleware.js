const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/user'); // Adjust path as necessary

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findByPk(jwt_payload.userId);
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  })
);

// Middleware to protect routes
const authenticateJwt = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // You can customize the error response
      let message = 'Unauthorized';
      if (info && info.name === 'JsonWebTokenError') {
        message = 'Invalid token.';
      } else if (info && info.name === 'TokenExpiredError') {
        message = 'Token expired.';
      }
      return res.status(401).json({ message });
    }
    req.user = user;
    return next();
  })(req, res, next);
};

// Middleware to ensure the user is an administrator
const ensureAdmin = (req, res, next) => {
  // Check if user is authenticated at all
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log('[ensureAdmin] User not authenticated');
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/login-page');
  }
  
  // Now check if user object exists
  if (!req.user) {
    console.log('[ensureAdmin] User object missing despite authentication');
    req.flash('error', 'Authentication error. Please log in again.');
    return res.redirect('/login-page');
  }
  
  console.log('[ensureAdmin] Checking user role:', req.user.username, 'Role:', req.user.role, 'isAdmin:', req.user.isAdmin);
  
  // Check for admin role
  if (req.user.isAdmin === true || req.user.role === 'admin') {
    console.log('[ensureAdmin] User has admin role, proceeding');
    return next();
  }
  
  // If not admin, redirect to dashboard with error
  console.log('[ensureAdmin] Access denied for user:', req.user.username, 'Role:', req.user.role);
  req.flash('error', 'You do not have permission to access this page');
  return res.redirect('/dashboard');
};

// Middleware to ensure the user is a manager or admin
const ensureManager = (req, res, next) => {
  // Check if user is authenticated at all
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log('[ensureManager] User not authenticated');
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/login-page');
  }
  
  // Now check if user object exists
  if (!req.user) {
    console.log('[ensureManager] User object missing despite authentication');
    req.flash('error', 'Authentication error. Please log in again.');
    return res.redirect('/login-page');
  }
  
  console.log('[ensureManager] Checking user role:', req.user.username, 'Role:', req.user.role);
  
  // Check for manager or admin role
  if (req.user.role === 'manager' || req.user.role === 'admin' || req.user.isAdmin === true) {
    console.log('[ensureManager] User has manager/admin role, proceeding');
    return next();
  }
  
  // If not manager role, redirect to dashboard with error
  console.log('[ensureManager] Access denied for user:', req.user.username, 'Role:', req.user.role);
  req.flash('error', 'Access denied. Manager privileges required.');
  return res.redirect('/dashboard');
};

// Middleware to ensure user has compliance role
const ensureCompliance = (req, res, next) => {
  // First check if user is authenticated at all
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    console.log('[ensureCompliance] User not authenticated');
    req.flash('error', 'Please log in to access this page');
    return res.redirect('/login-page');
  }
  
  // Now check if user object exists
  if (!req.user) {
    console.log('[ensureCompliance] User object missing despite authentication');
    req.flash('error', 'Authentication error. Please log in again.');
    return res.redirect('/login-page');
  }
  
  console.log('[ensureCompliance] Checking user role:', req.user.username, 'Role:', req.user.role);
  
  // Check for compliance or admin role
  if (req.user.role === 'compliance' || req.user.role === 'admin' || req.user.isAdmin === true) {
    console.log('[ensureCompliance] User has compliance/admin role, proceeding');
    return next();
  }
  
  // If not compliance role, redirect to dashboard with error
  console.log('[ensureCompliance] Access denied for user:', req.user.username, 'Role:', req.user.role);
  req.flash('error', 'You do not have permission to access this page');
  return res.redirect('/dashboard');
};

// Middleware to ensure the user can manage a specific user (for API endpoints)
const ensureCanManageUser = (targetUserIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const targetUserId = req.params[targetUserIdParam];

    // Admin can manage anyone
    if (req.user.role === 'admin' || req.user.isAdmin === true) {
      return next();
    }

    // Manager can manage their direct reports
    if (req.user.role === 'manager') {
      // This would need to be enhanced with actual team lookup
      // For now, we'll allow managers to manage users in their department
      return next();
    }

    // Users can only manage themselves
    if (req.user.id === targetUserId) {
      return next();
    }

    return res.status(403).json({ message: 'Insufficient permissions' });
  };
};

module.exports = {
  initialize: passport.initialize(), // To initialize Passport in app.js
  authenticateJwt,
  ensureAdmin,
  ensureManager,
  ensureCompliance,
  ensureCanManageUser,
};
