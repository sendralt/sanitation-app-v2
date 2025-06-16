# Proposal: Advanced Checklist Assignment Automation & Tracking System
 
**1. Introduction**

This proposal outlines a system to enhance the current sanitation checklist application by introducing advanced automated checklist assignments, comprehensive tracking using a new PostgreSQL database, and robust Business Intelligence (BI) and role-based dashboard capabilities. The existing workflow of saving checklist submissions as JSON files (for the current supervisor email validation process) will be retained, and user authentication will continue to be managed by the `dhl_login` application using its SQLite database. The new PostgreSQL database will serve as an enriched data store primarily for these new advanced features.

**2. Current System Workflow (Summary)**

*   **Frontend:** Users interact with HTML checklists served by the `dhl_login` application. Client-side scripts ([`Public/scripts.js`](Public/scripts.js:1)) handle data collection and obtain a JWT from `dhl_login` for authenticated API calls.
*   **Submission:** Checklist data is POSTed to `/submit-form`.
*   **Nginx Routing:** Nginx routes `/submit-form` requests to the `backend/server.js` application (typically running on `localhost:3445` or a similar port).
*   **Checklist Backend (`backend/server.js`):** This Node.js/Express application:
    *   Verifies the JWT.
    *   Saves the full checklist submission as a JSON file in `backend/data/data_<timestamp>.json`.
    *   Selects ~20% of checklist items randomly for supervisor validation.
    *   Emails a validation link (`/app/validate-checklist/<timestamp>`) to the supervisor.
*   **Supervisor Validation:** Supervisors use the link (page served by `dhl_login`) to access validation details (fetched from `backend/server.js` via `/validate/:id` GET) and submit their validation (to `backend/server.js` via `/validate/:id` POST), which updates the JSON file.
*   **User Authentication:** Handled by `dhl_login` app using Passport.js and an SQLite database.

**3. Proposed System Architecture**

*   **3.1. Overview:**
    The new system will introduce a PostgreSQL database dedicated to checklist management, automation, and analytics. The existing `backend/server.js` application will be modified to write data to this PostgreSQL database in addition to its current file-saving operations. New components like an automation engine (likely integrated into `backend/server.js`) and a BI/dashboarding layer will interact primarily with this PostgreSQL database.

*   **3.2. Components:**
    *   **Existing `dhl_login` (Node.js, SQLite):** Continues to handle user authentication, session management, JWT issuance, and serving of frontend static files (including checklist HTML and supervisor validation page). May require new API endpoints to serve user details (e.g., roles) to the checklist system.
    *   **Existing `backend/server.js` (Node.js):**
        *   Continues to handle `/submit-form`, save JSON files, and manage the existing email-based supervisor validation workflow (updating JSON files).
        *   **Modified to:**
            *   Parse submitted checklist data and write structured information to the new PostgreSQL database.
            *   Update PostgreSQL records upon supervisor validation.
            *   House or trigger the Checklist Automation Engine.
            *   Provide new API endpoints for dashboards and BI.
    *   **New PostgreSQL Database (Checklist System):** Stores structured checklist data, assignments, task statuses, audit trails, automation rules, and supervisor validation summaries.
    *   **New/Modified Checklist Automation Engine:** Integrated within or called by `backend/server.js`. Responsible for executing assignment rules based on triggers.
    *   **New BI/Analytics Layer:** Queries the PostgreSQL database to generate insights and reports.
    *   **New Role-Based Dashboards:** Web interfaces that query data from PostgreSQL (via new APIs on `backend/server.js`) to display relevant information to different user roles. User context for dashboards will come from `dhl_login` JWT.

