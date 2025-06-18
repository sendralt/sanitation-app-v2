# Endpoint Fixes Task List

Based on the comprehensive endpoint analysis findings, this structured task list addresses all identified issues with prioritization, categorization, and detailed specifications.

## CRITICAL PRIORITY - Authentication & Core Functionality

### 🔐 Authentication Fixes

**Task 1: Fix Authentication Endpoint Mismatch in Test Scripts**
- **Priority**: Critical
- **Category**: Authentication Fixes
- **Files to modify**: 
  - `dhl_login/test-api-endpoints.js` (line 29)
  - Search for other files referencing `/api/auth/token`
- **Action**: Change `POST /api/auth/token` to `GET /api/auth/issue-jwt-for-session`
- **Deliverable**: Updated test scripts that use correct authentication endpoint
- **Verification**: Run test scripts and confirm they pass authentication checks
- **Effort**: Low (15 minutes)
- **Dependencies**: None
- **Blocker**: None

### 🔍 Investigation Tasks

**Task 2: Verify Automation Rules Edit/Delete Functionality**
- **Priority**: Critical
- **Category**: Investigation Tasks
- **Files to investigate**: 
  - `dhl_login/routes/admin.js` (automation rules section around line 430+)
  - `dhl_login/views/admin/automation-rules.ejs`
- **Action**: Check if GET route for edit form (`/automation-rules/edit/:id`) and DELETE route exist
- **Deliverable**: Documentation of actual automation rules CRUD capabilities
- **Verification**: Test edit/delete functionality through admin dashboard
- **Effort**: Medium (30 minutes)
- **Dependencies**: Admin user account access
- **Blocker**: None

## HIGH PRIORITY - Missing Route Handlers with Existing Templates

### 🛣️ Route Implementations

**Task 3: Implement Missing Admin User Management Route Handler**
- **Priority**: High
- **Category**: Route Implementations
- **Files to modify**: `dhl_login/routes/admin.js`
- **Template exists**: `dhl_login/views/admin/create-user.ejs`
- **Action**: Add `router.get('/users/new', ensureAuthenticated, ensureAdmin, ...)` route handler
- **Deliverable**: Working user creation form accessible via `/admin/users/new`
- **Verification**: Navigate to `/admin/users/new` and confirm form loads
- **Effort**: Low (20 minutes)
- **Dependencies**: None
- **Blocker**: None

**Task 4: Implement Admin Reports Route Handler**
- **Priority**: High
- **Category**: Route Implementations
- **Files to modify**: `dhl_login/routes/admin.js`
- **Template exists**: `dhl_login/views/admin/reports.ejs`
- **Action**: Add `router.get('/reports', ...)` route handler with data fetching logic
- **Deliverable**: Working reports page accessible via `/admin/reports`
- **Verification**: Navigate to `/admin/reports` and confirm page loads with data
- **Effort**: Medium (45 minutes)
- **Dependencies**: Determine what data to display in reports
- **Blocker**: Need to define report requirements

**Task 5: Create Admin User List Page and Route**
- **Priority**: High
- **Category**: Route Implementations
- **Files to create/modify**: 
  - `dhl_login/routes/admin.js` (add route handler)
  - `dhl_login/views/admin/users.ejs` (create template)
- **API exists**: `GET /api/auth/users`
- **Action**: Create frontend page that consumes existing user API
- **Deliverable**: User management list page accessible via `/admin/users`
- **Verification**: Navigate to `/admin/users` and confirm user list displays
- **Effort**: Medium (60 minutes)
- **Dependencies**: None (API already exists)
- **Blocker**: None

### ✅ Testing & Verification

**Task 6: Test All False Positive Endpoints**
- **Priority**: High
- **Category**: Testing Corrections
- **Endpoints to test**:
  - `GET /admin/automation-rules`
  - `GET /admin/automation-rules/new`
  - `GET /manager/teams`
  - `GET /manager/assignments`
  - `GET /manager/performance`
  - All compliance routes (`/compliance/`, `/compliance/audit`, etc.)
