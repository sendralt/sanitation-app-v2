console.log("[Debug] server.js: Server starting with latest code...");
require('dotenv').config(); // Ensure this is at the very top

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const jwt = require('jsonwebtoken'); // Add JWT module for token verification
const rateLimit = require('express-rate-limit'); // Import express-rate-limit

const cors = require('cors');
const path = require('path');
const fs = require('fs');  // Import the file system module
const http = require('http');
const db = require('./config/db'); // Import PostgreSQL configuration
const automationEngine = require('./automation/automationEngine'); // Import automation engine
const scheduledAutomation = require('./automation/scheduledAutomation'); // Import scheduled automation
const rpaIntegration = require('./automation/rpaIntegration'); // Import RPA integration
const AuditLogger = require('./utils/auditLogger'); // Import audit logger

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

// Define the rate limiter with more reasonable limits
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.DISABLE_RATE_LIMITING === 'true' ? 999999 :
       (process.env.NODE_ENV === 'development' ? 2000 : 500), // Much higher limits for development
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
  // Skip rate limiting for health checks and certain endpoints
  skip: (req) => {
    const skipPaths = ['/health', '/ready', '/live'];
    return skipPaths.some(path => req.path.startsWith(path));
  }
});

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

app.post('/submit-form', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
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

    // --- NEW: Save to PostgreSQL ---
    const client = await db.getClient(); // Get a client from the pool for transaction
    try {
        await client.query('BEGIN');

        // Insert into ChecklistSubmissions
        const submissionRes = await client.query(
            `INSERT INTO "ChecklistSubmissions"
             ("original_checklist_filename", "checklist_title", "submitted_by_user_id", "submitted_by_username", "status", "json_file_path")
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING "submission_id"`,
            [
                formData.original_checklist_filename || formData.title, // Use original_checklist_filename if available, else title
                formData.title,
                req.user.userId.toString(), // Convert UUID to string
                req.user.username, // Assuming JWT payload has username
                'PendingSupervisorValidation',
                filePath
            ]
        );
        const submissionId = submissionRes.rows[0].submission_id;

        // Iterate through headings and tasks from formData.checkboxes
        let headingOrder = 0;
        for (const headingText in formData.checkboxes) {
            if (Object.hasOwnProperty.call(formData.checkboxes, headingText)) {
                headingOrder++;
                const headingRes = await client.query(
                    `INSERT INTO "SubmissionHeadings" ("submission_id", "heading_text", "display_order")
                     VALUES ($1, $2, $3) RETURNING "heading_id"`,
                    [submissionId, headingText, headingOrder]
                );
                const headingId = headingRes.rows[0].heading_id;

                const tasks = formData.checkboxes[headingText];
                for (const taskIdentifier in tasks) {
                    if (Object.hasOwnProperty.call(tasks, taskIdentifier)) {
                        const taskData = tasks[taskIdentifier];
                        await client.query(
                            `INSERT INTO "SubmissionTasks"
                             ("heading_id", "task_identifier_in_json", "task_label", "is_checked_on_submission", "current_status")
                             VALUES ($1, $2, $3, $4, $5)`,
                            [
                                headingId,
                                taskIdentifier,
                                taskData.label,
                                taskData.checked,
                                'Pending' // Initial status for tasks in PG
                            ]
                        );
                    }
                }
            }
        }

        // Log to AuditTrail
        await AuditLogger.logSubmission(
            req.user.userId,
            submissionId,
            'SUBMITTED',
            {
                checklistTitle: formData.title,
                originalFilename: formData.original_checklist_filename || formData.title,
                timestamp: timestamp,
                totalTasks: Object.keys(formData.checkboxes || {}).length
            },
            client
        );

        await client.query('COMMIT');
        console.log(`[DB] Successfully saved submission ${submissionId} to PostgreSQL.`);

        // Trigger Automation Engine after successful database commit
        try {
            await automationEngine.processAutomationTrigger(
                submissionId,
                'ON_SUBMISSION_COMPLETE',
                formData.original_checklist_filename || formData.title
            );
        } catch (automationError) {
            console.error('[Automation] Error processing submission trigger:', automationError);
            // Don't fail the submission if automation fails
        }
    } catch (dbError) {
        await client.query('ROLLBACK');
        console.error('[DB] Error saving submission to PostgreSQL, transaction rolled back:', dbError);
        // Decide if this should be a critical error stopping the response or just log and continue
        // For now, we'll let the email sending proceed as JSON file was saved.
        // Consider throwing a new DatabaseError if this should halt the process:
        // throw new DatabaseError('save submission', { originalError: dbError });
    } finally {
        client.release(); // Release client back to the pool
    }
    // --- END NEW: Save to PostgreSQL ---

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
app.get('/validate/:id', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
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
        supervisorValidation: isAlreadyValidated ? formData.supervisorValidation : null,
        submission_id: formData.submission_id // Include submission_id in the response
    });

    console.log(`[Debug] GET /validate/:id - END - ID: ${req.params.id}, Already Validated: ${isAlreadyValidated}`);
}));



// POST route to handle supervisor validation form submission
app.post('/validate/:id', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
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

    // --- NEW: Save validation data to PostgreSQL and AuditTrail ---
    const client = await db.getClient(); // Get a client from the pool for transaction
    try {
        await client.query('BEGIN');

        // 1. Update ChecklistSubmissions status
        await client.query(
            `UPDATE "ChecklistSubmissions" SET "status" = 'SupervisorValidated' WHERE "submission_id" = $1`,
            [formData.submission_id]
        );

        // 2. Insert into SupervisorValidationsLog with new structure
        const validationRes = await client.query(
            `INSERT INTO "SupervisorValidationsLog" ("submission_id", "supervisor_name", "validated_items_summary")
             VALUES ($1, $2, $3) RETURNING "validation_log_id"`,
            [
                formData.submission_id,
                validationData.supervisorName,
                JSON.stringify(validationData.validatedCheckboxes)
            ]
        );
        const validationLogId = validationRes.rows[0].validation_log_id;

        // 3. Update individual task validation statuses
        for (const validatedItem of validationData.validatedCheckboxes) {
            await client.query(`
                UPDATE "SubmissionTasks"
                SET "supervisor_validated_status" = $1,
                    "current_status" = CASE WHEN $1 = true THEN 'ValidatedOK' ELSE 'ValidatedNotOK' END,
                    "last_status_update_timestamp" = NOW()
                WHERE "heading_id" IN (
                    SELECT "heading_id" FROM "SubmissionHeadings" WHERE "submission_id" = $2
                ) AND "task_identifier_in_json" = $3
            `, [validatedItem.checked, formData.submission_id, validatedItem.id]);
        }

        // 4. Log to AuditTrail
        await AuditLogger.logValidation(
            req.user.userId,
            formData.submission_id,
            'VALIDATED_BY_SUPERVISOR',
            {
                supervisorName: validationData.supervisorName,
                validatedItemsCount: validationData.validatedCheckboxes.length,
                validationLogId: validationLogId,
                validatedItems: validationData.validatedCheckboxes
            },
            client
        );

        await client.query('COMMIT');
        console.log(`[DB] Successfully saved validation data ${validationLogId} to PostgreSQL.`);

        // Trigger Automation Engine after successful validation
        try {
            await automationEngine.processAutomationTrigger(
                formData.submission_id,
                'ON_SUPERVISOR_VALIDATION',
                formData.original_checklist_filename || formData.title
            );
        } catch (automationError) {
            console.error('[Automation] Error processing validation trigger:', automationError);
            // Don't fail the validation if automation fails
        }

    } catch (dbError) {
        await client.query('ROLLBACK');
        console.error('[DB] Error saving validation data to PostgreSQL, transaction rolled back:', dbError);
    } finally {
        client.release(); // Release client back to the pool
    }
    // --- END NEW: Save validation data to PostgreSQL and AuditTrail ---

    res.status(200).json({ message: 'Validation completed successfully.' });
    console.log(`[Debug] POST /validate/:id - END - ID: ${req.params.id}`);
}));