*   **3.3. Data Flow Diagram (Mermaid)**

    ```mermaid
    graph TD
        A[User Browser: Checklist HTML] -- JWT, Submission Data --> B(Nginx);
        B -- /submit-form --> C[backend/server.js: Port 3445];
        C -- Saves to --> D[File System: backend/data/*.json];
        C -- Writes to --> E[PostgreSQL: Checklist Data];
        C -- Sends Email (Validation Link) --> F[Supervisor];
        F -- Clicks Validation Link --> G[User Browser: /app/validate-checklist/:id];
        G -- Served by --> H[dhl_login: Port 3000/3443];
        G -- GET /validate/:id (for data) --> B;
        B -- /validate/:id --> C;
        C -- Reads from --> D;
        C -- Returns Data --> G;
        G -- Submits Validation --> B;
        B -- POST /validate/:id --> C;
        C -- Updates --> D;
        C -- Updates --> E;

        I[Automation Engine @ C] -- Reads Rules & Data --> E;
        I -- Creates New Assignments --> E;
        I -- May Query for User Roles --> H;
        J[Dashboards/BI] -- Queries --> E;
        J -- User Context from JWT --> H;
        K[dhl_login Auth] -- Manages Users --> L[SQLite: User DB];
        H -- Issues JWT --> A;
    end
    ```

**4. PostgreSQL Database Design (Checklist System)**

*   **4.1. Guiding Principles:**
    *   The PostgreSQL database is primarily for new features: automation, granular tracking, BI, and dashboards. JSON files remain the record for the existing supervisor validation workflow.
    *   Checklist structure (tasks, headings) will be parsed from the submitted JSON/HTML for each new submission and stored relationally in PostgreSQL.
    *   User identifiers (`userId`, `username` from JWT) will be stored with checklist submissions. Additional user details (e.g., roles for automation/dashboards) will be fetched from `dhl_login` via API as needed.
    *   PostgreSQL will start fresh with data from new submissions onwards; no migration of historical JSON data.
*   **4.2. Key Tables (Conceptual):**
    *   `ChecklistSubmissions`:
        *   `submission_id` (PK, SERIAL)
        *   `original_checklist_filename` (TEXT, e.g., "1_A_Cell_West_Side_Daily.html")
        *   `checklist_title` (TEXT, from submission)
        *   `submitted_by_user_id` (INTEGER, from JWT)
        *   `submitted_by_username` (TEXT, from JWT)
        *   `submission_timestamp` (TIMESTAMPTZ)
        *   `status` (TEXT, e.g., 'PendingSupervisorValidation', 'SupervisorValidated', 'CompletedByAutomation', 'Overdue')
        *   `json_file_path` (TEXT, path to the corresponding `backend/data/*.json` file)
        *   `due_date` (TIMESTAMPTZ, optional, set by automation)
        *   `assigned_to_user_id` (INTEGER, optional, set by automation)
    *   `SubmissionHeadings`:
        *   `heading_id` (PK, SERIAL)
        *   `submission_id` (FK to `ChecklistSubmissions`)
        *   `heading_text` (TEXT)
        *   `display_order` (INTEGER)
    *   `SubmissionTasks`:
        *   `task_id` (PK, SERIAL)
        *   `heading_id` (FK to `SubmissionHeadings`)
        *   `task_identifier_in_json` (TEXT, e.g., the HTML `id` attribute)
        *   `task_label` (TEXT)
        *   `is_checked_on_submission` (BOOLEAN)
        *   `current_status` (TEXT, e.g., 'Pending', 'Completed', 'Skipped', 'Blocked', 'ValidatedOK', 'ValidatedNotOK')
        *   `last_status_update_timestamp` (TIMESTAMPTZ)
        *   `supervisor_validated_status` (BOOLEAN, nullable, true if supervisor checked it as OK, false if not/NA)
        *   `comments` (TEXT, if any specific to this task)
    *   `AutomationRules`:
        *   `rule_id` (PK, SERIAL)
        *   `source_checklist_filename_pattern` (TEXT, e.g., "1_A_Cell_West_Side_Daily.html", or patterns like "%_Daily.html")
        *   `trigger_event` (TEXT, e.g., 'ON_SUBMISSION_COMPLETE', 'ON_SUPERVISOR_VALIDATION')
        *   `next_checklist_filename` (TEXT, filename of the checklist to assign)
        *   `assignment_logic_type` (TEXT, e.g., 'SAME_USER', 'SPECIFIC_USER', 'ROLE_BASED_ROUND_ROBIN')
        *   `assignment_logic_detail` (TEXT, e.g., specific user_id, role name)
        *   `delay_minutes_after_trigger` (INTEGER, default 0)
        *   `is_active` (BOOLEAN, default true)
    *   `ChecklistAssignments` (Tracks who is actively working on an assigned checklist instance that was created by automation):
        *   `assignment_id` (PK, SERIAL)
        *   `submission_id` (FK to `ChecklistSubmissions`, representing the instance being worked on)
        *   `assigned_to_user_id` (INTEGER)
        *   `assignment_timestamp` (TIMESTAMPTZ)
        *   `due_timestamp` (TIMESTAMPTZ)
        *   `status` (TEXT, e.g., 'Assigned', 'InProgress', 'SubmittedForValidation', 'Overdue')
        *   `automation_rule_id` (FK to `AutomationRules`, optional, if assigned by automation)
    *   `AuditTrail`:
        *   `log_id` (PK, SERIAL)
        *   `timestamp` (TIMESTAMPTZ, default NOW())
        *   `submission_id` (FK to `ChecklistSubmissions`, nullable)
        *   `user_id` (INTEGER, nullable, who performed the action)
        *   `action_type` (TEXT, e.g., 'SUBMITTED', 'VALIDATED_BY_SUPERVISOR', 'ASSIGNED_BY_AUTOMATION', 'TASK_STATUS_CHANGED', 'AUTOMATION_RULE_CREATED')
        *   `details` (JSONB, for storing relevant payload or changes)
    *   `SupervisorValidationsLog`:
        *   `validation_log_id` (PK, SERIAL)
        *   `submission_id` (FK to `ChecklistSubmissions`)
        *   `supervisor_name` (TEXT, from validation form)
        *   `validation_timestamp` (TIMESTAMPTZ)
        *   `validated_items_summary` (JSONB, storing the state of items the supervisor explicitly validated)
