console.log("[Debug] server.js: Server starting with latest code...");
require('dotenv').config(); // Ensure this is at the very top

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');

const cors = require('cors');
const path = require('path');
const fs = require('fs');  // Import the file system module
const http = require('http');

const nodemailer = require('nodemailer');  // Import nodemailer for sending emails
const { loadSSLCertificates, createHTTPSServer, getSSLConfig } = require('./config/ssl');

// Import error handling middleware
const {
    AppError,
    ValidationError,
    NotFoundError,
    AuthenticationError,
    FileOperationError,
    EmailError,
    DatabaseError,
    RateLimitError,
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    requestIdMiddleware,
    errorLogger
} = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3001; // Use environment variable for port

// --- JWT Authentication Setup ---
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET, // Ensure JWT_SECRET is in backend/.env
};

passport.use(new JwtStrategy(jwtOptions, (jwt_payload, done) => {
  // jwt_payload will contain { userId, username } from the token
  // We trust the dhl_login server as the issuer. No need to re-query User DB here.
  // The 'user' object for protected routes will be the jwt_payload.
  if (jwt_payload && jwt_payload.userId) {
    return done(null, jwt_payload); // Pass the payload as req.user
  } else {
    return done(null, false, { message: 'Invalid token payload.' });
  }
}));

// Middleware
app.use(requestIdMiddleware); // Add request ID tracking
app.use(passport.initialize()); // Initialize Passport
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Parse allowed origins from environment variable
const allowedOriginsString = process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000';
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

// Configure CORS options
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

// Apply CORS middleware
app.use(cors(corsOptions));
console.log(`CORS configured with allowed origins: ${allowedOrigins.join(', ')}`);

// Serve static files
console.log('Registering static file middleware...');
app.use(express.static(path.join(__dirname, '../Public')));
console.log('Serving static files from:', path.join(__dirname, '../Public'));


// Directory where data will be stored
const dataDir = path.join(__dirname, 'data');

// Helper function to select 20% of the checkboxes
function getRandomCheckboxes(checkboxesByHeading) {
    const headingKeys = Object.keys(checkboxesByHeading);
    const candidateCheckboxIds = [];

    // Step 1: Collect all itemIDs from under the headings
    for (const heading in checkboxesByHeading) {
        if (Object.hasOwnProperty.call(checkboxesByHeading, heading)) {
            const itemsUnderHeading = checkboxesByHeading[heading];
            if (typeof itemsUnderHeading === 'object' && itemsUnderHeading !== null) {
                for (const itemId in itemsUnderHeading) {
                    if (Object.hasOwnProperty.call(itemsUnderHeading, itemId)) {
                        candidateCheckboxIds.push(itemId);
                    }
                }
            }
        }
    }

    // Step 2: Filter out any candidate ID that is also a heading key
    const eligibleCheckboxIds = candidateCheckboxIds.filter(id => !headingKeys.includes(id));

    if (eligibleCheckboxIds.length === 0) {
        return []; // No eligible checkboxes to select from
    }

    const totalEligibleCheckboxes = eligibleCheckboxIds.length;
    // Ensure selectedCount is at least 1 if there are eligible checkboxes, but not more than available.
    let selectedCount = Math.ceil(totalEligibleCheckboxes * 0.20);
    selectedCount = Math.max(1, selectedCount); // Select at least 1 if possible
    selectedCount = Math.min(selectedCount, totalEligibleCheckboxes); // Don't try to select more than available


    // Fisher-Yates shuffle to get a random selection without duplicates
    const shuffledIds = [...eligibleCheckboxIds];
    for (let i = shuffledIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
    }

    return shuffledIds.slice(0, selectedCount);
}

// Function to save data to a file (legacy callback version)
function saveDataToFile(data, filePath) {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save form data to a file using the provided filePath
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Error writing file:', err);
        } else {
            console.log(`Data saved to ${filePath}`);
        }
    });
}

