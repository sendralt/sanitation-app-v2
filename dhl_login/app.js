// Server bootstrap app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash   = require('connect-flash');
const passport= require('passport');
const ejsLayouts = require('express-ejs-layouts');
const path = require('path'); // <--- Add this
const lusca = require('lusca');
const cors = require('cors');
const http = require('http');
const { loadSSLCertificates, createHTTPSServer, getSSLConfig } = require('./config/ssl');

// Import error handling middleware
const {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    DatabaseError,
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    requestIdMiddleware,
    errorLogger
} = require('./middleware/errorHandler');

// Import security middleware
const { securityHeaders, additionalSecurity } = require('./middleware/security');
const { generalLimiter, authLimiter, apiLimiter } = require('./middleware/rateLimiting');

require('./config/passport')(passport);           // ➜ configure strategy

const app = express();

// --- CORS Configuration for API endpoints
// Parse allowed origins from environment variable
const allowedOriginsString = process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3001,http://localhost:3000';
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

// Configure CORS options for API routes
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like server-to-server requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11) choke on 204
};

// Apply CORS to API routes only (not to web pages)
app.use('/api', cors(corsOptions));
app.use('/api', apiLimiter); // Apply API rate limiting to all API routes
console.log(`DHL Login CORS configured for API routes with allowed origins: ${allowedOrigins.join(', ')}`);

// --- Security middleware (must be early in the chain)
app.use(securityHeaders);
app.use(additionalSecurity);
app.use(generalLimiter); // Apply general rate limiting

// --- Request ID middleware (for tracking requests)
app.use(requestIdMiddleware);

// --- view engine
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(ejsLayouts);
app.set('layout', 'layouts/main'); // Explicitly set the default layout

// --- body parsing
app.use(requestIdMiddleware); // Add request ID tracking
app.use(express.urlencoded({ extended: false }));
app.use(express.json()); // For parsing application/json API request bodies

// --- sessions
const isSSLEnabled = process.env.ENABLE_SSL === 'true';
// Only set secure cookies if SSL is explicitly enabled, not just because NODE_ENV is production
// This allows for production deployments behind reverse proxies that handle SSL termination
const useSecureCookies = isSSLEnabled;
app.use(session({
  secret            : 'wRVPT1tLZK0kYAvSxVbg5n3hCmN9u82jpxODq6YeblJMHvUGzaE7cWiX4Ftk5oQm',
  resave            : false,
  saveUninitialized : false,
  cookie            : {
    maxAge: 1000 * 60 * 60, // 1h
    sameSite: 'Lax', // Explicitly set SameSite policy
    secure: useSecureCookies, // Only secure if SSL is explicitly enabled
    httpOnly: true // Prevent XSS attacks
  }
}));

// --- passport
app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use(flash());

// --- CSRF protection with lusca
// Apply CSRF protection selectively to routes that need it
// This avoids issues with routes that don't need CSRF protection

// --- static assets (css, logos, etc.)
app.use(express.static(__dirname + '/public'));

// --- flash middleware: expose to all templates
app.use((req,res,next)=>{
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  next();
});

// Serve the logo specifically
app.get('/dhl-logo.svg', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'layouts', 'dhl-logo.svg'));
});

// --- Authentication Middleware for Web Pages ---
const ensureWebAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    console.log(`[ensureWebAuthenticated] User already authenticated, proceeding to: ${req.originalUrl}`);
    return next();
  }

  // Store the original URL for redirect after login
  req.session.returnTo = req.originalUrl;
  console.log(`[ensureWebAuthenticated] User not authenticated for: ${req.originalUrl}`);
  console.log(`[ensureWebAuthenticated] Set req.session.returnTo to: ${req.session.returnTo}`);
  console.log(`[ensureWebAuthenticated] Session ID: ${req.sessionID}`);
  console.log(`[ensureWebAuthenticated] Full session: ${JSON.stringify(req.session)}`);

  req.flash('error', 'Please log in to view that resource.');
  res.redirect('/login-page');
};

// --- Specific route for Supervisor Validation page ---
// This ensures that any path like /app/validate-checklist/someID serves the validate-checklist.html file.
// The ensureWebAuthenticated middleware protects it.
app.get('/app/validate-checklist/:id', ensureWebAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Public', 'validate-checklist.html'));
});