- **Action**: Manual browser testing of each endpoint with appropriate user roles
- **Deliverable**: Verification report confirming which endpoints actually work
- **Verification**: Document any broken links or 404 errors found
- **Effort**: Medium (45 minutes)
- **Dependencies**: Test user accounts with admin, manager, and compliance roles
- **Blocker**: Need proper user accounts for testing

## MEDIUM PRIORITY - Documentation Updates

### 📚 Documentation Updates

**Task 7: Update Documentation for Authentication Endpoints**
- **Priority**: Medium
- **Category**: Documentation Updates
- **Files to modify**:
  - `docs/endpoints-inventory.md`
  - `docs/missing-endpoints.md`
  - `link-audit-tools/dashboard-inventory.md`
  - Any other API documentation files
- **Action**: Replace all references to `/api/auth/token` with `/api/auth/issue-jwt-for-session`
- **Deliverable**: Accurate documentation reflecting actual endpoints
- **Verification**: Search codebase for any remaining incorrect references
- **Effort**: Low (30 minutes)
- **Dependencies**: Complete authentication endpoint testing first
- **Blocker**: None

**Task 8: Update Endpoints Inventory Documentation**
- **Priority**: Medium
- **Category**: Documentation Updates
- **Files to modify**: 
  - `docs/endpoints-inventory.md`
  - `docs/missing-endpoints.md`
- **Action**: Remove false positives and add newly discovered endpoints
- **Deliverable**: Accurate inventory of existing vs missing endpoints
- **Verification**: Cross-reference with actual route implementations
- **Effort**: Medium (45 minutes)
- **Dependencies**: Complete endpoint testing first (Task 6)
- **Blocker**: None

## LOW PRIORITY - New Feature Implementation

### 🆕 New Features

**Task 9: Implement Admin Settings and Backup Pages**
- **Priority**: Low
- **Category**: Route Implementations
- **Files to create**:
  - `dhl_login/views/admin/settings.ejs`
  - `dhl_login/views/admin/backup.ejs`
  - Route handlers in `dhl_login/routes/admin.js`
- **Action**: Create templates and route handlers for admin settings and backup
- **Deliverable**: Working settings and backup pages
- **Verification**: Navigate to pages and confirm basic functionality
- **Effort**: High (2-3 hours)
- **Dependencies**: Define requirements for settings and backup functionality
- **Blocker**: Requirements not defined

**Task 10: Create Comprehensive Endpoint Testing Suite**
- **Priority**: Low
- **Category**: Testing Corrections
- **Files to create**: 
  - `tests/endpoint-verification.js`
  - `tests/dashboard-navigation.js`
- **Action**: Develop automated tests for all dashboard navigation and API endpoints
- **Deliverable**: Automated test suite that verifies endpoint functionality
- **Verification**: Run tests and confirm all endpoints respond correctly
- **Effort**: High (3-4 hours)
- **Dependencies**: Complete all route implementations first
- **Blocker**: None

## PREREQUISITES & BLOCKERS

### Authentication Requirements:
- Test user accounts with admin, manager, and compliance roles
- Session authentication must be working for protected routes

### Database Dependencies:
- PostgreSQL database accessible for admin reports functionality
- User data must exist for user management pages

### Environment Setup:
- Frontend (port 3000) and backend (port 3001) servers running
- Proper environment variables configured

## SUCCESS CRITERIA

### Phase 1 (Critical/High Priority):
- ✅ All test scripts use correct authentication endpoints
- ✅ All dashboard navigation links work without 404 errors
- ✅ User management functionality accessible and working

### Phase 2 (Medium Priority):
- ✅ Documentation accurately reflects actual implementations
- ✅ No false positives in missing endpoints list

### Phase 3 (Low Priority):
- ✅ Admin settings and backup functionality implemented
- ✅ Comprehensive automated testing suite in place

## ESTIMATED TOTAL EFFORT
- **Critical Priority**: 45 minutes
- **High Priority**: 2.5 hours  
- **Medium Priority**: 1.25 hours
- **Low Priority**: 5-7 hours
- **Total**: 9-11 hours

---

*Generated on: 2025-06-18*
*Based on endpoint analysis findings in docs/endpoint-replacement-analysis.md*