*   **4.3. Relationships (Conceptual ERD - Mermaid):**
    ```mermaid
    erDiagram
        ChecklistSubmissions ||--o{ SubmissionHeadings : contains
        SubmissionHeadings ||--o{ SubmissionTasks : contains
        ChecklistSubmissions }o--|| SupervisorValidationsLog : "is_validated_by (log)"
        ChecklistSubmissions }o--|| ChecklistAssignments : "can_be_an_assignment_instance"
        AutomationRules ||--o{ ChecklistAssignments : "can_trigger"
        AuditTrail }o--|| ChecklistSubmissions : "logs_for (optional)"

        ChecklistSubmissions {
            INTEGER submission_id PK
            TEXT original_checklist_filename
            TEXT checklist_title
            INTEGER submitted_by_user_id
            TEXT submitted_by_username
            TIMESTAMPTZ submission_timestamp
            TEXT status
            TEXT json_file_path
            TIMESTAMPTZ due_date
            INTEGER assigned_to_user_id
        }
        SubmissionHeadings {
            INTEGER heading_id PK
            INTEGER submission_id FK
            TEXT heading_text
            INTEGER display_order
        }
        SubmissionTasks {
            INTEGER task_id PK
            INTEGER heading_id FK
            TEXT task_identifier_in_json
            TEXT task_label
            BOOLEAN is_checked_on_submission
            TEXT current_status
            TIMESTAMPTZ last_status_update_timestamp
            BOOLEAN supervisor_validated_status
            TEXT comments
        }
        AutomationRules {
            INTEGER rule_id PK
            TEXT source_checklist_filename_pattern
            TEXT trigger_event
            TEXT next_checklist_filename
            TEXT assignment_logic_type
            TEXT assignment_logic_detail
            INTEGER delay_minutes_after_trigger
            BOOLEAN is_active
        }
        ChecklistAssignments {
            INTEGER assignment_id PK
            INTEGER submission_id FK
            INTEGER assigned_to_user_id
            TIMESTAMPTZ assignment_timestamp
            TIMESTAMPTZ due_timestamp
            TEXT status
            INTEGER automation_rule_id FK
        }
        AuditTrail {
            INTEGER log_id PK
            TIMESTAMPTZ timestamp
            INTEGER submission_id FK
            INTEGER user_id
            TEXT action_type
            JSONB details
        }
        SupervisorValidationsLog {
            INTEGER validation_log_id PK
            INTEGER submission_id FK
            TEXT supervisor_name
            TIMESTAMPTZ validation_timestamp
            JSONB validated_items_summary
        }
    ```

**5. Modifications to `backend/server.js`**