// Endpoint to check validation status of a checklist
app.get('/validate-status/:id', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
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
app.get('/view-checklist/:id', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
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
app.get('/view-checklist-html/:id', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
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

// User Assignment API Endpoints for Phase 2

// Get user's active checklist assignments
app.get('/api/user/assignments', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    try {
        const assignments = await db.query(`
            SELECT
                ca."assignment_id",
                ca."assignment_timestamp",
                ca."due_timestamp",
                ca."status" as assignment_status,
                cs."submission_id",
                cs."checklist_title",
                cs."original_checklist_filename",
                cs."status" as submission_status,
                cs."due_date",
                ar."rule_id",
                ar."source_checklist_filename_pattern"
            FROM "ChecklistAssignments" ca
            JOIN "ChecklistSubmissions" cs ON ca."submission_id" = cs."submission_id"
            LEFT JOIN "AutomationRules" ar ON ca."automation_rule_id" = ar."rule_id"
            WHERE ca."assigned_to_user_id" = $1
            AND ca."status" IN ('Assigned', 'InProgress')
            ORDER BY ca."due_timestamp" ASC, ca."assignment_timestamp" DESC
        `, [userId]);

        res.json({
            success: true,
            assignments: assignments.rows
        });
    } catch (error) {
        console.error('[API] Error fetching user assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignments'
        });
    }
}));

// Get user's recent submissions
app.get('/api/user/submissions', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    try {
        const submissions = await db.query(`
            SELECT
                cs."submission_id",
                cs."checklist_title",
                cs."original_checklist_filename",
                cs."submission_timestamp",
                cs."status",
                cs."due_date",
                svl."validation_timestamp",
                svl."supervisor_name"
            FROM "ChecklistSubmissions" cs
            LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
            WHERE cs."submitted_by_user_id" = $1
            ORDER BY cs."submission_timestamp" DESC
            LIMIT $2 OFFSET $3
        `, [userId, limit, offset]);

        const totalCount = await db.query(
            'SELECT COUNT(*) as count FROM "ChecklistSubmissions" WHERE "submitted_by_user_id" = $1',
            [userId]
        );

        res.json({
            success: true,
            submissions: submissions.rows,
            total: parseInt(totalCount.rows[0].count),
            limit,
            offset
        });
    } catch (error) {
        console.error('[API] Error fetching user submissions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submissions'
        });
    }
}));

// Get assignment details with tasks
app.get('/api/assignments/:assignmentId', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const assignmentId = req.params.assignmentId;
    const userId = req.user.userId;

    try {
        // Get assignment details
        const assignment = await db.query(`
            SELECT
                ca.*,
                cs."checklist_title",
                cs."original_checklist_filename",
                cs."status" as submission_status
            FROM "ChecklistAssignments" ca
            JOIN "ChecklistSubmissions" cs ON ca."submission_id" = cs."submission_id"
            WHERE ca."assignment_id" = $1 AND ca."assigned_to_user_id" = $2
        `, [assignmentId, userId]);

        if (assignment.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        // Get headings and tasks for this assignment
        const headings = await db.query(`
            SELECT
                sh."heading_id",
                sh."heading_text",
                sh."display_order"
            FROM "SubmissionHeadings" sh
            WHERE sh."submission_id" = $1
            ORDER BY sh."display_order"
        `, [assignment.rows[0].submission_id]);

        const tasks = await db.query(`
            SELECT
                st."task_id",
                st."heading_id",
                st."task_identifier_in_json",
                st."task_label",
                st."current_status",
                st."is_checked_on_submission",
                st."supervisor_validated_status",
                st."comments",
                st."last_status_update_timestamp"
            FROM "SubmissionTasks" st
            JOIN "SubmissionHeadings" sh ON st."heading_id" = sh."heading_id"
            WHERE sh."submission_id" = $1
            ORDER BY sh."display_order", st."task_id"
        `, [assignment.rows[0].submission_id]);

        // Group tasks by heading
        const headingsWithTasks = headings.rows.map(heading => ({
            ...heading,
            tasks: tasks.rows.filter(task => task.heading_id === heading.heading_id)
        }));

        res.json({
            success: true,
            assignment: assignment.rows[0],
            headings: headingsWithTasks
        });
    } catch (error) {
        console.error('[API] Error fetching assignment details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignment details'
        });
    }
}));

// Update assignment status (e.g., mark as in progress)
app.patch('/api/assignments/:assignmentId/status', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const assignmentId = req.params.assignmentId;
    const userId = req.user.userId;
    const { status } = req.body;

    const validStatuses = ['Assigned', 'InProgress', 'SubmittedForValidation', 'Overdue'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status'
        });
    }

    try {
        const result = await db.query(`
            UPDATE "ChecklistAssignments"
            SET "status" = $1, "updated_at" = NOW()
            WHERE "assignment_id" = $2 AND "assigned_to_user_id" = $3
            RETURNING *
        `, [status, assignmentId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found'
            });
        }

        // Log the status change
        await AuditLogger.logAssignment(
            userId,
            'ASSIGNMENT_STATUS_CHANGED',
            {
                assignmentId: assignmentId,
                newStatus: status,
                oldStatus: result.rows[0].status
            }
        );

        res.json({
            success: true,
            message: 'Assignment status updated successfully'
        });
    } catch (error) {
        console.error('[API] Error updating assignment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update assignment status'
        });
    }
}));


// Team Management API Endpoints for Phase 3

// Get all teams (for managers and admins)
app.get('/api/teams', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    try {
        const teams = await db.query(`
            SELECT
                t."team_id",
                t."team_name",
                t."description",
                t."manager_user_id",
                t."parent_team_id",
                t."is_active",
                t."created_at",
                COUNT(tm."user_id") as member_count
            FROM "Teams" t
            LEFT JOIN "TeamMembers" tm ON t."team_id" = tm."team_id" AND tm."is_active" = true
            WHERE t."is_active" = true
            GROUP BY t."team_id", t."team_name", t."description", t."manager_user_id", t."parent_team_id", t."is_active", t."created_at"
            ORDER BY t."team_name"
        `);

        res.json({
            success: true,
            teams: teams.rows
        });
    } catch (error) {
        console.error('[API] Error fetching teams:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch teams'
        });
    }
}));

// Get team members for a specific team
app.get('/api/teams/:teamId/members', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    try {
        const members = await db.query(`
            SELECT
                tm."team_member_id",
                tm."user_id",
                tm."role_in_team",
                tm."joined_at",
                tm."is_active"
            FROM "TeamMembers" tm
            WHERE tm."team_id" = $1 AND tm."is_active" = true
            ORDER BY tm."role_in_team", tm."joined_at"
        `, [teamId]);

        res.json({
            success: true,
            members: members.rows
        });
    } catch (error) {
        console.error('[API] Error fetching team members:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team members'
        });
    }
}));

// Get teams for current user (what teams they belong to)
app.get('/api/user/teams', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    try {
        const userTeams = await db.query(`
            SELECT
                t."team_id",
                t."team_name",
                t."description",
                tm."role_in_team",
                tm."joined_at"
            FROM "Teams" t
            INNER JOIN "TeamMembers" tm ON t."team_id" = tm."team_id"
            WHERE tm."user_id" = $1 AND tm."is_active" = true AND t."is_active" = true
            ORDER BY t."team_name"
        `, [userId]);

        res.json({
            success: true,
            teams: userTeams.rows
        });
    } catch (error) {
        console.error('[API] Error fetching user teams:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user teams'
        });
    }
}));

