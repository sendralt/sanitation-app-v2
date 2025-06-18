const express = require('express');
const router = express.Router();
const { ensureAdmin } = require('../middleware/authMiddleware');
const { getSecurityQuestions, getSecurityQuestionById } = require('../utils/auth');
const User = require('../models/user'); // Needed for checking username existence, etc.
const { hashPassword, hashAnswer } = require('../utils/auth');
const lusca = require('lusca');
const AuditLogger = require('../../backend/utils/auditLogger'); // Import audit logger

// Import PostgreSQL database connection
const { Pool } = require('pg');
const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'sanitation_user_1',
  password: process.env.PG_PASSWORD || 'Checklist123',
  database: process.env.PG_DATABASE || 'sanitation_checklist_db',
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

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

// System Reports Dashboard
router.get('/reports', ensureAuthenticated, ensureAdmin, async (req, res) => {
  console.log('[Admin Reports] User accessing reports dashboard:', req.user ? req.user.username : 'No user');

  try {
    console.log('[Admin Reports] Starting to fetch statistics...');

    // Get basic statistics for the reports dashboard
    console.log('[Admin Reports] Fetching submissions count...');
    const submissionsCount = await pgPool.query('SELECT COUNT(*) as count FROM "ChecklistSubmissions"');
    console.log('[Admin Reports] Submissions count:', submissionsCount.rows[0]);

    console.log('[Admin Reports] Fetching validations count...');
    const validationsCount = await pgPool.query('SELECT COUNT(*) as count FROM "SupervisorValidationsLog"');
    console.log('[Admin Reports] Validations count:', validationsCount.rows[0]);

    console.log('[Admin Reports] Fetching users count...');
    const usersCount = await User.count(); // Use Sequelize to count users from SQLite
    console.log('[Admin Reports] Users count:', usersCount);

    console.log('[Admin Reports] Fetching audit count...');
    const auditCount = await pgPool.query('SELECT COUNT(*) as count FROM "AuditTrail"');
    console.log('[Admin Reports] Audit count:', auditCount.rows[0]);

    // Get recent activity summary
    console.log('[Admin Reports] Fetching recent activity...');
    const recentActivity = await pgPool.query(`
      SELECT
        DATE_TRUNC('day', "submission_timestamp") as date,
        COUNT(*) as submissions_count
      FROM "ChecklistSubmissions"
      WHERE "submission_timestamp" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', "submission_timestamp")
      ORDER BY date DESC
      LIMIT 30
    `);
    console.log('[Admin Reports] Recent activity rows:', recentActivity.rows.length);

    // Get compliance overview
    console.log('[Admin Reports] Fetching compliance overview...');
    const complianceOverview = await pgPool.query(`
      SELECT
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN svl."validation_timestamp" IS NOT NULL THEN 1 END) as validated_submissions,
        COUNT(CASE WHEN cs."status" = 'PendingSupervisorValidation' THEN 1 END) as pending_validation
      FROM "ChecklistSubmissions" cs
      LEFT JOIN "SupervisorValidationsLog" svl ON cs."submission_id" = svl."submission_id"
      WHERE cs."submission_timestamp" >= NOW() - INTERVAL '30 days'
    `);
    console.log('[Admin Reports] Compliance overview:', complianceOverview.rows[0]);

    console.log('[Admin Reports] Preparing render data...');
    const renderData = {
      title: 'System Reports Dashboard',
      user: req.user,
      stats: {
        submissions: submissionsCount.rows[0].count,
        validations: validationsCount.rows[0].count,
        users: usersCount, // Direct count from Sequelize
        audit: auditCount.rows[0].count
      },
      recentActivity: recentActivity.rows,
      complianceOverview: complianceOverview.rows[0] || {}
    };

    console.log('[Admin Reports] Render data prepared:', {
      title: renderData.title,
      statsCount: Object.keys(renderData.stats).length,
      recentActivityCount: renderData.recentActivity.length,
      hasComplianceOverview: !!renderData.complianceOverview
    });

    console.log('[Admin Reports] Rendering admin/reports view...');
    res.render('admin/reports', renderData);
    console.log('[Admin Reports] View rendered successfully!');
  } catch (error) {
    console.error('[Admin Reports] Error:', error);
    req.flash('error', 'Failed to load reports dashboard data.');
    res.redirect('/admin');
  }
});