*   **5.1. On `POST /submit-form`:**
    1.  (Existing) Authenticate JWT.
    2.  (Existing) Receive `formData`.
    3.  (Existing) Select random checkboxes for supervisor validation and add to `formData.randomCheckboxes`.
    4.  (Existing) Save `formData` to `backend/data/data_<timestamp>.json`.
    5.  (Existing) Send supervisor email with link to `/app/validate-checklist/<timestamp>`.
    6.  **(New)** Parse `formData` (checklist title, `nameInput` for username, `dateInput`, `checkboxes` object, comments).
    7.  **(New)** Begin PostgreSQL transaction.
    8.  **(New)** Create a record in `ChecklistSubmissions` (status 'PendingSupervisorValidation', `submitted_by_user_id` from JWT, `json_file_path`).
    9.  **(New)** Iterate through `formData.checkboxes` (headings and tasks):
        *   Create records in `SubmissionHeadings`.
        *   For each task under a heading, create a record in `SubmissionTasks` (linking to `SubmissionHeadings`, storing `task_identifier_in_json`, `task_label`, `is_checked_on_submission`, `current_status` 'Pending').
    10. **(New)** Log submission in `AuditTrail`.
    11. **(New)** Commit PostgreSQL transaction.
    12. **(New)** Trigger Checklist Automation Engine (see section 6) with the `submission_id` and `original_checklist_filename`.
    13. (Existing) Return success response.
*   **5.2. On `POST /validate/:id` (Supervisor Validation):**
    1.  (Existing) Authenticate JWT.
    2.  (Existing) Read original `formData` from `backend/data/data_<timestamp>.json`.
    3.  (Existing) Check if already validated; return error if so.
    4.  (Existing) Update `formData.checkboxes` based on supervisor's `validatedCheckboxes`.
    5.  (Existing) Add `formData.supervisorValidation` object.
    6.  (Existing) Overwrite the JSON file.
    7.  **(New)** Begin PostgreSQL transaction.
    8.  **(New)** Find the corresponding `submission_id` in `ChecklistSubmissions` using `json_file_path` or the timestamp ID.
    9.  **(New)** Update `ChecklistSubmissions.status` to 'SupervisorValidated'.
    10. **(New)** For each item in `validationData.validatedCheckboxes` from the request:
        *   Find the corresponding task in `SubmissionTasks` (using `submission_id` and `task_identifier_in_json`).
        *   Update `SubmissionTasks.supervisor_validated_status` and potentially `current_status` (e.g., to 'ValidatedOK' or 'ValidatedNotOK').
    11. **(New)** Create a record in `SupervisorValidationsLog`.
    12. **(New)** Log validation in `AuditTrail`.
    13. **(New)** Commit PostgreSQL transaction.
    14. **(New)** Trigger Checklist Automation Engine with the `submission_id` and event 'ON_SUPERVISOR_VALIDATION'.
    15. (Existing) Return success response.
*   **5.3. New API Endpoints for Dashboards/BI:**
    *   Endpoints to fetch aggregated data, checklist instances, task statuses, audit logs, etc., from PostgreSQL, with appropriate filtering and pagination. These will be protected by JWT.

**6. Checklist Assignment Automation Engine**

