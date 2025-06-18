# Missing Endpoints Inventory

This document lists all endpoints that are referenced in the codebase but do not have corresponding implementations.

## **Authentication Endpoints**

### **JWT Token Endpoint - CORRECTED**
- **Referenced**: `GET /api/auth/issue-jwt-for-session`
- **Location**: `dhl_login/test-api-endpoints.js:29`
- **Status**: ✅ **EXISTS**
- **Expected**: Provides JWT token for API authentication
- **Note**: Test script uses correct endpoint - documentation was outdated

## **Admin Dashboard Routes**

### **User Management**
- **Referenced**: `GET /admin/users/new` 
- **Location**: `dhl_login/views/admin/dashboard.ejs:233`, `dhl_login/views/dashboard.ejs:343`
- **Status**: ❌ **MISSING**
- **Expected**: User creation form page

- **Referenced**: `GET /admin/users`
- **Location**: `dhl_login/views/admin/dashboard.ejs:236`
- **Status**: ❌ **MISSING**
- **Expected**: List all users page

### **System Reports**
- **Referenced**: `GET /admin/reports`
- **Location**: `dhl_login/views/admin/dashboard.ejs:251`
- **Status**: ❌ **MISSING**
- **Expected**: System usage reports and statistics

### **Automation Rules Management**
- **Referenced**: `GET /admin/automation-rules`
- **Location**: `dhl_login/views/admin/dashboard.ejs:287`, `dhl_login/views/dashboard.ejs:340`
- **Status**: ❌ **MISSING**
- **Expected**: Automation rules management page

- **Referenced**: `GET /admin/automation-rules/new`
- **Location**: `dhl_login/views/admin/dashboard.ejs:290`
- **Status**: ❌ **MISSING**
- **Expected**: Create new automation rule form

- **Referenced**: `GET /admin/automation-rules/edit/:id`
- **Location**: Referenced in documentation
- **Status**: ❌ **MISSING**
- **Expected**: Edit automation rule form

- **Referenced**: `DELETE /admin/automation-rules/delete/:id`
- **Location**: Referenced in documentation
- **Status**: ❌ **MISSING**
- **Expected**: Delete automation rule endpoint

### **System Settings**
- **Referenced**: `GET /admin/settings`
- **Location**: `dhl_login/views/admin/dashboard.ejs:305`
- **Status**: ❌ **MISSING**
- **Expected**: System configuration settings page

- **Referenced**: `GET /admin/backup`
- **Location**: `dhl_login/views/admin/dashboard.ejs:308`
- **Status**: ❌ **MISSING**
- **Expected**: System backup management page

## **Manager Dashboard Routes**

### **Team Management**
- **Referenced**: `GET /manager/teams`
- **Location**: `dhl_login/views/manager/dashboard.ejs:236`
- **Status**: ❌ **MISSING**
- **Expected**: Team management page

- **Referenced**: `GET /manager/assignments`
- **Location**: `dhl_login/views/manager/dashboard.ejs:239`
- **Status**: ❌ **MISSING**
- **Expected**: Manual assignments management page

- **Referenced**: `GET /manager/performance`
- **Location**: `dhl_login/views/manager/dashboard.ejs:254`
- **Status**: ✅ **EXISTS** (has EJS template)
- **Note**: Template exists but route implementation may be missing

## **Compliance Dashboard Routes**

### **Compliance Management**
- **Referenced**: Various compliance routes referenced in templates
- **Status**: ⚠️ **PARTIAL** - Some routes exist, others may be missing
- **Note**: Need to verify all compliance routes are implemented

## **API Endpoints Referenced in Documentation**

### **Authentication API - CORRECTED**
- **Referenced**: `GET /api/auth/issue-jwt-for-session`
- **Location**: Implemented in `dhl_login/app.js`
- **Status**: ✅ **EXISTS**
- **Note**: Correct endpoint is implemented and working

## **Summary**

### **Critical Missing Endpoints** (High Priority)
1. `GET /admin/users/new` - User creation form
2. `GET /admin/users` - User management list
3. `GET /manager/teams` - Team management
4. `GET /manager/assignments` - Manual assignments

### **Administrative Missing Endpoints** (Medium Priority)
1. `GET /admin/reports` - System reports
2. `GET /admin/settings` - System settings
3. `GET /admin/backup` - Backup management
4. `GET /admin/automation-rules/new` - Create automation rule
5. `GET /admin/automation-rules/edit/:id` - Edit automation rule
6. `DELETE /admin/automation-rules/delete/:id` - Delete automation rule

### **Impact Assessment**
- **User Experience**: Broken navigation links in admin and manager dashboards
- **Testing**: Test scripts fail due to missing endpoints
- **Documentation**: Inconsistency between documented and actual endpoints
- **Functionality**: Core admin and manager features are inaccessible

### **Recommendations**
1. **Immediate**: Implement critical missing endpoints for core functionality
2. **Short-term**: Add missing admin and manager dashboard routes
3. **Long-term**: Audit all documentation for endpoint accuracy
4. **Testing**: Update test scripts to use correct endpoint names

---

*Generated on: 2025-06-18*
*Analysis based on static code analysis and template inspection*