// Add user to team (for managers)
app.post('/api/teams/:teamId/members', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const { userId, roleInTeam = 'member' } = req.body;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    if (!userId) {
        return res.status(400).json({
            success: false,
            message: 'User ID is required'
        });
    }

    try {
        // Check if user is already a member
        const existingMember = await db.query(`
            SELECT "team_member_id" FROM "TeamMembers"
            WHERE "team_id" = $1 AND "user_id" = $2
        `, [teamId, userId]);

        if (existingMember.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User is already a member of this team'
            });
        }

        // Add user to team
        const result = await db.query(`
            INSERT INTO "TeamMembers" ("team_id", "user_id", "role_in_team")
            VALUES ($1, $2, $3)
            RETURNING "team_member_id"
        `, [teamId, userId, roleInTeam]);

        // Log the action using enhanced audit logger
        await AuditLogger.logTeamManagement(req.user.userId, 'TEAM_MEMBER_ADDED', {
            teamId,
            addedUserId: userId,
            roleInTeam,
            addedBy: req.user.userId
        });

        res.json({
            success: true,
            message: 'User added to team successfully',
            teamMemberId: result.rows[0].team_member_id
        });
    } catch (error) {
        console.error('[API] Error adding user to team:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add user to team'
        });
    }
}));

// Remove user from team (for managers)
app.delete('/api/teams/:teamId/members/:userId', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const teamId = req.params.teamId;
    const userId = req.params.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    try {
        // Soft delete by setting is_active to false
        const result = await db.query(`
            UPDATE "TeamMembers"
            SET "is_active" = false
            WHERE "team_id" = $1 AND "user_id" = $2
            RETURNING "team_member_id"
        `, [teamId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Team member not found'
            });
        }

        // Log the action using enhanced audit logger
        await AuditLogger.logTeamManagement(req.user.userId, 'TEAM_MEMBER_REMOVED', {
            teamId,
            removedUserId: userId,
            removedBy: req.user.userId
        });

        res.json({
            success: true,
            message: 'User removed from team successfully'
        });
    } catch (error) {
        console.error('[API] Error removing user from team:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove user from team'
        });
    }
}));

// Manager Dashboard API Endpoints for Phase 3

// Get manager dashboard statistics
app.get('/api/manager/stats', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log dashboard access
    await AuditLogger.logDashboardAccess(userId, 'manager', {
        endpoint: '/api/manager/stats',
        userRole
    });

    try {
        // Get teams managed by this user
        const managedTeams = await db.query(`
            SELECT "team_id" FROM "Teams"
            WHERE "manager_user_id" = $1 AND "is_active" = true
        `, [userId]);

        const teamIds = managedTeams.rows.map(row => row.team_id);

        // If admin, get all teams
        let teamFilter = '';
        let queryParams = [];

        if (userRole === 'admin') {
            // Admin sees all data
            teamFilter = '';
        } else if (teamIds.length > 0) {
            // Manager sees their teams' data
            teamFilter = `AND ca."team_id" = ANY($1)`;
            queryParams = [teamIds];
        } else {
            // No teams managed, return empty stats
            return res.json({
                success: true,
                stats: {
                    totalTeamMembers: 0,
                    activeAssignments: 0,
                    overdueAssignments: 0,
                    completedThisMonth: 0,
                    avgValidationTime: 0,
                    teamCompletionRate: 0
                }
            });
        }

        // Get total team members
        const teamMembersQuery = userRole === 'admin'
            ? 'SELECT COUNT(DISTINCT "user_id") as count FROM "TeamMembers" WHERE "is_active" = true'
            : `SELECT COUNT(DISTINCT tm."user_id") as count
               FROM "TeamMembers" tm
               WHERE tm."team_id" = ANY($1) AND tm."is_active" = true`;

        const teamMembersParams = userRole === 'admin' ? [] : [teamIds];
        const totalTeamMembers = await db.query(teamMembersQuery, teamMembersParams);

        // Get active assignments for team members
        const activeAssignmentsQuery = userRole === 'admin'
            ? `SELECT COUNT(*) as count FROM "ChecklistAssignments"
               WHERE "status" IN ('Assigned', 'InProgress')`
            : `SELECT COUNT(*) as count FROM "ChecklistAssignments" ca
               INNER JOIN "TeamMembers" tm ON ca."assigned_to_user_id" = tm."user_id"
               WHERE ca."status" IN ('Assigned', 'InProgress')
               AND tm."team_id" = ANY($1) AND tm."is_active" = true`;

        const activeAssignments = await db.query(activeAssignmentsQuery,
            userRole === 'admin' ? [] : [teamIds]);

        // Get overdue assignments
        const overdueAssignmentsQuery = userRole === 'admin'
            ? `SELECT COUNT(*) as count FROM "ChecklistAssignments"
               WHERE "status" IN ('Assigned', 'InProgress') AND "due_timestamp" < NOW()`
            : `SELECT COUNT(*) as count FROM "ChecklistAssignments" ca
               INNER JOIN "TeamMembers" tm ON ca."assigned_to_user_id" = tm."user_id"
               WHERE ca."status" IN ('Assigned', 'InProgress')
               AND ca."due_timestamp" < NOW()
               AND tm."team_id" = ANY($1) AND tm."is_active" = true`;

        const overdueAssignments = await db.query(overdueAssignmentsQuery,
            userRole === 'admin' ? [] : [teamIds]);

        // Get completed submissions this month for team
        const completedThisMonthQuery = userRole === 'admin'
            ? `SELECT COUNT(*) as count FROM "ChecklistSubmissions"
               WHERE "submission_timestamp" >= DATE_TRUNC('month', NOW())
               AND "status" = 'SupervisorValidated'`
            : `SELECT COUNT(*) as count FROM "ChecklistSubmissions" cs
               INNER JOIN "TeamMembers" tm ON cs."submitted_by_user_id" = tm."user_id"
               WHERE cs."submission_timestamp" >= DATE_TRUNC('month', NOW())
               AND cs."status" = 'SupervisorValidated'
               AND tm."team_id" = ANY($1) AND tm."is_active" = true`;

        const completedThisMonth = await db.query(completedThisMonthQuery,
            userRole === 'admin' ? [] : [teamIds]);

        // Get average validation turnaround time
        const avgValidationQuery = userRole === 'admin'
            ? `SELECT AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as avg_hours
               FROM "SupervisorValidationsLog" svl
               INNER JOIN "ChecklistSubmissions" cs ON svl."submission_id" = cs."submission_id"
               WHERE svl."validation_timestamp" >= NOW() - INTERVAL '30 days'`
            : `SELECT AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as avg_hours
               FROM "SupervisorValidationsLog" svl
               INNER JOIN "ChecklistSubmissions" cs ON svl."submission_id" = cs."submission_id"
               INNER JOIN "TeamMembers" tm ON cs."submitted_by_user_id" = tm."user_id"
               WHERE svl."validation_timestamp" >= NOW() - INTERVAL '30 days'
               AND tm."team_id" = ANY($1) AND tm."is_active" = true`;

        const avgValidation = await db.query(avgValidationQuery,
            userRole === 'admin' ? [] : [teamIds]);

        res.json({
            success: true,
            stats: {
                totalTeamMembers: parseInt(totalTeamMembers.rows[0].count),
                activeAssignments: parseInt(activeAssignments.rows[0].count),
                overdueAssignments: parseInt(overdueAssignments.rows[0].count),
                completedThisMonth: parseInt(completedThisMonth.rows[0].count),
                avgValidationTime: parseFloat(avgValidation.rows[0].avg_hours) || 0,
                teamCompletionRate: 0 // Will be calculated separately
            }
        });
    } catch (error) {
        console.error('[API] Error fetching manager stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch manager statistics'
        });
    }
}));

