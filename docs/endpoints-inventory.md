# Complete Endpoints Inventory

This document provides a comprehensive list of all existing endpoints in the sanitation application codebase.

## **Frontend Application (dhl_login - Port 3000)**

### **Web Page Routes**
- `GET /` - Redirects to login page
- `GET /login-page` - Login form page
- `POST /login-page` - Login form submission
- `GET /logout-page` - Logout handler
- `GET /dashboard` - User dashboard (protected)
- `GET /forgot-password` - Password reset form
- `GET /dhl-logo.svg` - DHL logo asset
- `GET /app/validate-checklist/:id` - Supervisor validation page (protected)
- `GET /app` - Main application index
- `USE /app` - Static file serving for application

### **API Configuration**
- `GET /api/config` - Frontend configuration (backend URL, supervisor email)

### **Mounted Route Modules**
- `USE /api/auth` - Authentication API routes
- `USE /admin` - Admin dashboard routes
- `USE /manager` - Manager dashboard routes  
- `USE /compliance` - Compliance dashboard routes
- `USE /checklists` - Checklist management routes
- `USE /` - Health check routes

## **Backend API Server (Port 3001)**

### **Core Checklist Operations**
- `POST /submit-form` - Submit checklist form data
- `GET /validate/:id` - Load validation page data
- `POST /validate/:id` - Submit supervisor validation
- `GET /validate-status/:id` - Check validation status
- `GET /view-checklist/:id` - View checklist data (JSON)
- `GET /view-checklist-html/:id` - View checklist data (HTML)

### **User Management & Assignments**
- `GET /api/user/assignments` - Get user's active assignments
- `GET /api/user/submissions` - Get user's recent submissions
- `GET /api/user/teams` - Get user's team memberships
- `GET /api/user/stats` - User dashboard statistics
- `GET /api/assignments/:assignmentId` - Get assignment details
- `PATCH /api/assignments/:assignmentId/status` - Update assignment status

### **Team Management**
- `GET /api/teams` - Get all teams (managers/admins)
- `GET /api/teams/:teamId/members` - Get team members
- `POST /api/teams/:teamId/members` - Add user to team
- `DELETE /api/teams/:teamId/members/:userId` - Remove user from team

### **Manager Dashboard APIs**
- `GET /api/manager/stats` - Manager dashboard statistics
- `GET /api/manager/team-assignments` - Team assignments overview
- `GET /api/manager/team-performance` - Team performance analytics
- `GET /api/manager/audit-trail` - Manager audit trail
- `GET /api/manager/compliance-report` - Manager compliance report
- `GET /api/manager/available-checklists` - Available checklists for assignment
- `POST /api/manager/manual-assignment` - Create manual assignment
- `GET /api/manager/manual-assignments` - Get manual assignments
- `PATCH /api/manager/manual-assignment/:assignmentId` - Update manual assignment

### **Analytics APIs**
- `GET /api/analytics/submissions` - Submission analytics
- `GET /api/analytics/team-performance` - Team performance analytics
- `GET /api/analytics/compliance` - Compliance metrics
- `GET /api/analytics/assignments` - Assignment analytics
- `GET /api/analytics/completion-trends` - Completion trends
- `GET /api/analytics/validation-turnaround` - Validation turnaround times
- `GET /api/analytics/team-productivity` - Team productivity metrics

### **Compliance APIs (Phase 4)**
- `GET /api/compliance/overview` - Compliance overview statistics
- `GET /api/compliance/metrics` - Detailed compliance metrics
- `GET /api/compliance/audit-trail` - Audit trail with filtering
- `GET /api/compliance/non-compliance` - Non-compliance reports

### **Admin APIs (Phase 4)**
- `GET /api/admin/scheduled-automation/status` - Scheduled automation status
- `GET /api/admin/rpa/status` - RPA integration status
- `POST /api/admin/rpa/trigger` - Manual RPA workflow trigger

### **Health Check**
- `GET /health` - Basic health check endpoint

## **Authentication API Routes (dhl_login/routes/auth.js)**
- `POST /api/auth/login-api` - API login
- `GET /api/auth/issue-jwt-for-session` - Issue JWT for session
- `GET /api/auth/me` - Get current user info (JWT protected)
- `GET /api/auth/users/by-role/:roleName` - Get users by role
- `GET /api/auth/users/:userId/details` - Get user details
- `GET /api/auth/users` - Get all users with filtering

## **Admin Dashboard Routes (dhl_login/routes/admin.js)**
- `GET /admin/` - Admin dashboard
- `GET /admin/logs` - System logs dashboard
- `GET /admin/postgresql` - PostgreSQL data dashboard
- `GET /admin/postgresql/submissions` - View all submissions
- Additional admin management routes

## **Manager Dashboard Routes (dhl_login/routes/manager.js)**
- Manager-specific dashboard routes

## **Compliance Dashboard Routes (dhl_login/routes/compliance.js)**
- `GET /compliance/audit` - Audit trail page
- `GET /compliance/non-compliance` - Non-compliance reports page
- Additional compliance routes

## **Checklist Routes (dhl_login/routes/checklist.js)**
- `GET /checklists/` - Checklist dashboard

## **Health Check Routes (backend/routes/health.js)**
- `GET /health` - Detailed health status with system metrics

## **Summary**
- **Total Backend API Endpoints**: ~40 endpoints
- **Total Frontend Routes**: ~21 routes  
- **Authentication Required**: Most API endpoints require JWT authentication
- **Role-Based Access**: Many endpoints have role-specific access controls (user, manager, admin, compliance)
- **Main Servers**: Frontend (port 3000), Backend API (port 3001)

The application has a comprehensive set of endpoints covering user management, checklist operations, team management, analytics, compliance monitoring, and administrative functions across multiple phases of development.

---

*Generated on: 2025-06-18*
*Last Updated: Phase 4 Implementation*