*   **6.1. Core Logic (Module within `backend/server.js`):**
    *   **Trigger Points:**
        *   Called after a new submission is successfully written to PostgreSQL (event: 'ON_SUBMISSION_COMPLETE').
        *   Called after a supervisor validation is successfully written to PostgreSQL (event: 'ON_SUPERVISOR_VALIDATION').
    *   **Process:**
        1.  Receive `submission_id` and `trigger_event` (and `original_checklist_filename` for new submissions).
        2.  Query `AutomationRules` table in PostgreSQL for rules matching `source_checklist_filename_pattern` and `trigger_event`.
        3.  For each matching rule:
            *   Determine `next_checklist_filename`.
            *   Determine assignee based on `assignment_logic_type`:
                *   `'SAME_USER'`: Use `submitted_by_user_id` from the triggering `ChecklistSubmissions` record.
                *   `'SPECIFIC_USER'`: Use `assignment_logic_detail` (which would be a `user_id`).
                *   `'ROLE_BASED_ROUND_ROBIN'` (or similar):
                    *   Requires fetching users for the specified role from `dhl_login` via a new API (e.g., `/api/users/by-role/:roleName`).
                    *   Implement round-robin or load-balancing logic. Store last assigned user per rule/role to facilitate this.
            *   Calculate `due_timestamp` (e.g., now + X hours/days defined in rule or default).
            *   Create a new "shell" `ChecklistSubmissions` record in PostgreSQL for the `next_checklist_filename`:
                *   `original_checklist_filename` = `next_checklist_filename` from rule.
                *   `checklist_title` = (derive from filename or a master list).
                *   `submitted_by_user_id` = null (or system ID).
                *   `submission_timestamp` = NOW().
                *   `status` = 'Assigned'.
                *   `json_file_path` = null (as it's not yet a user submission).
                *   `due_date` = calculated `due_timestamp`.
                *   `assigned_to_user_id` = determined assignee.
            *   Parse the structure of `next_checklist_filename` (from its HTML file in `Public/`) and populate `SubmissionHeadings` and `SubmissionTasks` for this new shell submission, with all tasks initially 'Pending'.
            *   Create a record in `ChecklistAssignments` linking the new shell `submission_id` to the `assigned_to_user_id` and `automation_rule_id`.
            *   Log assignment in `AuditTrail`.
            *   (Future) Trigger notification to the assignee.
*   **6.2. Managing Automation Rules:**
    *   Admin dashboard will need CRUD operations for `AutomationRules` table.
*   **6.3. Manual Override:**
    *   Admin/Manager dashboard feature to manually assign any checklist to any user. This would directly create records in `ChecklistSubmissions` (shell) and `ChecklistAssignments`.

**7. Tracking and Auditing System (PostgreSQL based)**

*   The `SubmissionTasks.current_status` and `last_status_update_timestamp` fields will provide granular, real-time task status.
*   The `ChecklistSubmissions.status` field gives overall status.
*   The `AuditTrail` table will log all significant events with user, timestamp, and details.

**8. Business Intelligence & Analytics**

*   **8.1. Key Metrics (from PostgreSQL):**
    *   Completion rates (overall, per `original_checklist_filename`, per user).
    *   Average time from assignment to submission, submission to supervisor validation.
    *   Task-level analysis: common 'Skipped'/'Blocked' tasks from `SubmissionTasks`.
    *   Compliance: % tasks `ValidatedOK` vs. `ValidatedNotOK`.
    *   User/Team Performance: based on completion rates, on-time performance.
*   **8.2. Data Source:** Direct SQL queries against the PostgreSQL database. Standard BI tools can connect via ODBC/JDBC.

**9. Role-Based Dashboards (Conceptual Suggestions)**

*   **9.1. Technology:** Frontend (React, Vue, or EJS served by `dhl_login` or a new simple dashboard service) making authenticated API calls to new endpoints on `backend/server.js` that query PostgreSQL.
*   **9.2. Suggested Roles & Dashboards:**
    *   **End-User (Sanitation Staff):**
        *   **View:** "My Active Checklists" (from `ChecklistAssignments` where `status` is 'Assigned' or 'InProgress' and `assigned_to_user_id` is theirs), due dates, link to the actual checklist HTML. "My Recent Submissions" (from `ChecklistSubmissions` where `submitted_by_user_id` is theirs).
        *   **KPIs:** # Assigned, # Completed, # Overdue.
    *   **Manager/Supervisor:**
        *   **View:** Team's Active Checklists (requires knowing team structure, potentially fetched from `dhl_login` API), overall progress for team assignments, overdue items for team, history of team submissions (from `ChecklistSubmissions`), status of supervisor validations.
        *   **KPIs:** Team completion rate, % overdue, average validation turnaround time.
        *   **Actions:** (Future) Manually assign a checklist from a master list to a team member.
    *   **Administrator:**
        *   **View:** System-wide overview of all active and completed checklists, user activity logs from `AuditTrail`, automation rule performance (e.g., # times triggered).
        *   **Actions:** CRUD for `AutomationRules`. View system logs.
        *   **KPIs:** # Checklists processed, # automated assignments, automation error rates.
    *   **Compliance Officer:**
        *   **View:** Compliance-focused dashboard: % of tasks validated OK, trends in non-compliance, drill-down to specific submissions or tasks that failed validation. Full `AuditTrail` access with filtering.
        *   **KPIs:** Overall compliance score, common failure points, validation timeliness.
*   **9.3. Visualizations:** Bar charts for completion rates, line charts for trends, tables for detailed lists.

**10. RPA Workflow Integration Points**

*   **Notifications:** The Automation Engine or a scheduled job querying PostgreSQL can:
    *   Trigger emails (via Nodemailer in `backend/server.js`) or call a webhook for new assignments, reminders for due dates, and escalations for overdue items.
*   **Follow-up Actions:**
    *   If a task in `SubmissionTasks` is marked 'Blocked' and has specific keywords in its comments, `backend/server.js` (perhaps on supervisor validation update) or a separate monitoring process could trigger an RPA bot (e.g., via API call to the bot) to create a ticket in an external system.

**11. Interaction with `dhl_login` (SQLite for Users)**

*   `backend/server.js` will store `submitted_by_user_id`, `submitted_by_username`, and `assigned_to_user_id` in PostgreSQL tables.
*   For role-based automation or dashboard filtering requiring user roles/attributes not in the JWT:
    *   `dhl_login` app will need to expose a new, secured API endpoint (e.g., `/api/auth/users/:userId/details` or `/api/auth/users/by-role/:roleName`) that the `backend/server.js` (or dashboard service) can call. This API would query the SQLite user database.
    *   This new API on `dhl_login` must be protected (e.g., require a specific JWT scope or internal service-to-service authentication).

**12. Technical Considerations**

*   **PostgreSQL Setup:** Installation, configuration, user/permissions setup for `backend/server.js`.
*   **Database Migrations (for PostgreSQL):** Use a tool like Sequelize-CLI (already in `dhl_login`) or Knex.js for managing schema changes in PostgreSQL.
*   **Dual Write Consistency (`backend/server.js`):** Implement robust error handling if saving JSON succeeds but writing to PostgreSQL fails (or vice-versa). Consider a retry queue or logging for reconciliation. For initial phase, log error and continue if JSON part succeeds (as it's primary for validation).
*   **API Versioning:** If `dhl_login` exposes new APIs, consider versioning.
*   **Environment Variables:** New variables for PostgreSQL connection, `dhl_login` API endpoint for user details.

**13. Potential Challenges**

*   **Defining "Next Checklist" Logic:** The initial trigger ("submission triggers next") is simple. Complex sequences, conditional branching, or parallel assignments in `AutomationRules` will require careful design.
*   **User Role Definition & Sync:** Clearly defining roles and ensuring the `dhl_login` API can provide necessary role/attribute data for the checklist system.
*   **Performance:** Parsing HTML/JSON on every submission for PostgreSQL insert could be intensive if checklists are very large or submissions frequent. Monitor and optimize. If it becomes an issue, "master checklist templates" in PG would be a V2 improvement.
*   **Initial Setup of Automation Rules:** Requires manual input via admin UI.

**14. Phased Rollout (Suggestion)**

1.  **Phase 1 (Core PostgreSQL & Basic Tracking):**
    *   Set up PostgreSQL.
    *   Modify `backend/server.js` to populate `ChecklistSubmissions`, `SubmissionHeadings`, `SubmissionTasks`, `SupervisorValidationsLog`, and `AuditTrail` (basic events) on submission and supervisor validation, alongside existing JSON operations.
    *   Develop basic Admin dashboard to view raw data in these PG tables.
2.  **Phase 2 (Initial Automation & User Dashboard):**
    *   Implement the "submission triggers next assignment" logic in the Automation Engine.
    *   Admin UI for basic `AutomationRules` (source checklist -> next checklist, assign to same user).
    *   Develop End-User dashboard to see "My Active Checklists".
    *   Develop `dhl_login` API for basic user detail fetching (if needed beyond JWT).
3.  **Phase 3 (Manager & Advanced Dashboards, BI Prep):**
    *   Develop Manager dashboards.
    *   Expand `AuditTrail` logging.
    *   Refine PG schema for BI queries.
4.  **Phase 4 (Compliance & Advanced Automation):**
    *   Develop Compliance Officer dashboards.
    *   Implement more complex automation triggers (role-based, scheduled - may require `node-cron` or similar in `backend/server.js`).
    *   Integrate RPA points.