// Get team assignments overview for manager
app.get('/api/manager/team-assignments', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    try {
        // Get teams managed by this user
        const managedTeams = await db.query(`
            SELECT "team_id", "team_name" FROM "Teams"
            WHERE "manager_user_id" = $1 AND "is_active" = true
        `, [userId]);

        const teamIds = managedTeams.rows.map(row => row.team_id);

        let assignmentsQuery;
        let queryParams;

        if (userRole === 'admin') {
            // Admin sees all assignments
            assignmentsQuery = `
                SELECT
                    ca."assignment_id",
                    ca."assigned_to_user_id",
                    ca."assignment_timestamp",
                    ca."due_timestamp",
                    ca."status",
                    cs."checklist_title",
                    cs."original_checklist_filename",
                    cs."submission_id",
                    t."team_name"
                FROM "ChecklistAssignments" ca
                INNER JOIN "ChecklistSubmissions" cs ON ca."submission_id" = cs."submission_id"
                LEFT JOIN "Teams" t ON ca."team_id" = t."team_id"
                ORDER BY ca."assignment_timestamp" DESC
                LIMIT $1 OFFSET $2
            `;
            queryParams = [limit, offset];
        } else if (teamIds.length > 0) {
            // Manager sees their teams' assignments
            assignmentsQuery = `
                SELECT
                    ca."assignment_id",
                    ca."assigned_to_user_id",
                    ca."assignment_timestamp",
                    ca."due_timestamp",
                    ca."status",
                    cs."checklist_title",
                    cs."original_checklist_filename",
                    cs."submission_id",
                    t."team_name"
                FROM "ChecklistAssignments" ca
                INNER JOIN "ChecklistSubmissions" cs ON ca."submission_id" = cs."submission_id"
                INNER JOIN "TeamMembers" tm ON ca."assigned_to_user_id" = tm."user_id"
                LEFT JOIN "Teams" t ON ca."team_id" = t."team_id"
                WHERE tm."team_id" = ANY($1) AND tm."is_active" = true
                ORDER BY ca."assignment_timestamp" DESC
                LIMIT $2 OFFSET $3
            `;
            queryParams = [teamIds, limit, offset];
        } else {
            // No teams managed
            return res.json({
                success: true,
                assignments: [],
                total: 0,
                limit,
                offset
            });
        }

        const assignments = await db.query(assignmentsQuery, queryParams);

        res.json({
            success: true,
            assignments: assignments.rows,
            total: assignments.rows.length,
            limit,
            offset,
            managedTeams: managedTeams.rows
        });
    } catch (error) {
        console.error('[API] Error fetching team assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team assignments'
        });
    }
}));

// Get team performance analytics for manager
app.get('/api/manager/team-performance', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const days = parseInt(req.query.days) || 30;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    try {
        // Get teams managed by this user
        const managedTeams = await db.query(`
            SELECT "team_id", "team_name" FROM "Teams"
            WHERE "manager_user_id" = $1 AND "is_active" = true
        `, [userId]);

        const teamIds = managedTeams.rows.map(row => row.team_id);

        let performanceQuery;
        let queryParams;

        if (userRole === 'admin') {
            // Admin sees all team performance
            performanceQuery = `
                SELECT
                    t."team_name",
                    COUNT(DISTINCT tm."user_id") as team_size,
                    COUNT(cs."submission_id") as total_submissions,
                    COUNT(CASE WHEN cs."status" = 'SupervisorValidated' THEN 1 END) as completed_submissions,
                    COUNT(CASE WHEN ca."due_timestamp" < NOW() AND ca."status" IN ('Assigned', 'InProgress') THEN 1 END) as overdue_assignments,
                    AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as avg_validation_hours
                FROM "Teams" t
                LEFT JOIN "TeamMembers" tm ON t."team_id" = tm."team_id" AND tm."is_active" = true
                LEFT JOIN "ChecklistSubmissions" cs ON tm."user_id" = cs."submitted_by_user_id"
                    AND cs."submission_timestamp" >= NOW() - INTERVAL '$1 days'
                LEFT JOIN "ChecklistAssignments" ca ON tm."user_id" = ca."assigned_to_user_id"
                LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
                WHERE t."is_active" = true
                GROUP BY t."team_id", t."team_name"
                ORDER BY t."team_name"
            `;
            queryParams = [days];
        } else if (teamIds.length > 0) {
            // Manager sees their teams' performance
            performanceQuery = `
                SELECT
                    t."team_name",
                    COUNT(DISTINCT tm."user_id") as team_size,
                    COUNT(cs."submission_id") as total_submissions,
                    COUNT(CASE WHEN cs."status" = 'SupervisorValidated' THEN 1 END) as completed_submissions,
                    COUNT(CASE WHEN ca."due_timestamp" < NOW() AND ca."status" IN ('Assigned', 'InProgress') THEN 1 END) as overdue_assignments,
                    AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as avg_validation_hours
                FROM "Teams" t
                LEFT JOIN "TeamMembers" tm ON t."team_id" = tm."team_id" AND tm."is_active" = true
                LEFT JOIN "ChecklistSubmissions" cs ON tm."user_id" = cs."submitted_by_user_id"
                    AND cs."submission_timestamp" >= NOW() - INTERVAL '$1 days'
                LEFT JOIN "ChecklistAssignments" ca ON tm."user_id" = ca."assigned_to_user_id"
                LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
                WHERE t."team_id" = ANY($2) AND t."is_active" = true
                GROUP BY t."team_id", t."team_name"
                ORDER BY t."team_name"
            `;
            queryParams = [days, teamIds];
        } else {
            // No teams managed
            return res.json({
                success: true,
                performance: [],
                period: `${days} days`
            });
        }

        const performance = await db.query(performanceQuery, queryParams);

        // Calculate completion rates
        const performanceWithRates = performance.rows.map(team => ({
            ...team,
            completion_rate: team.total_submissions > 0
                ? (team.completed_submissions / team.total_submissions * 100).toFixed(1)
                : 0,
            avg_validation_hours: parseFloat(team.avg_validation_hours) || 0
        }));

        res.json({
            success: true,
            performance: performanceWithRates,
            period: `${days} days`,
            managedTeams: managedTeams.rows
        });
    } catch (error) {
        console.error('[API] Error fetching team performance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team performance'
        });
    }
}));

// Get audit trail for managers (Phase 3)
app.get('/api/manager/audit-trail', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const category = req.query.category || 'all';
    const limit = parseInt(req.query.limit) || 50;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log audit access
    await AuditLogger.logAnalyticsAccess(userId, 'audit_trail', {
        category,
        limit,
        startDate,
        endDate
    });

    try {
        let auditData;

        if (category === 'all') {
            if (userRole === 'admin') {
                auditData = await AuditLogger.getRecentAuditEvents(limit);
            } else {
                // Managers see their team-related audit events
                auditData = await AuditLogger.getManagerActivityReport(userId, startDate, endDate);
            }
        } else {
            auditData = await AuditLogger.getAuditByCategory(category, limit, startDate, endDate);
        }

        res.json({
            success: true,
            auditTrail: auditData,
            category,
            limit
        });
    } catch (error) {
        console.error('[API] Error fetching audit trail:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit trail'
        });
    }
}));

// Get compliance report for managers (Phase 3)
app.get('/api/manager/compliance-report', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = req.query.endDate || new Date().toISOString();

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log compliance report access
    await AuditLogger.logAnalyticsAccess(userId, 'compliance_report', {
        startDate,
        endDate
    });

    try {
        const complianceData = await AuditLogger.getComplianceReport(startDate, endDate);

        res.json({
            success: true,
            complianceReport: complianceData,
            period: {
                startDate,
                endDate
            }
        });
    } catch (error) {
        console.error('[API] Error fetching compliance report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance report'
        });
    }
}));

// BI and Analytics API Endpoints for Phase 3