// System Logs Dashboard
router.get('/logs', ensureAuthenticated, ensureAdmin, async (req, res) => {
  console.log('[Admin Logs] User accessing logs dashboard:', req.user ? req.user.username : 'No user');

  try {
    // Get recent audit trail entries
    const recentLogs = await pgPool.query(`
      SELECT
        "timestamp",
        "action_type",
        "user_id",
        "details"
      FROM "AuditTrail"
      ORDER BY "timestamp" DESC
      LIMIT 50
    `);

    const renderData = {
      title: 'System Logs',
      user: req.user,
      logs: recentLogs.rows
    };

    res.render('admin/logs', renderData);
  } catch (error) {
    console.error('[Admin Logs] Error:', error);
    req.flash('error', 'Failed to load system logs.');
    res.redirect('/admin');
  }
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

// PostgreSQL Data Viewing Routes

// Main PostgreSQL dashboard
router.get('/postgresql', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    console.log('[Admin PostgreSQL Dashboard] Starting to fetch data...');
    // Get summary statistics
    const submissionsCount = await pgPool.query('SELECT COUNT(*) as count FROM "ChecklistSubmissions"');
    console.log('[Admin PostgreSQL Dashboard] Submissions count:', submissionsCount.rows[0]);
    const validationsCount = await pgPool.query('SELECT COUNT(*) as count FROM "SupervisorValidationsLog"');
    console.log('[Admin PostgreSQL Dashboard] Validations count:', validationsCount.rows[0]);
    const tasksCount = await pgPool.query('SELECT COUNT(*) as count FROM "SubmissionTasks"');
    console.log('[Admin PostgreSQL Dashboard] Tasks count:', tasksCount.rows[0]);
    const auditCount = await pgPool.query('SELECT COUNT(*) as count FROM "AuditTrail"');
    console.log('[Admin PostgreSQL Dashboard] Audit count:', auditCount.rows[0]);

    // Get recent submissions
    const recentSubmissions = await pgPool.query(`
      SELECT "submission_id", "checklist_title", "submitted_by_username",
             "submission_timestamp", "status"
      FROM "ChecklistSubmissions"
      ORDER BY "submission_timestamp" DESC
      LIMIT 10
    `);

    console.log('[Admin PostgreSQL Dashboard] Recent submissions:', recentSubmissions.rows);
    console.log('[Admin PostgreSQL Dashboard] Rendering dashboard...');

    const renderData = {
      title: 'PostgreSQL Data Dashboard',
      user: req.user,
      stats: {
        submissions: submissionsCount.rows[0].count,
        validations: validationsCount.rows[0].count,
        tasks: tasksCount.rows[0].count,
        audit: auditCount.rows[0].count
      },
      recentSubmissions: recentSubmissions.rows
    };

    res.render('admin/postgresql-dashboard', renderData);
  } catch (error) {
    console.error('[Admin PostgreSQL Dashboard] Error:', error);
    console.error('[Admin PostgreSQL Dashboard] Error stack:', error.stack);
    req.flash('error', 'Failed to load PostgreSQL dashboard data.');
    res.redirect('/admin');
  }
});