// Async version of saveDataToFile
async function saveDataToFileAsync(data, filePath) {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
            if (err) {
                console.error('Error writing file:', err);
                reject(err);
            } else {
                console.log(`Data saved to ${filePath}`);
                resolve();
            }
        });
    });
}

// Endpoint to handle form submissions
// Define authenticateApi middleware for protecting routes
const authenticateApi = passport.authenticate('jwt', { session: false });

app.post('/submit-form', authenticateApi, asyncHandler(async (req, res) => {
    const formData = req.body;

    console.log('Received Data:', formData);

    // Validate required fields
    if (!formData.title) {
        throw new ValidationError("Page title is missing from the submission.");
    }

    if (!formData.checkboxes || typeof formData.checkboxes !== 'object') {
        throw new ValidationError("Checkboxes data is missing or invalid.");
    }

    const supervisorEmail = formData.supervisorEmail || process.env.SUPERVISOR_EMAIL;

    // Validate supervisorEmail
    if (!supervisorEmail) {
        throw new ValidationError('Supervisor email is required. Please configure SUPERVISOR_EMAIL environment variable or provide email in form data.');
    }

    // Generate a single timestamp for both the file name and the email link
    const timestamp = Date.now();
    const filename = `data_${timestamp}.json`;

    // Get random 20% checkboxes
    const randomCheckboxes = getRandomCheckboxes(formData.checkboxes);

    // Add randomCheckboxes to formData
    formData.randomCheckboxes = randomCheckboxes;

    // Save the modified formData (including randomCheckboxes) to a file
    const filePath = path.join(dataDir, filename);

    try {
        await saveDataToFileAsync(formData, filePath);
    } catch (error) {
        throw new FileOperationError('save', filename, error);
    }

    // Send an email to the supervisor with the same timestamp in the checklist link
    // BASE_URL should point to the dhl_login server (e.g., http://localhost:3000)
    const baseUrl = process.env.BASE_URL || `http://localhost:3000`;
    const checklistUrl = `${baseUrl}/app/validate-checklist/${timestamp}`; // Link to UI served by dhl_login

    // Send email using async/await
    try {
        await sendEmailToSupervisorAsync(supervisorEmail, checklistUrl, filename, formData.title);
    } catch (error) {
        throw new EmailError('Failed to send email to supervisor', {
            email: supervisorEmail,
            originalError: error.message
        });
    }

    // If everything is successful, send a success response
    res.status(200).json({ message: 'Form submitted and email sent!' });
}));

// Send an email to the supervisor with a checklist link, filename, and title (legacy callback version)
function sendEmailToSupervisor(supervisorEmail, checklistUrl, filename, checklistTitle, callback) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: supervisorEmail,
        subject: `Sanitation Checklist for Review: ${checklistTitle}`, // Add title to subject
        html: `<p>A new checklist "<b>${checklistTitle}</b>" (Filename: ${filename}) requires your validation. Click <a href="${checklistUrl}">here</a> to review.</p>` // Add title and filename to body, make link text "here"
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Failed to send email:', error);
            return callback(error);
        } else {
            console.log('Email sent: ' + info.response);////////////////////
            return callback(null);
        }
    });
}

// Utility function to check if a checklist is already validated
function isChecklistValidated(formData) {
    return formData.supervisorValidation &&
           formData.supervisorValidation.supervisorName &&
           formData.supervisorValidation.validatedCheckboxes;
}

// Async version of sendEmailToSupervisor
async function sendEmailToSupervisorAsync(supervisorEmail, checklistUrl, filename, checklistTitle) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: supervisorEmail,
        subject: `Sanitation Checklist for Review: ${checklistTitle}`,
        html: `<p>A new checklist "<b>${checklistTitle}</b>" (Filename: ${filename}) requires your validation. Click <a href="${checklistUrl}">here</a> to review.</p>`
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Failed to send email:', error);
                reject(error);
            } else {
                console.log('Email sent: ' + info.response);
                resolve(info);
            }
        });
    });
}