// Get submission summary analytics
app.get('/api/analytics/submissions', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const limit = parseInt(req.query.limit) || 100;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log analytics access
    await AuditLogger.logAnalyticsAccess(userId, 'submission_analytics', {
        limit,
        startDate,
        endDate
    });

    try {
        let whereClause = '';
        let params = [limit];
        let paramIndex = 2;

        if (startDate && endDate) {
            whereClause = 'WHERE "submission_timestamp" BETWEEN $2 AND $3';
            params = [limit, startDate, endDate];
            paramIndex = 4;
        } else if (startDate) {
            whereClause = 'WHERE "submission_timestamp" >= $2';
            params = [limit, startDate];
            paramIndex = 3;
        }

        const submissions = await db.query(`
            SELECT * FROM "v_submission_summary"
            ${whereClause}
            ORDER BY "submission_timestamp" DESC
            LIMIT $1
        `, params);

        res.json({
            success: true,
            submissions: submissions.rows,
            total: submissions.rows.length,
            limit
        });
    } catch (error) {
        console.error('[API] Error fetching submission analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch submission analytics'
        });
    }
}));

// Get team performance analytics
app.get('/api/analytics/team-performance', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log analytics access
    await AuditLogger.logAnalyticsAccess(userId, 'team_performance', {});

    try {
        let query = 'SELECT * FROM "v_team_performance" ORDER BY "team_name"';
        let params = [];

        // If manager (not admin), filter to their teams
        if (userRole === 'manager') {
            query = 'SELECT * FROM "v_team_performance" WHERE "manager_user_id" = $1 ORDER BY "team_name"';
            params = [userId];
        }

        const teamPerformance = await db.query(query, params);

        res.json({
            success: true,
            teamPerformance: teamPerformance.rows
        });
    } catch (error) {
        console.error('[API] Error fetching team performance analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team performance analytics'
        });
    }
}));

// Get compliance metrics
app.get('/api/analytics/compliance', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const days = parseInt(req.query.days) || 30;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log analytics access
    await AuditLogger.logAnalyticsAccess(userId, 'compliance_metrics', { days });

    try {
        const compliance = await db.query(`
            SELECT * FROM "v_compliance_metrics"
            WHERE "submission_date" >= NOW() - INTERVAL '${days} days'
            ORDER BY "submission_date" DESC, "original_checklist_filename"
        `);

        res.json({
            success: true,
            complianceMetrics: compliance.rows,
            period: `${days} days`
        });
    } catch (error) {
        console.error('[API] Error fetching compliance metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance metrics'
        });
    }
}));

// Get assignment analytics
app.get('/api/analytics/assignments', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const status = req.query.status; // optional filter

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log analytics access
    await AuditLogger.logAnalyticsAccess(userId, 'assignment_analytics', { status });

    try {
        let whereClause = '';
        let params = [];

        if (status) {
            whereClause = 'WHERE "status" = $1';
            params = [status];
        }

        const assignments = await db.query(`
            SELECT * FROM "v_assignment_analytics"
            ${whereClause}
            ORDER BY "assignment_timestamp" DESC
            LIMIT 200
        `, params);

        res.json({
            success: true,
            assignments: assignments.rows
        });
    } catch (error) {
        console.error('[API] Error fetching assignment analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assignment analytics'
        });
    }
}));

// Manual Assignment API Endpoints for Phase 3

// Get available checklists for manual assignment
app.get('/api/manager/available-checklists', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    try {
        // Get distinct checklist types from existing submissions
        const checklists = await db.query(`
            SELECT DISTINCT
                "original_checklist_filename",
                "checklist_title",
                COUNT(*) as usage_count,
                MAX("submission_timestamp") as last_used
            FROM "ChecklistSubmissions"
            WHERE "original_checklist_filename" IS NOT NULL
            GROUP BY "original_checklist_filename", "checklist_title"
            ORDER BY usage_count DESC, last_used DESC
        `);

        res.json({
            success: true,
            checklists: checklists.rows
        });
    } catch (error) {
        console.error('[API] Error fetching available checklists:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available checklists'
        });
    }
}));

// Create manual assignment
app.post('/api/manager/manual-assignment', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const managerId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const {
        assignedUserId,
        checklistFilename,
        checklistTitle,
        dueDate,
        notes,
        teamId
    } = req.body;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Validate required fields
    if (!assignedUserId || !checklistFilename || !checklistTitle) {
        return res.status(400).json({
            success: false,
            message: 'Assigned user, checklist filename, and title are required'
        });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // Create a new "shell" submission for the manual assignment
        const submissionResult = await client.query(`
            INSERT INTO "ChecklistSubmissions" (
                "original_checklist_filename",
                "checklist_title",
                "submitted_by_user_id",
                "submission_timestamp",
                "status",
                "due_date",
                "assigned_to_user_id"
            ) VALUES ($1, $2, $3, NOW(), 'Assigned', $4, $5)
            RETURNING "submission_id"
        `, [
            checklistFilename,
            checklistTitle,
            null, // No original submitter for manual assignments
            dueDate || null,
            assignedUserId
        ]);

        const submissionId = submissionResult.rows[0].submission_id;

        // Create assignment record
        const assignmentResult = await client.query(`
            INSERT INTO "ChecklistAssignments" (
                "submission_id",
                "assigned_to_user_id",
                "assignment_timestamp",
                "due_timestamp",
                "status",
                "assigned_by_user_id",
                "team_id",
                "assignment_notes"
            ) VALUES ($1, $2, NOW(), $3, 'Assigned', $4, $5, $6)
            RETURNING "assignment_id"
        `, [
            submissionId,
            assignedUserId,
            dueDate || null,
            managerId,
            teamId || null,
            notes || null
        ]);

        const assignmentId = assignmentResult.rows[0].assignment_id;

        // TODO: Parse checklist structure and create SubmissionHeadings/SubmissionTasks
        // For now, we'll create a placeholder structure

        // Log the manual assignment
        await AuditLogger.logManualAssignment(managerId, assignedUserId, submissionId, {
            checklistFilename,
            checklistTitle,
            dueDate,
            notes,
            teamId,
            assignmentId
        });

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Manual assignment created successfully',
            assignmentId,
            submissionId
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[API] Error creating manual assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create manual assignment'
        });
    } finally {
        client.release();
    }
}));

// Get manual assignments created by manager
app.get('/api/manager/manual-assignments', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const managerId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    try {
        let whereClause = 'WHERE ca."assigned_by_user_id" = $1';
        let params = [managerId, limit];
        let paramIndex = 3;

        if (userRole === 'admin') {
            // Admin can see all manual assignments
            whereClause = 'WHERE ca."assigned_by_user_id" IS NOT NULL';
            params = [limit];
            paramIndex = 2;
        }

        if (status) {
            whereClause += ` AND ca."status" = $${paramIndex}`;
            params.splice(-1, 0, status);
            paramIndex++;
        }

        const assignments = await db.query(`
            SELECT
                ca."assignment_id",
                ca."assigned_to_user_id",
                ca."assignment_timestamp",
                ca."due_timestamp",
                ca."status",
                ca."assignment_notes",
                cs."checklist_title",
                cs."original_checklist_filename",
                cs."submission_id",
                t."team_name"
            FROM "ChecklistAssignments" ca
            INNER JOIN "ChecklistSubmissions" cs ON ca."submission_id" = cs."submission_id"
            LEFT JOIN "Teams" t ON ca."team_id" = t."team_id"
            ${whereClause}
            ORDER BY ca."assignment_timestamp" DESC
            LIMIT $${params.length}
        `, params);

        res.json({
            success: true,
            assignments: assignments.rows,
            total: assignments.rows.length
        });
    } catch (error) {
        console.error('[API] Error fetching manual assignments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch manual assignments'
        });
    }
}));