// --- Serve SanitationChecks Application (Protected) ---
// This serves static files from the main 'Public' directory under the '/app' path for other /app/* routes.
// Access is protected by ensureWebAuthenticated.
// This should come AFTER specific /app/ routes like the one above.

// ADDED: Logging for /app requests to test if HTML files are being requested
app.use('/app', (req, res, next) => {
  console.log(`[App Static Middleware] Received request for: ${req.method} ${req.originalUrl}`);
  if (req.originalUrl.endsWith('.html')) {
    console.log(`[App Static Middleware] Attempting to serve HTML file: ${req.originalUrl}. User authenticated: ${req.isAuthenticated()}`);
  }
  next();
});
// END ADDED

app.use('/app', express.static(path.join(__dirname, '..', 'Public')));

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Public', 'index.html'));
});


// --- routes
// --- Web Page Routes ---
app.get('/', (req, res) => {
  res.redirect('/login-page');
});

app.get('/login-page', lusca.csrf(), (req, res) => {
  console.log(`[GET /login-page] Arrived at login page`);
  console.log(`[GET /login-page] Session ID: ${req.sessionID}`);
  console.log(`[GET /login-page] returnTo in session: ${req.session.returnTo}`);
  console.log(`[GET /login-page] Full session content: ${JSON.stringify(req.session)}`);
  console.log(`[GET /login-page] User authenticated: ${req.isAuthenticated()}`);

  // Ensure 'login' is the correct name of your EJS template for the login page
  res.render('login', { title: 'Login', user: req.user, _csrf: req.csrfToken() });
});

app.post('/login-page', lusca.csrf(), (req, res, next) => {
  console.log('[Login POST Start] req.session before passport.authenticate:', JSON.stringify(req.session));
  passport.authenticate('local', (err, user, info) => {
    console.log('[Login POST passport.authenticate callback] req.session:', JSON.stringify(req.session));
    if (err) { return next(err); }
    if (!user) {
      req.flash('error', info.message || 'Login failed. Please try again.');
      return res.redirect('/login-page');
    }

    // Capture returnTo BEFORE req.logIn, as req.logIn might regenerate the session
    const capturedReturnTo = req.session.returnTo;
    console.log(`[Login POST passport.authenticate callback] Captured req.session.returnTo before req.logIn: ${capturedReturnTo}`);

    req.logIn(user, (err) => {
      if (err) { return next(err); }
      // req.session might have been regenerated by req.logIn(), so req.session.returnTo might be gone.
      // Use the capturedReturnTo value.
      console.log(`[Login POST req.logIn callback] req.session AFTER req.logIn:`, JSON.stringify(req.session));
      console.log(`[Login POST req.logIn callback] Using capturedReturnTo: ${capturedReturnTo}`);

      // Clean up the returnTo from session if it still exists
      if (req.session && req.session.returnTo) {
          delete req.session.returnTo;
      }

      // Determine redirect URL - prioritize validation links
      let redirectUrl = '/dashboard'; // Default fallback

      if (capturedReturnTo) {
        // If the returnTo URL is a validation link, use it
        if (capturedReturnTo.includes('/app/validate-checklist/')) {
          redirectUrl = capturedReturnTo;
          console.log(`[Login POST] Redirecting to validation page: ${redirectUrl}`);
        } else if (capturedReturnTo.startsWith('/app/')) {
          // Other app pages
          redirectUrl = capturedReturnTo;
          console.log(`[Login POST] Redirecting to app page: ${redirectUrl}`);
        } else {
          // For other URLs, still use them but log for debugging
          redirectUrl = capturedReturnTo;
          console.log(`[Login POST] Redirecting to captured URL: ${redirectUrl}`);
        }
      }

      console.log(`[Login POST req.logIn callback] Final redirect URL: ${redirectUrl}`);
      return res.redirect(redirectUrl);
    });
  })(req, res, next);
});

app.get('/logout-page', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.flash('success', 'You have successfully logged out.');
    res.redirect('/login-page');
  });
});

// --- Dashboard Route ---
app.get('/dashboard', ensureWebAuthenticated, lusca.csrf(), (req, res) => {
  // req.user is populated by Passport and made available to templates
  // by the middleware at line 36 (res.locals.user = req.user)
  res.render('dashboard', {
    title: 'Dashboard',
    _csrf: req.csrfToken()
    // The 'user' object will be available in dashboard.ejs via res.locals.user
  });
});