// Route to handle GET /validate/:id (load the validation page)
app.get('/validate/:id', authenticateApi, asyncHandler(async (req, res) => {
    console.log(`[Debug] GET /validate/:id - START - ID: ${req.params.id}`);
    const fileId = req.params.id;  // Get the unique ID from the URL (timestamp)

    // Construct the file path based on the ID
    const filePath = path.join(dataDir, `data_${fileId}.json`);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Checklist');
    }

    let formData;
    try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        formData = JSON.parse(fileData);
    } catch (error) {
        throw new FileOperationError('read', `data_${fileId}.json`, error);
    }

    // Check if checklist has already been validated
    const isAlreadyValidated = isChecklistValidated(formData);

    // Check if randomCheckboxes is available and is an array
    if (!formData.randomCheckboxes || !Array.isArray(formData.randomCheckboxes)) {
        throw new ValidationError('Random checkboxes not found in the checklist data.');
    }

    // Send the relevant parts of formData as JSON
    // The client-side (validate-checklist.html) will handle rendering.
    res.status(200).json({
        fileId: fileId,
        title: formData.title,
        // The full checkboxes object is needed for the client to find labels/headings
        checkboxes: formData.checkboxes,
        randomCheckboxes: formData.randomCheckboxes,
        isAlreadyValidated: isAlreadyValidated,
        supervisorValidation: isAlreadyValidated ? formData.supervisorValidation : null
    });

    console.log(`[Debug] GET /validate/:id - END - ID: ${req.params.id}, Already Validated: ${isAlreadyValidated}`);
}));


// POST route to handle supervisor validation form submission
app.post('/validate/:id', authenticateApi, asyncHandler(async (req, res) => {
    console.log(`[Debug] POST /validate/:id - START - ID: ${req.params.id}`);
    const fileId = req.params.id;
    const validationData = req.body;

    // Read the original checklist data
    const filePath = path.join(dataDir, `data_${fileId}.json`);
    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Checklist');
    }

    let formData;
    try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        formData = JSON.parse(fileData);
    } catch (error) {
        throw new FileOperationError('read', `data_${fileId}.json`, error);
    }

    // Check if checklist has already been validated
    const isAlreadyValidated = isChecklistValidated(formData);

    if (isAlreadyValidated) {
        return res.status(400).json({
            message: 'This checklist has already been validated and cannot be modified.',
            isAlreadyValidated: true,
            supervisorValidation: formData.supervisorValidation
        });
    }

    // Update checkboxes based on the validation data (both checked and unchecked)
    validationData.validatedCheckboxes.forEach((validatedCb) => {
        const { id: validatedId, checked: newCheckedState } = validatedCb;
        let itemUpdated = false;
        // Iterate through headings to find the validated checkbox ID
        for (const headingKey in formData.checkboxes) {
            if (formData.checkboxes[headingKey] && formData.checkboxes[headingKey][validatedId]) {
                // Update the 'checked' status of the specific checkbox item
                formData.checkboxes[headingKey][validatedId].checked = newCheckedState;
                itemUpdated = true;
                break; // Found and updated, no need to check other headings for this ID
            }
        }
        if (!itemUpdated) {
            console.warn(`Validated checkbox ID ${validatedId} not found in original checklist data under any heading.`);
        }
    });

    // Add supervisor feedback to the formData
    formData.supervisorValidation = {
        supervisorName: validationData.supervisorName,
        validatedCheckboxes: validationData.validatedCheckboxes.reduce((acc, cb) => {
            acc[cb.id] = cb.checked;
            return acc;
        }, {})
    };

    // Save the updated checklist data back to the file
    try {
        fs.writeFileSync(filePath, JSON.stringify(formData, null, 2));
    } catch (error) {
        throw new FileOperationError('write', `data_${fileId}.json`, error);
    }

    res.status(200).json({ message: 'Validation completed successfully.' });
    console.log(`[Debug] POST /validate/:id - END - ID: ${req.params.id}`);
}));