// Update manual assignment status
app.patch('/api/manager/manual-assignment/:assignmentId', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const managerId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const assignmentId = req.params.assignmentId;
    const { status, notes } = req.body;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    const validStatuses = ['Assigned', 'InProgress', 'Cancelled', 'Completed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status'
        });
    }

    try {
        // Update assignment
        const result = await db.query(`
            UPDATE "ChecklistAssignments"
            SET "status" = $1, "assignment_notes" = COALESCE($2, "assignment_notes")
            WHERE "assignment_id" = $3
            AND ("assigned_by_user_id" = $4 OR $5 = 'admin')
            RETURNING "assignment_id", "assigned_to_user_id", "submission_id"
        `, [status, notes, assignmentId, managerId, userRole]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Assignment not found or access denied'
            });
        }

        const assignment = result.rows[0];

        // Log the status change
        await AuditLogger.logManagerAction(managerId, 'MANUAL_ASSIGNMENT_UPDATED', {
            assignmentId,
            newStatus: status,
            notes,
            assignedUserId: assignment.assigned_to_user_id,
            submissionId: assignment.submission_id
        });

        res.json({
            success: true,
            message: 'Assignment updated successfully'
        });
    } catch (error) {
        console.error('[API] Error updating manual assignment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update assignment'
        });
    }
}));

// Get team completion trends for analytics
app.get('/api/analytics/completion-trends', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const days = parseInt(req.query.days) || 30;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log analytics access
    await AuditLogger.logAnalyticsAccess(userId, 'completion_trends', { days });

    try {
        // Get daily completion trends
        const trends = await db.query(`
            SELECT
                DATE_TRUNC('day', cs."submission_timestamp") as date,
                COUNT(cs."submission_id") as total_submissions,
                COUNT(CASE WHEN cs."status" = 'SupervisorValidated' THEN 1 END) as completed_submissions,
                COUNT(DISTINCT cs."submitted_by_user_id") as unique_users,
                AVG(
                    CASE
                        WHEN total_tasks.task_count > 0
                        THEN (completed_tasks.completed_count::decimal / total_tasks.task_count) * 100
                    END
                ) as avg_completion_percentage
            FROM "ChecklistSubmissions" cs
            LEFT JOIN (
                SELECT
                    cs2."submission_id",
                    COUNT(st."task_id") as task_count
                FROM "ChecklistSubmissions" cs2
                JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
                JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
                GROUP BY cs2."submission_id"
            ) total_tasks ON cs."submission_id" = total_tasks."submission_id"
            LEFT JOIN (
                SELECT
                    cs2."submission_id",
                    COUNT(CASE WHEN st."is_checked_on_submission" = true THEN 1 END) as completed_count
                FROM "ChecklistSubmissions" cs2
                JOIN "SubmissionHeadings" sh ON cs2."submission_id" = sh."submission_id"
                JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
                GROUP BY cs2."submission_id"
            ) completed_tasks ON cs."submission_id" = completed_tasks."submission_id"
            WHERE cs."submission_timestamp" >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE_TRUNC('day', cs."submission_timestamp")
            ORDER BY date DESC
        `);

        res.json({
            success: true,
            trends: trends.rows,
            period: `${days} days`
        });
    } catch (error) {
        console.error('[API] Error fetching completion trends:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch completion trends'
        });
    }
}));

// Get validation turnaround analytics
app.get('/api/analytics/validation-turnaround', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const days = parseInt(req.query.days) || 30;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log analytics access
    await AuditLogger.logAnalyticsAccess(userId, 'validation_turnaround', { days });

    try {
        const turnaroundData = await db.query(`
            SELECT * FROM "v_validation_metrics"
            WHERE "validation_month" >= DATE_TRUNC('month', NOW() - INTERVAL '${days} days')
            ORDER BY "validation_month" DESC, "total_validations" DESC
        `);

        res.json({
            success: true,
            validationMetrics: turnaroundData.rows,
            period: `${days} days`
        });
    } catch (error) {
        console.error('[API] Error fetching validation turnaround:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch validation turnaround data'
        });
    }
}));

// Get team productivity metrics
app.get('/api/analytics/team-productivity', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const teamId = req.query.teamId;
    const days = parseInt(req.query.days) || 30;

    if (!['manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Manager privileges required'
        });
    }

    // Log analytics access
    await AuditLogger.logAnalyticsAccess(userId, 'team_productivity', { teamId, days });

    try {
        let whereClause = '';
        let params = [days];

        if (teamId) {
            whereClause = 'AND tm."team_id" = $2';
            params.push(teamId);
        }

        const productivity = await db.query(`
            SELECT
                tm."user_id",
                COUNT(DISTINCT cs."submission_id") as total_submissions,
                COUNT(DISTINCT CASE
                    WHEN cs."status" = 'SupervisorValidated'
                    THEN cs."submission_id"
                END) as validated_submissions,
                COUNT(DISTINCT ca."assignment_id") as total_assignments,
                COUNT(DISTINCT CASE
                    WHEN ca."status" = 'Completed'
                    THEN ca."assignment_id"
                END) as completed_assignments,
                AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600) as avg_turnaround_hours
            FROM "TeamMembers" tm
            LEFT JOIN "ChecklistSubmissions" cs ON tm."user_id" = cs."submitted_by_user_id"
                AND cs."submission_timestamp" >= NOW() - INTERVAL '$1 days'
            LEFT JOIN "ChecklistAssignments" ca ON tm."user_id" = ca."assigned_to_user_id"
            LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
            WHERE tm."is_active" = true ${whereClause}
            GROUP BY tm."user_id"
            ORDER BY total_submissions DESC
        `, params);

        res.json({
            success: true,
            productivity: productivity.rows,
            period: `${days} days`,
            teamId: teamId || 'all'
        });
    } catch (error) {
        console.error('[API] Error fetching team productivity:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team productivity data'
        });
    }
}));

// Get user dashboard statistics
app.get('/api/user/stats', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    try {
        // Get active assignments count
        const activeAssignments = await db.query(`
            SELECT COUNT(*) as count
            FROM "ChecklistAssignments"
            WHERE "assigned_to_user_id" = $1 AND "status" IN ('Assigned', 'InProgress')
        `, [userId]);

        // Get overdue assignments count
        const overdueAssignments = await db.query(`
            SELECT COUNT(*) as count
            FROM "ChecklistAssignments"
            WHERE "assigned_to_user_id" = $1
            AND "status" IN ('Assigned', 'InProgress')
            AND "due_timestamp" < NOW()
        `, [userId]);

        // Get completed submissions this month
        const completedThisMonth = await db.query(`
            SELECT COUNT(*) as count
            FROM "ChecklistSubmissions"
            WHERE "submitted_by_user_id" = $1
            AND "submission_timestamp" >= DATE_TRUNC('month', NOW())
        `, [userId]);

        // Get total submissions
        const totalSubmissions = await db.query(`
            SELECT COUNT(*) as count
            FROM "ChecklistSubmissions"
            WHERE "submitted_by_user_id" = $1
        `, [userId]);

        res.json({
            success: true,
            stats: {
                activeAssignments: parseInt(activeAssignments.rows[0].count),
                overdueAssignments: parseInt(overdueAssignments.rows[0].count),
                completedThisMonth: parseInt(completedThisMonth.rows[0].count),
                totalSubmissions: parseInt(totalSubmissions.rows[0].count)
            }
        });
    } catch (error) {
        console.error('[API] Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user statistics'
        });
    }
}));

// Compliance Officer API Endpoints for Phase 4