// --- Password Reset Routes ---
app.get('/forgot-password', lusca.csrf(), (req, res) => {
  res.render('forgot-password', {
    title: 'Forgot Password',
    step: 'username',
    _csrf: req.csrfToken()
  });
});



// --- Configuration API ---
// Provide frontend configuration including backend API URL and supervisor email
app.get('/api/config', (req, res) => {
  console.log('[DEBUG] SUPERVISOR_EMAIL env var:', process.env.SUPERVISOR_EMAIL);
  const config = {
    backendApiUrl: 'http://localhost:3001',
    supervisorEmail: process.env.SUPERVISOR_EMAIL || 'sendral.ts.1@pg.com',
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version
  };
  console.log('[DEBUG] Config object:', config);
  res.json(config);
});

// --- API Routes ---
app.use('/api/auth', require('./routes/auth')); // Mount API auth routes

// --- Admin Routes ---
app.use('/admin', (req, res, next) => {
  console.log(`[Admin Route Middleware] ${req.method} ${req.originalUrl} - User authenticated: ${req.isAuthenticated ? req.isAuthenticated() : false}`);
  if (req.user) {
    console.log(`[Admin Route Middleware] User: ${req.user.username}, isAdmin: ${req.user.isAdmin}`);
  }
  next();
}, require('./routes/admin')); // Mount Admin routes

// --- Manager Routes ---
app.use('/manager', (req, res, next) => {
  console.log(`[Manager Route Middleware] ${req.method} ${req.originalUrl} - User authenticated: ${req.isAuthenticated ? req.isAuthenticated() : false}`);
  if (req.user) {
    console.log(`[Manager Route Middleware] User: ${req.user.username}, role: ${req.user.role}`);
  }
  next();
}, require('./routes/manager')); // Mount Manager routes

// --- Other Protected Routes ---
app.use('/checklists', require('./routes/checklist')); // protected

// --- Health Check Routes ---
app.use('/', require('./routes/health'));

app.get('/health/database', async (req, res) => {
  try {
    const sequelize = require('./config/sequelize');
    await sequelize.authenticate();
    const User = require('./models/user');
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    res.json({ 
      status: 'ok', 
      databaseConnected: true,
      adminUserExists: !!adminUser
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// --- Error handling middleware (must be last) ---
app.use(notFoundHandler);
app.use(globalErrorHandler);

// --- start server
const sslConfig = getSSLConfig();
const PORT = sslConfig.httpPort;
const HTTPS_PORT = sslConfig.httpsPort;

if (sslConfig.enableSSL) {
    // Load SSL certificates
    const sslOptions = loadSSLCertificates(sslConfig.sslKeyPath, sslConfig.sslCertPath);

    if (sslOptions) {
        // Start HTTPS server
        const httpsServer = createHTTPSServer(app, sslOptions, HTTPS_PORT, () => {
            console.log(`[SSL] DHL Login HTTPS server running on https://localhost:${HTTPS_PORT}`);
            console.log(`[SSL] SSL certificates loaded from:`);
            console.log(`[SSL] - Key: ${sslConfig.sslKeyPath}`);
            console.log(`[SSL] - Cert: ${sslConfig.sslCertPath}`);
        });

        // Optionally start HTTP server for redirects
        if (process.env.ENABLE_HTTP_REDIRECT !== 'false') {
            const httpApp = express();
            httpApp.use((req, res) => {
                const httpsUrl = `https://${req.headers.host.replace(/:\d+$/, '')}:${HTTPS_PORT}${req.url}`;
                console.log(`[HTTP->HTTPS] Redirecting ${req.url} to ${httpsUrl}`);
                res.redirect(301, httpsUrl);
            });

            http.createServer(httpApp).listen(PORT, () => {
                console.log(`[HTTP] HTTP redirect server running on http://localhost:${PORT} (redirects to HTTPS)`);
            });
        }
    } else {
        console.error('[SSL] Failed to load SSL certificates, falling back to HTTP');
        app.listen(PORT, () => console.log(`[HTTP] DHL Login server running on http://localhost:${PORT} (SSL disabled due to certificate error)`));
    }
} else {
    // Start HTTP server only
    app.listen(PORT, () => console.log(`[HTTP] DHL Login server running on http://localhost:${PORT} (SSL disabled)`));
}