// Endpoint to check validation status of a checklist
app.get('/validate-status/:id', authenticateApi, asyncHandler(async (req, res) => {
    const fileId = req.params.id;
    const filePath = path.join(dataDir, `data_${fileId}.json`);

    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Checklist');
    }

    let formData;
    try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        formData = JSON.parse(fileData);
    } catch (error) {
        throw new FileOperationError('read', `data_${fileId}.json`, error);
    }

    const isValidated = isChecklistValidated(formData);

    res.status(200).json({
        fileId: fileId,
        title: formData.title,
        isValidated: isValidated,
        supervisorValidation: isValidated ? formData.supervisorValidation : null
    });
}));

// Endpoint to view the checklist data in the browser
app.get('/view-checklist/:id', authenticateApi, asyncHandler(async (req, res) => {
    const fileId = req.params.id;  // Get the unique ID from the URL (timestamp)

    // Construct the file path based on the ID
    const filePath = path.join(dataDir, `data_${fileId}.json`);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Checklist');
    }

    let formData;
    try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        formData = JSON.parse(fileData);
    } catch (error) {
        throw new FileOperationError('read', `data_${fileId}.json`, error);
    }

    // Send the formData as JSON response
    res.json(formData);
}));

// Endpoint to view the checklist data in a readable HTML format
app.get('/view-checklist-html/:id', authenticateApi, asyncHandler(async (req, res) => {
    const fileId = req.params.id;  // Get the unique ID from the URL (timestamp)

    // Construct the file path based on the ID
    const filePath = path.join(dataDir, `data_${fileId}.json`);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Checklist');
    }

    let formData;
    try {
        const fileData = fs.readFileSync(filePath, 'utf8');
        formData = JSON.parse(fileData);
    } catch (error) {
        throw new FileOperationError('read', `data_${fileId}.json`, error);
    }

    // Create an HTML response
    let htmlContent = `
        <html>
            <head>
                <title>Checklist Data</title>
            </head>
            <body>
                <h1>Checklist Data for ${fileId}</h1>
                <pre>${JSON.stringify(formData, null, 2)}</pre>
            </body>
        </html>
    `;

    res.send(htmlContent);
}));

// Health check routes
app.use('/', require('./routes/health'));

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Start the server
console.log('Attempting to start server...');

const sslConfig = getSSLConfig();
const PORT = sslConfig.httpPort;
const HTTPS_PORT = sslConfig.httpsPort;

if (sslConfig.enableSSL) {
    // Load SSL certificates
    const sslOptions = loadSSLCertificates(sslConfig.sslKeyPath, sslConfig.sslCertPath);

    if (sslOptions) {
        // Start HTTPS server
        const httpsServer = createHTTPSServer(app, sslOptions, HTTPS_PORT, () => {
            console.log('Backend API HTTPS Server listener callback executed.');
            console.log(`[SSL] Backend API HTTPS Server is running on https://localhost:${HTTPS_PORT}`);
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

            http.createServer(httpApp).listen(PORT, '0.0.0.0', () => {
                console.log(`[HTTP] Backend API HTTP redirect server running on http://localhost:${PORT} (redirects to HTTPS)`);
            });
        }
    } else {
        console.error('[SSL] Failed to load SSL certificates, falling back to HTTP');
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log('Backend API Server listener callback executed.');
            console.log(`[HTTP] Backend API Server is running on http://localhost:${PORT} (SSL disabled due to certificate error)`);
        });

        server.on('error', handleServerError);
    }
} else {
    // Start HTTP server only
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('Backend API Server listener callback executed.');
        console.log(`[HTTP] Backend API Server is running on http://localhost:${PORT} (SSL disabled)`);
    });

    server.on('error', handleServerError);
}

function handleServerError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof PORT === 'string'
        ? 'Pipe ' + PORT
        : 'Port ' + PORT;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(`[FATAL] ${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`[FATAL] ${bind} is already in use. Is another instance of the backend or another application using this port?`);
            process.exit(1);
            break;
        default:
            console.error(`[FATAL] Server startup error: ${error.code}`, error);
            throw error;
    }
}