// Get compliance overview statistics
app.get('/api/compliance/overview', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['compliance', 'manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Compliance officer privileges required'
        });
    }

    // Log compliance dashboard access
    await AuditLogger.logDashboardAccess(userId, 'compliance', {
        endpoint: '/api/compliance/overview',
        userRole
    });

    try {
        // Get overall compliance score (last 30 days)
        const complianceScore = await db.query(`
            SELECT
                ROUND(AVG(CASE
                    WHEN total_tasks > 0
                    THEN (validated_ok_tasks::decimal / total_tasks) * 100
                    ELSE 0
                END), 1) as overall_score
            FROM (
                SELECT
                    cs."submission_id",
                    COUNT(st."task_id") as total_tasks,
                    COUNT(CASE WHEN st."supervisor_validated_status" = true THEN 1 END) as validated_ok_tasks
                FROM "ChecklistSubmissions" cs
                JOIN "SubmissionHeadings" sh ON cs."submission_id" = sh."submission_id"
                JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
                WHERE cs."submission_timestamp" >= NOW() - INTERVAL '30 days'
                AND cs."status" = 'SupervisorValidated'
                GROUP BY cs."submission_id"
            ) submission_scores
        `);

        // Get validated submissions count (last 30 days)
        const validatedSubmissions = await db.query(`
            SELECT COUNT(*) as count
            FROM "ChecklistSubmissions"
            WHERE "status" = 'SupervisorValidated'
            AND "submission_timestamp" >= NOW() - INTERVAL '30 days'
        `);

        // Get non-compliant tasks count
        const nonCompliantTasks = await db.query(`
            SELECT COUNT(*) as count
            FROM "SubmissionTasks" st
            JOIN "SubmissionHeadings" sh ON st."heading_id" = sh."heading_id"
            JOIN "ChecklistSubmissions" cs ON sh."submission_id" = cs."submission_id"
            WHERE st."supervisor_validated_status" = false
            AND cs."submission_timestamp" >= NOW() - INTERVAL '30 days'
        `);

        // Get average validation time
        const avgValidationTime = await db.query(`
            SELECT
                ROUND(AVG(EXTRACT(EPOCH FROM (svl."validation_timestamp" - cs."submission_timestamp"))/3600), 1) as avg_hours
            FROM "SupervisorValidationsLog" svl
            JOIN "ChecklistSubmissions" cs ON svl."submission_id" = cs."submission_id"
            WHERE svl."validation_timestamp" >= NOW() - INTERVAL '30 days'
        `);

        // Get audit trail entries (last 7 days)
        const auditEntries = await db.query(`
            SELECT COUNT(*) as count
            FROM "AuditTrail"
            WHERE "timestamp" >= NOW() - INTERVAL '7 days'
        `);

        res.json({
            success: true,
            overallComplianceScore: complianceScore.rows[0]?.overall_score || 0,
            validatedSubmissions: parseInt(validatedSubmissions.rows[0].count),
            nonCompliantTasks: parseInt(nonCompliantTasks.rows[0].count),
            avgValidationTime: avgValidationTime.rows[0]?.avg_hours || 0,
            auditTrailEntries: parseInt(auditEntries.rows[0].count)
        });
    } catch (error) {
        console.error('[API] Error fetching compliance overview:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance overview'
        });
    }
}));

// Get detailed compliance metrics with filtering
app.get('/api/compliance/metrics', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const days = parseInt(req.query.days) || 30;
    const checklistType = req.query.checklistType;

    if (!['compliance', 'manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Compliance officer privileges required'
        });
    }

    // Log compliance metrics access
    await AuditLogger.logAnalyticsAccess(userId, 'compliance_metrics', { days, checklistType });

    try {
        let whereClause = `WHERE cs."submission_timestamp" >= NOW() - INTERVAL '${days} days'`;
        let params = [];

        if (checklistType) {
            whereClause += ` AND cs."original_checklist_filename" LIKE $1`;
            params.push(`%${checklistType}%`);
        }

        const metrics = await db.query(`
            SELECT * FROM "v_compliance_metrics"
            ${whereClause.replace('cs.', '')}
            ORDER BY "submission_date" DESC, "original_checklist_filename"
        `, params);

        res.json({
            success: true,
            metrics: metrics.rows,
            period: `${days} days`,
            checklistType: checklistType || 'all'
        });
    } catch (error) {
        console.error('[API] Error fetching compliance metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch compliance metrics'
        });
    }
}));

// Get audit trail with filtering
app.get('/api/compliance/audit-trail', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const days = parseInt(req.query.days) || 7;
    const actionType = req.query.actionType;
    const targetUserId = req.query.targetUserId;
    const limit = parseInt(req.query.limit) || 100;

    if (!['compliance', 'manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Compliance officer privileges required'
        });
    }

    // Log audit trail access
    await AuditLogger.logAuditAccess(userId, 'audit_trail_view', { days, actionType, targetUserId });

    try {
        let whereClause = `WHERE at."timestamp" >= NOW() - INTERVAL '${days} days'`;
        let params = [limit];
        let paramIndex = 2;

        if (actionType) {
            whereClause += ` AND at."action_type" = $${paramIndex}`;
            params.push(actionType);
            paramIndex++;
        }

        if (targetUserId) {
            whereClause += ` AND at."user_id" = $${paramIndex}`;
            params.push(targetUserId);
            paramIndex++;
        }

        const auditTrail = await db.query(`
            SELECT
                at."log_id",
                at."timestamp",
                at."user_id",
                at."action_type",
                at."details",
                at."submission_id",
                cs."checklist_title",
                cs."original_checklist_filename"
            FROM "AuditTrail" at
            LEFT JOIN "ChecklistSubmissions" cs ON at."submission_id" = cs."submission_id"
            ${whereClause}
            ORDER BY at."timestamp" DESC
            LIMIT $1
        `, params);

        res.json({
            success: true,
            auditTrail: auditTrail.rows,
            period: `${days} days`,
            filters: {
                actionType: actionType || 'all',
                targetUserId: targetUserId || 'all'
            }
        });
    } catch (error) {
        console.error('[API] Error fetching audit trail:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit trail'
        });
    }
}));

// Get non-compliance reports with drill-down capability
app.get('/api/compliance/non-compliance', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const days = parseInt(req.query.days) || 30;
    const severity = req.query.severity; // 'high', 'medium', 'low'
    const checklistType = req.query.checklistType;

    if (!['compliance', 'manager', 'admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Compliance officer privileges required'
        });
    }

    // Log non-compliance report access
    await AuditLogger.logAnalyticsAccess(userId, 'non_compliance_report', { days, severity, checklistType });

    try {
        let whereClause = `WHERE cs."submission_timestamp" >= NOW() - INTERVAL '${days} days'
                          AND st."supervisor_validated_status" = false`;
        let params = [];
        let paramIndex = 1;

        if (checklistType) {
            whereClause += ` AND cs."original_checklist_filename" LIKE $${paramIndex}`;
            params.push(`%${checklistType}%`);
            paramIndex++;
        }

        // Get non-compliant tasks with details
        const nonCompliantTasks = await db.query(`
            SELECT
                cs."submission_id",
                cs."checklist_title",
                cs."original_checklist_filename",
                cs."submission_timestamp",
                cs."submitted_by_user_id",
                sh."heading_text",
                st."task_label",
                st."task_identifier_in_json",
                st."comments",
                svl."supervisor_name",
                svl."validation_timestamp",
                -- Calculate severity based on task frequency and impact
                CASE
                    WHEN COUNT(*) OVER (PARTITION BY st."task_identifier_in_json") > 5 THEN 'high'
                    WHEN COUNT(*) OVER (PARTITION BY st."task_identifier_in_json") > 2 THEN 'medium'
                    ELSE 'low'
                END as severity
            FROM "ChecklistSubmissions" cs
            JOIN "SubmissionHeadings" sh ON cs."submission_id" = sh."submission_id"
            JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
            LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
            ${whereClause}
            ORDER BY cs."submission_timestamp" DESC, severity DESC
            LIMIT 200
        `, params);

        // Get summary statistics
        const summary = await db.query(`
            SELECT
                COUNT(*) as total_non_compliant_tasks,
                COUNT(DISTINCT cs."submission_id") as affected_submissions,
                COUNT(DISTINCT cs."submitted_by_user_id") as affected_users,
                COUNT(DISTINCT cs."original_checklist_filename") as affected_checklist_types
            FROM "ChecklistSubmissions" cs
            JOIN "SubmissionHeadings" sh ON cs."submission_id" = sh."submission_id"
            JOIN "SubmissionTasks" st ON sh."heading_id" = st."heading_id"
            ${whereClause}
        `, params);

        // Filter by severity if requested
        let filteredTasks = nonCompliantTasks.rows;
        if (severity) {
            filteredTasks = filteredTasks.filter(task => task.severity === severity);
        }

        res.json({
            success: true,
            nonCompliantTasks: filteredTasks,
            summary: summary.rows[0],
            period: `${days} days`,
            filters: {
                severity: severity || 'all',
                checklistType: checklistType || 'all'
            }
        });
    } catch (error) {
        console.error('[API] Error fetching non-compliance report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch non-compliance report'
        });
    }
}));

