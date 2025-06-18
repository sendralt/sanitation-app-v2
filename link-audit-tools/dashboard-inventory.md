# Dashboard Inventory - Sanitation Checklist Application

## Overview
This document catalogs all dashboard interfaces, their routes, user roles, and associated functionality in the Sanitation Checklist Application.

## Application Architecture
- **Frontend Service**: `dhl_login` (Port 3000) - Authentication, session management, and UI
- **Backend Service**: `backend` (Port 3001/3445) - API endpoints and data processing
- **Static Assets**: `Public/` directory - Checklist HTML files and resources

## User Roles and Authentication
- **admin**: Full system access, user management, automation rules
- **manager**: Team management, performance analytics, assignments
- **user**: Basic checklist access and submission
- **compliance**: Compliance monitoring, metrics, audit trails

## Dashboard Catalog

### 1. Main User Dashboard
- **Route**: `/checklists/`
- **View**: `dhl_login/views/dashboard.ejs`
- **Access**: All authenticated users
- **Purpose**: Central hub for checklist access and user-specific functionality

#### Key Sections:
- **Active Checklists**: Links to available checklist forms
- **Recent Submissions**: User's recent checklist submissions
- **Quick Actions**: Common user tasks
- **Role-Specific Panels**: Conditional sections based on user role

#### Links Found:
- `/app/1_A_Cell_West_Side_Daily.html` - A Cell West Side Daily Checklist
- `/app/2_A_Cell_East_Side_Daily.html` - A Cell East Side Daily Checklist
- `/app/3_B_Cell_West_Side_Daily.html` - B Cell West Side Daily Checklist
- `/app/4_B_Cell_East_Side_Daily.html` - B Cell East Side Daily Checklist
- `/app/5_C_Cell_West_Side_Daily.html` - C Cell West Side Daily Checklist
- `/app/6_C_Cell_East_Side_Daily.html` - C Cell East Side Daily Checklist
- `/app/7_D_Cell_West_Side_Daily.html` - D Cell West Side Daily Checklist
- `/app/8_D_Cell_East_Side_Daily.html` - D Cell East Side Daily Checklist
- `/app/9_E_Cell_West_Side_Daily.html` - E Cell West Side Daily Checklist
- `/app/10_E_Cell_East_Side_Daily.html` - E Cell East Side Daily Checklist
- `/app/11_F_Cell_West_Side_Daily.html` - F Cell West Side Daily Checklist
- `/app/12_F_Cell_East_Side_Daily.html` - F Cell East Side Daily Checklist
- `/app/13_All_Cells_Weekly.html` - All Cells Weekly Checklist
- `/app/14_All_Cells_Weekly.html` - All Cells Weekly Checklist (Duplicate?)
- `/app/15_A&B_Cells_LL_Quarterly.html` - A&B Cells Low Level Quarterly
- `/app/16_D_Cell_LL_Quarterly.html` - D Cell Low Level Quarterly
- `/app/17_A_Cell_High_Level_Quarterly.html` - A Cell High Level Quarterly
- `/app/18_B_Cell_High_Level_Quarterly.html` - B Cell High Level Quarterly
- `/app/19_C_Cell_High_Level_Quarterly.html` - C Cell High Level Quarterly
- `/app/20_D_Cell_High_Level_Quarterly.html` - D Cell High Level Quarterly
- `/app/21_E_Cell_High_Level_Quarterlyl.html` - E Cell High Level Quarterly
- `/app/22_F_Cell_High_Level_Quarterlyl.html` - F Cell High Level Quarterly

### 2. Admin Dashboard
- **Route**: `/admin`
- **View**: `dhl_login/views/admin/dashboard.ejs`
- **Access**: admin role only
- **Purpose**: System administration and user management

#### Key Sections:
- **User Management**: Create, edit, delete users
- **System Monitoring**: Health checks and performance metrics
- **Database Management**: PostgreSQL dashboard access
- **Automation Rules**: Configure automated processes

#### Links Found:
- `/admin/postgresql` - PostgreSQL Data Dashboard
- `/admin/automation-rules` - Automation Rules Management
- `/admin/users/new` - Create New User
- `/admin/logs` - System Logs
- `/admin/reports` - Administrative Reports