// View all checklist submissions
router.get('/postgresql/submissions', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const submissions = await pgPool.query(`
      SELECT "submission_id", "original_checklist_filename", "checklist_title",
             "submitted_by_username", "submission_timestamp", "status", "json_file_path"
      FROM "ChecklistSubmissions"
      ORDER BY "submission_timestamp" DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const totalCount = await pgPool.query('SELECT COUNT(*) as count FROM "ChecklistSubmissions"');
    const totalPages = Math.ceil(totalCount.rows[0].count / limit);

    res.render('admin/postgresql-submissions', {
      title: 'Checklist Submissions',
      user: req.user,
      submissions: submissions.rows,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });
  } catch (error) {
    console.error('[Admin PostgreSQL Submissions] Error:', error);
    req.flash('error', 'Failed to load submissions data.');
    res.redirect('/admin/postgresql');
  }
});

// View submission details
router.get('/postgresql/submissions/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const submissionId = req.params.id;

    // Get submission details
    const submission = await pgPool.query(`
      SELECT * FROM "ChecklistSubmissions" WHERE "submission_id" = $1
    `, [submissionId]);

    if (submission.rows.length === 0) {
      req.flash('error', 'Submission not found.');
      return res.redirect('/admin/postgresql/submissions');
    }

    // Get headings and tasks
    const headings = await pgPool.query(`
      SELECT h.*,
             COUNT(t."task_id") as task_count,
             COUNT(CASE WHEN t."is_checked_on_submission" = true THEN 1 END) as checked_count
      FROM "SubmissionHeadings" h
      LEFT JOIN "SubmissionTasks" t ON h."heading_id" = t."heading_id"
      WHERE h."submission_id" = $1
      GROUP BY h."heading_id"
      ORDER BY h."display_order"
    `, [submissionId]);

    // Get validation logs
    const validations = await pgPool.query(`
      SELECT * FROM "SupervisorValidationsLog"
      WHERE "submission_id" = $1
      ORDER BY "validation_timestamp" DESC
    `, [submissionId]);

    // Get audit trail
    const auditTrail = await pgPool.query(`
      SELECT * FROM "AuditTrail"
      WHERE "affected_record_id" = $1 AND "affected_table" = 'ChecklistSubmissions'
      ORDER BY "action_timestamp" DESC
    `, [submissionId]);

    res.render('admin/postgresql-submission-detail', {
      title: `Submission Details - ${submission.rows[0].checklist_title}`,
      user: req.user,
      submission: submission.rows[0],
      headings: headings.rows,
      validations: validations.rows,
      auditTrail: auditTrail.rows
    });
  } catch (error) {
    console.error('[Admin PostgreSQL Submission Detail] Error:', error);
    req.flash('error', 'Failed to load submission details.');
    res.redirect('/admin/postgresql/submissions');
  }
});

// Automation Rules Management Routes

// View all automation rules
router.get('/automation-rules', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const rules = await pgPool.query(`
      SELECT * FROM "AutomationRules"
      ORDER BY "rule_id" DESC
    `);

    res.render('admin/automation-rules', {
      title: 'Automation Rules Management',
      user: req.user,
      rules: rules.rows,
      successMessage: req.flash('success'),
      errorMessage: req.flash('error')
    });
  } catch (error) {
    console.error('[Admin Automation Rules] Error:', error);
    req.flash('error', 'Failed to load automation rules.');
    res.redirect('/admin');
  }
});

// Show form to create new automation rule
router.get('/automation-rules/new', ensureAuthenticated, ensureAdmin, lusca.csrf(), (req, res) => {
  res.render('admin/automation-rule-form', {
    title: 'Create New Automation Rule',
    user: req.user,
    rule: {}, // Empty rule for new creation
    isEdit: false,
    errorMessages: req.flash('error'),
    validationErrors: {},
    _csrf: req.csrfToken()
  });
});

// Create new automation rule
router.post('/automation-rules', ensureAuthenticated, ensureAdmin, lusca.csrf(), async (req, res) => {
  const {
    source_checklist_filename_pattern,
    trigger_event,
    next_checklist_filename,
    assignment_logic_type,
    assignment_logic_detail,
    delay_minutes_after_trigger,
    is_active
  } = req.body;

  let validationErrors = {};

  // Basic validation
  if (!source_checklist_filename_pattern || source_checklist_filename_pattern.trim() === '') {
    validationErrors.source_checklist_filename_pattern = 'Source checklist pattern is required.';
  }
  if (!trigger_event) {
    validationErrors.trigger_event = 'Trigger event is required.';
  }
  if (!next_checklist_filename || next_checklist_filename.trim() === '') {
    validationErrors.next_checklist_filename = 'Next checklist filename is required.';
  }
  if (!assignment_logic_type) {
    validationErrors.assignment_logic_type = 'Assignment logic type is required.';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.render('admin/automation-rule-form', {
      title: 'Create New Automation Rule',
      user: req.user,
      rule: req.body,
      isEdit: false,
      errorMessages: req.flash('error'),
      validationErrors,
      _csrf: req.csrfToken()
    });
  }

  try {
    const result = await pgPool.query(`
      INSERT INTO "AutomationRules" (
        "source_checklist_filename_pattern",
        "trigger_event",
        "next_checklist_filename",
        "assignment_logic_type",
        "assignment_logic_detail",
        "delay_minutes_after_trigger",
        "is_active"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING "rule_id"
    `, [
      source_checklist_filename_pattern.trim(),
      trigger_event,
      next_checklist_filename.trim(),
      assignment_logic_type,
      assignment_logic_detail || null,
      parseInt(delay_minutes_after_trigger) || 0,
      is_active === 'on'
    ]);

    const newRuleId = result.rows[0].rule_id;

    // Log the automation rule creation
    await AuditLogger.logAutomationRule(
      req.user.userId,
      'AUTOMATION_RULE_CREATED',
      newRuleId,
      {
        source_checklist_filename_pattern: source_checklist_filename_pattern.trim(),
        trigger_event,
        next_checklist_filename: next_checklist_filename.trim(),
        assignment_logic_type,
        assignment_logic_detail: assignment_logic_detail || null,
        delay_minutes_after_trigger: parseInt(delay_minutes_after_trigger) || 0,
        is_active: is_active === 'on'
      }
    );

    req.flash('success', 'Automation rule created successfully.');
    res.redirect('/admin/automation-rules');
  } catch (error) {
    console.error('[Admin Create Automation Rule] Error:', error);
    req.flash('error', 'Failed to create automation rule.');
    res.render('admin/automation-rule-form', {
      title: 'Create New Automation Rule',
      user: req.user,
      rule: req.body,
      isEdit: false,
      errorMessages: req.flash('error'),
      validationErrors: {},
      _csrf: req.csrfToken()
    });
  }
});

// Show form to edit automation rule
router.get('/automation-rules/:id/edit', ensureAuthenticated, ensureAdmin, lusca.csrf(), async (req, res) => {
  try {
    const ruleId = req.params.id;
    const rule = await pgPool.query('SELECT * FROM "AutomationRules" WHERE "rule_id" = $1', [ruleId]);

    if (rule.rows.length === 0) {
      req.flash('error', 'Automation rule not found.');
      return res.redirect('/admin/automation-rules');
    }

    res.render('admin/automation-rule-form', {
      title: 'Edit Automation Rule',
      user: req.user,
      rule: rule.rows[0],
      isEdit: true,
      errorMessages: req.flash('error'),
      validationErrors: {},
      _csrf: req.csrfToken()
    });
  } catch (error) {
    console.error('[Admin Edit Automation Rule] Error:', error);
    req.flash('error', 'Failed to load automation rule.');
    res.redirect('/admin/automation-rules');
  }
});

// Update automation rule
router.post('/automation-rules/:id', ensureAuthenticated, ensureAdmin, lusca.csrf(), async (req, res) => {
  const ruleId = req.params.id;
  const {
    source_checklist_filename_pattern,
    trigger_event,
    next_checklist_filename,
    assignment_logic_type,
    assignment_logic_detail,
    delay_minutes_after_trigger,
    is_active
  } = req.body;

  let validationErrors = {};

  // Basic validation
  if (!source_checklist_filename_pattern || source_checklist_filename_pattern.trim() === '') {
    validationErrors.source_checklist_filename_pattern = 'Source checklist pattern is required.';
  }
  if (!trigger_event) {
    validationErrors.trigger_event = 'Trigger event is required.';
  }
  if (!next_checklist_filename || next_checklist_filename.trim() === '') {
    validationErrors.next_checklist_filename = 'Next checklist filename is required.';
  }
  if (!assignment_logic_type) {
    validationErrors.assignment_logic_type = 'Assignment logic type is required.';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.render('admin/automation-rule-form', {
      title: 'Edit Automation Rule',
      user: req.user,
      rule: { ...req.body, rule_id: ruleId },
      isEdit: true,
      errorMessages: req.flash('error'),
      validationErrors,
      _csrf: req.csrfToken()
    });
  }

  try {
    // Get the old rule data for audit logging
    const oldRuleResult = await pgPool.query('SELECT * FROM "AutomationRules" WHERE "rule_id" = $1', [ruleId]);
    const oldRule = oldRuleResult.rows[0];

    await pgPool.query(`
      UPDATE "AutomationRules" SET
        "source_checklist_filename_pattern" = $1,
        "trigger_event" = $2,
        "next_checklist_filename" = $3,
        "assignment_logic_type" = $4,
        "assignment_logic_detail" = $5,
        "delay_minutes_after_trigger" = $6,
        "is_active" = $7,
        "updated_at" = NOW()
      WHERE "rule_id" = $8
    `, [
      source_checklist_filename_pattern.trim(),
      trigger_event,
      next_checklist_filename.trim(),
      assignment_logic_type,
      assignment_logic_detail || null,
      parseInt(delay_minutes_after_trigger) || 0,
      is_active === 'on',
      ruleId
    ]);

    // Log the automation rule update
    await AuditLogger.logAutomationRule(
      req.user.userId,
      'AUTOMATION_RULE_UPDATED',
      ruleId,
      {
        oldValues: oldRule,
        newValues: {
          source_checklist_filename_pattern: source_checklist_filename_pattern.trim(),
          trigger_event,
          next_checklist_filename: next_checklist_filename.trim(),
          assignment_logic_type,
          assignment_logic_detail: assignment_logic_detail || null,
          delay_minutes_after_trigger: parseInt(delay_minutes_after_trigger) || 0,
          is_active: is_active === 'on'
        }
      }
    );

    req.flash('success', 'Automation rule updated successfully.');
    res.redirect('/admin/automation-rules');
  } catch (error) {
    console.error('[Admin Update Automation Rule] Error:', error);
    req.flash('error', 'Failed to update automation rule.');
    res.redirect(`/admin/automation-rules/${ruleId}/edit`);
  }
});

// Delete automation rule
router.post('/automation-rules/:id/delete', ensureAuthenticated, ensureAdmin, lusca.csrf(), async (req, res) => {
  try {
    const ruleId = req.params.id;

    // Get the rule data before deletion for audit logging
    const ruleResult = await pgPool.query('SELECT * FROM "AutomationRules" WHERE "rule_id" = $1', [ruleId]);
    const deletedRule = ruleResult.rows[0];

    await pgPool.query('DELETE FROM "AutomationRules" WHERE "rule_id" = $1', [ruleId]);

    // Log the automation rule deletion
    if (deletedRule) {
      await AuditLogger.logAutomationRule(
        req.user.userId,
        'AUTOMATION_RULE_DELETED',
        ruleId,
        {
          deletedRule: deletedRule
        }
      );
    }

    req.flash('success', 'Automation rule deleted successfully.');
  } catch (error) {
    console.error('[Admin Delete Automation Rule] Error:', error);
    req.flash('error', 'Failed to delete automation rule.');
  }
  res.redirect('/admin/automation-rules');
});

module.exports = router;
