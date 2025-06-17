console.log("[Debug] server.js: Server starting with latest code...");
require('dotenv').config(); // Ensure this is at the very top

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const rateLimit = require('express-rate-limit'); // Import express-rate-limit

const cors = require('cors');
const path = require('path');
const fs = require('fs');  // Import the file system module
const http = require('http');
const db = require('./config/db'); // Import PostgreSQL configuration
const automationEngine = require('./automation/automationEngine'); // Import automation engine
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

// Define the rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `windowMs`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
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
            assignment: result.rows[0]
        });
    } catch (error) {
        console.error('[API] Error updating assignment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update assignment status'
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