### 3. Manager Dashboard
- **Route**: `/manager`
- **View**: `dhl_login/views/manager/dashboard.ejs`
- **Access**: manager and admin roles
- **Purpose**: Team management and performance oversight

#### Key Sections:
- **Team Overview**: Direct reports and team status
- **Performance Analytics**: Completion rates and metrics
- **Assignment Management**: Manual task assignments
- **Team Management**: User assignments and permissions

#### Links Found:
- `/manager/teams` - Team Management Interface
- `/manager/performance` - Performance Analytics Dashboard
- `/manager/assignments` - Manual Assignment Interface

### 4. Compliance Dashboard
- **Route**: `/compliance`
- **View**: `dhl_login/views/compliance/dashboard.ejs`
- **Access**: compliance, manager, and admin roles
- **Purpose**: Compliance monitoring and audit trail management

#### Key Sections:
- **Compliance Overview**: High-level compliance metrics
- **Audit Trail**: Detailed audit logs and history
- **Non-Compliance Tracking**: Issues and resolution status
- **Metrics Dashboard**: Compliance performance indicators

#### Links Found:
- `/compliance/metrics` - Detailed Compliance Metrics
- `/compliance/audit-trail` - Audit Trail Viewer
- `/compliance/non-compliance` - Non-Compliance Issues

### 5. PostgreSQL Dashboard
- **Route**: `/admin/postgresql`
- **View**: `dhl_login/views/admin/postgresql-dashboard.ejs`
- **Access**: admin role only
- **Purpose**: Database monitoring and data visualization

#### Key Sections:
- **Submission Statistics**: Total submissions and validations
- **Data Tables**: Recent submissions and validations
- **System Health**: Database performance metrics
- **Data Export**: Export functionality for reports

#### Links Found:
- `/admin/postgresql/submissions` - Detailed Submissions View
- `/admin/postgresql/submission/:id` - Individual Submission Details

### 6. Automation Rules Dashboard
- **Route**: `/admin/automation-rules`
- **View**: `dhl_login/views/admin/automation-rules.ejs`
- **Access**: admin role only
- **Purpose**: Configure and manage automation rules

#### Key Sections:
- **Active Rules**: Currently configured automation rules
- **Rule Creation**: Form to create new automation rules
- **Rule Management**: Edit, delete, enable/disable rules
- **Automation Status**: Current automation system status

#### Links Found:
- `/admin/automation-rules/new` - Create New Automation Rule
- `/admin/automation-rules/edit/:id` - Edit Existing Rule
- `/admin/automation-rules/delete/:id` - Delete Rule

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/login-api` - API login
- `GET /api/auth/token` - Get JWT token
- `GET /api/auth/users` - Get user list (role-restricted)

### Backend API Endpoints
- `/api/compliance/overview` - Compliance overview data
- `/api/compliance/metrics` - Compliance metrics
- `/api/compliance/audit-trail` - Audit trail data
- `/api/compliance/non-compliance` - Non-compliance issues
- `/api/admin/rpa/status` - RPA automation status
- `/api/admin/scheduled-automation/status` - Scheduled automation status

## Static File Routes
- `/app/*` - Protected static checklist files from `Public/` directory
- `/css/*` - Stylesheets
- `/js/*` - JavaScript files
- `/images/*` - Image assets

## Health Check Endpoints
- `/health` - Basic health check
- `/health/database` - Database connectivity check
- `/health/detailed` - Detailed system health

## Authentication Flow
1. User accesses `/login-page`
2. Credentials validated via Passport.js local strategy
3. Session established with express-session
4. JWT token available via `/api/auth/token` for API calls
5. Role-based access control enforced on protected routes

## Known Issues to Investigate
1. Potential duplicate weekly checklist files (13 and 14)
2. Typo in quarterly checklist filenames ("Quarterlyl" instead of "Quarterly")
3. Missing manager user creation in some seeder scripts
4. Potential routing conflicts between web and API endpoints

## Testing Credentials
- **Admin**: username: `admin`, password: `admin123`
- **Manager**: username: `manager`, password: `manager123`
- **User**: username: `user`, password: `user123`
- **Compliance**: username: `compliance`, password: `Compliance123!`

## Next Steps
1. Run automated link checker to verify all routes
2. Test cross-role access permissions
3. Validate API endpoint functionality
4. Check static file accessibility
5. Verify authentication flow for each role