// Scheduled Automation API Endpoints for Phase 4

// Get scheduled automation status
app.get('/api/admin/scheduled-automation/status', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }

    try {
        const jobStatus = scheduledAutomation.getJobStatus();

        // Get scheduled automation rules from database
        const scheduledRules = await db.query(`
            SELECT
                "rule_id",
                "source_checklist_filename_pattern",
                "next_checklist_filename",
                "assignment_logic_type",
                "assignment_logic_detail",
                "is_active"
            FROM "AutomationRules"
            WHERE "trigger_event" = 'SCHEDULED'
            ORDER BY "rule_id"
        `);

        res.json({
            success: true,
            scheduledJobs: jobStatus,
            scheduledRules: scheduledRules.rows,
            isInitialized: scheduledAutomation.isInitialized
        });
    } catch (error) {
        console.error('[API] Error fetching scheduled automation status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch scheduled automation status'
        });
    }
}));

// RPA Integration API Endpoints for Phase 4

// Get RPA integration status
app.get('/api/admin/rpa/status', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

    if (!['admin', 'compliance'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Admin or compliance privileges required'
        });
    }

    try {
        const rpaStatus = rpaIntegration.getStatus();

        // Get RPA execution statistics
        const executionStats = await db.query(`
            SELECT
                "workflow_type",
                COUNT(*) as total_executions,
                COUNT(CASE WHEN "execution_status" = 'SUCCESS' THEN 1 END) as successful_executions,
                COUNT(CASE WHEN "execution_timestamp" >= NOW() - INTERVAL '24 hours' THEN 1 END) as executions_last_24h,
                MAX("execution_timestamp") as last_execution
            FROM "RPAExecutionLog"
            WHERE "execution_timestamp" >= NOW() - INTERVAL '30 days'
            GROUP BY "workflow_type"
            ORDER BY total_executions DESC
        `);

        res.json({
            success: true,
            rpaStatus: rpaStatus,
            executionStats: executionStats.rows
        });
    } catch (error) {
        console.error('[API] Error fetching RPA status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch RPA status'
        });
    }
}));

// Manually trigger RPA workflow (for testing)
app.post('/api/admin/rpa/trigger', apiLimiter, authenticateApi, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role || (req.user.isAdmin ? 'admin' : 'user');
    const { eventType, eventData } = req.body;

    if (!['admin'].includes(userRole)) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }

    if (!eventType) {
        return res.status(400).json({
            success: false,
            message: 'Event type is required'
        });
    }

    try {
        await rpaIntegration.triggerWorkflow(eventType, {
            ...eventData,
            triggeredBy: userId,
            manualTrigger: true,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `RPA workflow triggered for event: ${eventType}`
        });
    } catch (error) {
        console.error('[API] Error triggering RPA workflow:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger RPA workflow'
        });
    }
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
        const httpsServer = createHTTPSServer(app, sslOptions, HTTPS_PORT, async () => {
            console.log('Backend API HTTPS Server listener callback executed.');
            console.log(`[SSL] Backend API HTTPS Server is running on https://localhost:${HTTPS_PORT}`);
            console.log(`[SSL] SSL certificates loaded from:`);
            console.log(`[SSL] - Key: ${sslConfig.sslKeyPath}`);
            console.log(`[SSL] - Cert: ${sslConfig.sslCertPath}`);

            // Log system startup
            await AuditLogger.logSystem('SERVER_STARTED', {
                port: HTTPS_PORT,
                ssl: true,
                sslKeyPath: sslConfig.sslKeyPath,
                sslCertPath: sslConfig.sslCertPath,
                timestamp: new Date().toISOString()
            });

            // Initialize scheduled automation
            try {
                await scheduledAutomation.initialize();
                console.log('[Scheduled Automation] Initialized successfully');
            } catch (error) {
                console.error('[Scheduled Automation] Failed to initialize:', error);
            }

            // Initialize RPA integration
            try {
                await rpaIntegration.initialize();
                console.log('[RPA Integration] Initialized successfully');
            } catch (error) {
                console.error('[RPA Integration] Failed to initialize:', error);
            }
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
        const server = app.listen(PORT, '0.0.0.0', async () => {
            console.log('Backend API Server listener callback executed.');
            console.log(`[HTTP] Backend API Server is running on http://localhost:${PORT} (SSL disabled due to certificate error)`);

            // Log system startup
            await AuditLogger.logSystem('SERVER_STARTED', {
                port: PORT,
                ssl: false,
                reason: 'SSL certificate error',
                timestamp: new Date().toISOString()
            });

            // Initialize scheduled automation
            try {
                await scheduledAutomation.initialize();
                console.log('[Scheduled Automation] Initialized successfully');
            } catch (error) {
                console.error('[Scheduled Automation] Failed to initialize:', error);
            }

            // Initialize RPA integration
            try {
                await rpaIntegration.initialize();
                console.log('[RPA Integration] Initialized successfully');
            } catch (error) {
                console.error('[RPA Integration] Failed to initialize:', error);
            }
        });

        server.on('error', handleServerError);
    }
} else {
    // Start HTTP server only
    const server = app.listen(PORT, '0.0.0.0', async () => {
        console.log('Backend API Server listener callback executed.');
        console.log(`[HTTP] Backend API Server is running on http://localhost:${PORT} (SSL disabled)`);

        // Log system startup
        await AuditLogger.logSystem('SERVER_STARTED', {
            port: PORT,
            ssl: false,
            reason: 'SSL disabled in configuration',
            timestamp: new Date().toISOString()
        });

        // Initialize scheduled automation
        try {
            await scheduledAutomation.initialize();
            console.log('[Scheduled Automation] Initialized successfully');
        } catch (error) {
            console.error('[Scheduled Automation] Failed to initialize:', error);
        }

        // Initialize RPA integration
        try {
            await rpaIntegration.initialize();
            console.log('[RPA Integration] Initialized successfully');
        } catch (error) {
            console.error('[RPA Integration] Failed to initialize:', error);
        }
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

// Handle graceful shutdown
async function gracefulShutdown(signal) {
    console.log(`[SHUTDOWN] Received ${signal}, shutting down gracefully...`);

    try {
        // Stop scheduled automation
        scheduledAutomation.stopAllJobs();
        console.log('[SHUTDOWN] Scheduled automation stopped');

        await AuditLogger.logSystem('SERVER_SHUTDOWN', {
            signal: signal,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[SHUTDOWN] Failed to log shutdown event:', error);
    }

    process.exit(0);
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('[FATAL] Uncaught Exception:', error);

    try {
        await AuditLogger.logSystem('SERVER_ERROR', {
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    } catch (logError) {
        console.error('[FATAL] Failed to log uncaught exception:', logError);
    }

    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);

    try {
        await AuditLogger.logSystem('SERVER_ERROR', {
            error: 'Unhandled Promise Rejection',
            reason: reason.toString(),
            timestamp: new Date().toISOString()
        });
    } catch (logError) {
        console.error('[FATAL] Failed to log unhandled rejection:', logError);
    }

    process.exit(1);
});
