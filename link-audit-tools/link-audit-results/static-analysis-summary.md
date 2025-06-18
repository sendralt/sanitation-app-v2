# Static Link Analysis Summary

**Generated:** 2025-06-18T14:31:23.851Z

## Overview

- **EJS Templates:** 22
- **Route Files:** 9
- **JavaScript Files:** 2
- **Static Checklists:** 30
- **Total Links:** 127
- **Total Routes:** 110

## EJS Templates

### dhl_login\views\admin\automation-rule-form.ejs
- **Links found:** 4
  - `/admin` (line 9)
  - `/admin/automation-rules` (line 10)
  - `/admin/automation-rules` (line 192)
  - `<%= isEdit ? `/admin/automation-rules/${rule.rule_id}` : ` (line 32)

### dhl_login\views\admin\automation-rules.ejs
- **Links found:** 4
  - `/admin/automation-rules/new` (line 8)
  - `/admin` (line 30)
  - `/admin/automation-rules/<%= rule.rule_id %>/edit` (line 95)
  - `/admin/automation-rules/new` (line 117)

### dhl_login\views\admin\create-user.ejs
- **Links found:** 2
  - `/app/index.html` (line 132)
  - `/admin/users` (line 23)

### dhl_login\views\admin\dashboard.ejs
- **Links found:** 12
  - `/admin/users/new` (line 233)
  - `/admin/users` (line 236)
  - `/admin/reports` (line 251)
  - `/admin/logs` (line 254)
  - `/admin/postgresql` (line 269)
  - `/admin/postgresql/submissions` (line 272)
  - `/admin/automation-rules` (line 287)
  - `/admin/automation-rules/new` (line 290)
  - `/admin/settings` (line 305)
  - `/admin/backup` (line 308)
  - `/app` (line 323)
  - `/dashboard` (line 326)

### dhl_login\views\admin\logs.ejs
- **Links found:** 1
  - `/admin` (line 152)

### dhl_login\views\admin\postgresql-dashboard.ejs
- **Links found:** 3
  - `/admin/postgresql/submissions/<%= submission.submission_id %>` (line 241)
  - `/admin/postgresql/submissions` (line 260)
  - `/admin` (line 261)

### dhl_login\views\admin\postgresql-submission-detail.ejs
- **Links found:** 2
  - `/admin/postgresql/submissions` (line 241)
  - `/admin/postgresql` (line 242)

### dhl_login\views\admin\postgresql-submissions.ejs
- **Links found:** 5
  - `/admin/postgresql` (line 211)
  - `/admin` (line 212)
  - `/admin/postgresql/submissions/<%= submission.submission_id %>` (line 233)
  - `?page=<%= currentPage - 1 %>` (line 267)
  - `?page=<%= currentPage + 1 %>` (line 275)

### dhl_login\views\admin\reports.ejs
- **Links found:** 7
  - `/admin` (line 218)
  - `/admin/postgresql/submissions` (line 283)
  - `/admin/postgresql` (line 286)
  - `/admin/logs` (line 306)
  - `/admin/users/new` (line 323)
  - `/admin/automation-rules` (line 343)
  - `/admin/automation-rules/new` (line 346)

### dhl_login\views\compliance\dashboard.ejs
- **Links found:** 8
  - `/compliance/metrics` (line 229)
  - `/manager/performance` (line 232)
  - `/compliance/audit` (line 247)
  - `/admin/postgresql` (line 250)
  - `/compliance/non-compliance` (line 265)
  - `/compliance/validation-trends` (line 268)
  - `/compliance/validation-trends` (line 283)
  - `/compliance/metrics` (line 286)

### dhl_login\views\compliance\metrics.ejs
- **Links found:** 2
  - `/compliance` (line 259)
  - `/compliance/audit` (line 260)

### dhl_login\views\dashboard.ejs
- **Links found:** 16
  - `/app/index.html` (line 252)
  - `/forgot-password` (line 258)
  - `/compliance` (line 286)
  - `/compliance/metrics` (line 289)
  - `/compliance/audit` (line 292)
  - `/compliance/non-compliance` (line 295)
  - `/manager` (line 310)
  - `/manager/teams` (line 313)
  - `/manager/performance` (line 316)
  - `/manager/assignments` (line 319)
  - `/admin` (line 334)
  - `/admin/postgresql` (line 337)
  - `/admin/automation-rules` (line 340)
  - `/admin/users/new` (line 343)
  - `/app/index.html` (line 568)
  - `/app/index.html` (line 568)

### dhl_login\views\error.ejs
- **Links found:** 4
  - `/dashboard` (line 175)
  - `/login-page` (line 179)
  - `/dashboard` (line 218)
  - `/dashboard` (line 218)

### dhl_login\views\forgot-password.ejs
- **Links found:** 2
  - `/login-page` (line 20)
  - `/login-page` (line 79)

### dhl_login\views\layouts\main.ejs
- **Links found:** 2
  - `/css/dhl-styles.css` (line 9)
  - `/logout-page` (line 17)

### dhl_login\views\layouts\test_layout.ejs
- **Links found:** 0

### dhl_login\views\login.ejs
- **Links found:** 2
  - `/forgot-password` (line 27)
  - `/login-page` (line 7)

### dhl_login\views\manager\assignments.ejs
- **Links found:** 1
  - `/manager` (line 222)

### dhl_login\views\manager\dashboard.ejs
- **Links found:** 6
  - `/manager/teams` (line 236)
  - `/manager/assignments` (line 239)
  - `/manager/performance` (line 254)
  - `/admin/postgresql` (line 257)
  - `/app` (line 272)
  - `/dashboard` (line 275)

### dhl_login\views\manager\performance.ejs
- **Links found:** 1
  - `/manager` (line 240)

### dhl_login\views\manager\teams.ejs
- **Links found:** 1
  - `/manager` (line 158)

### dhl_login\views\test_page.ejs
- **Links found:** 0

## Routes

### dhl_login\routes\admin.js
- **GET** `/` (line 32)
- **GET** `/reports` (line 38)
- **GET** `/logs` (line 120)
- **GET** `/users/new` (line 151)
- **POST** `/users` (line 177)
- **GET** `/postgresql` (line 294)
- **GET** `/postgresql/submissions` (line 341)
- **GET** `/postgresql/submissions/:id` (line 375)
- **GET** `/automation-rules` (line 433)
- **GET** `/automation-rules/new` (line 455)
- **POST** `/automation-rules` (line 468)
- **GET** `/automation-rules/:id/edit` (line 565)
- **POST** `/automation-rules/:id` (line 592)
- **POST** `/automation-rules/:id/delete` (line 688)

### dhl_login\routes\auth.js
- **GET** `/security-questions` (line 50)
- **POST** `/register` (line 56)
- **POST** `/login-api` (line 105)
- **POST** `/request-password-reset-questions` (line 138)
- **POST** `/verify-security-answers` (line 176)
- **POST** `/reset-password` (line 253)
- **GET** `/issue-jwt-for-session` (line 292)
- **POST** `/token` (line 326)
- **GET** `/me` (line 362)
- **GET** `/users/by-role/:roleName` (line 374)
- **GET** `/users/:userId/details` (line 425)
- **GET** `/users` (line 482)

### dhl_login\routes\checklist.js
- **GET** `/` (line 19)

### dhl_login\routes\compliance.js
- **GET** `/` (line 18)
- **GET** `/metrics` (line 27)
- **GET** `/audit` (line 36)
- **GET** `/non-compliance` (line 45)
- **GET** `/validation-trends` (line 54)

### dhl_login\routes\health.js
- **GET** `/health` (line 16)
- **GET** `/health/detailed` (line 34)
- **GET** `/health/database` (line 93)
- **GET** `/health/error-test/:type` (line 126)
- **GET** `/health/auth-test` (line 157)
- **GET** `/ready` (line 223)
- **GET** `/live` (line 258)

### dhl_login\routes\manager.js
- **GET** `/` (line 18)
- **GET** `/teams` (line 27)
- **GET** `/performance` (line 36)
- **GET** `/assignments` (line 45)

### backend\routes\health.js
- **GET** `/health` (line 17)
- **GET** `/health/detailed` (line 35)
- **GET** `/health/error-test/:type` (line 110)
- **GET** `/health/error-stats` (line 150)
- **GET** `/ready` (line 189)
- **GET** `/live` (line 214)

### dhl_login\app.js
- **GET** `/dhl-logo.svg` (line 123)
- **GET** `/app/validate-checklist/:id` (line 148)
- **GET** `/app` (line 169)
- **GET** `/` (line 176)
- **GET** `/login-page` (line 180)
- **POST** `/login-page` (line 191)
- **GET** `/logout-page` (line 242)
- **GET** `/dashboard` (line 253)
- **GET** `/forgot-password` (line 264)
- **GET** `/api/config` (line 276)
- **GET** `/health/database` (line 325)
- **/API** `/api` (line 59)
- **/API** `/api` (line 60)
- **/APP** `/app` (line 158)
- **/APP** `/app` (line 167)
- **/API/AUTH** `/api/auth` (line 290)
- **/ADMIN** `/admin` (line 293)
- **/MANAGER** `/manager` (line 302)
- **/COMPLIANCE** `/compliance` (line 311)
- **/CHECKLISTS** `/checklists` (line 320)
- **/** `/` (line 323)

### backend\server.js
- **POST** `/submit-form` (line 191)
- **GET** `/validate/:id` (line 410)
- **POST** `/validate/:id` (line 457)
- **GET** `/validate-status/:id` (line 602)
- **GET** `/view-checklist/:id` (line 629)
- **GET** `/view-checklist-html/:id` (line 653)
- **GET** `/api/user/assignments` (line 691)
- **GET** `/api/user/submissions` (line 730)
- **GET** `/api/assignments/:assignmentId` (line 775)
- **PATCH** `/api/assignments/:assignmentId/status` (line 848)
- **GET** `/api/teams` (line 903)
- **GET** `/api/teams/:teamId/members` (line 945)
- **GET** `/api/user/teams` (line 983)
- **POST** `/api/teams/:teamId/members` (line 1014)
- **DELETE** `/api/teams/:teamId/members/:userId` (line 1077)
- **GET** `/api/manager/stats` (line 1128)
- **GET** `/api/manager/team-assignments` (line 1266)
- **GET** `/api/manager/team-performance` (line 1364)
- **GET** `/api/manager/audit-trail` (line 1466)
- **GET** `/api/manager/compliance-report` (line 1519)
- **GET** `/api/analytics/submissions` (line 1561)
- **GET** `/api/analytics/team-performance` (line 1620)
- **GET** `/api/analytics/compliance` (line 1660)
- **GET** `/api/analytics/assignments` (line 1697)
- **GET** `/api/manager/available-checklists` (line 1744)
- **POST** `/api/manager/manual-assignment` (line 1783)
- **GET** `/api/manager/manual-assignments` (line 1895)
- **PATCH** `/api/manager/manual-assignment/:assignmentId` (line 1961)
- **GET** `/api/analytics/completion-trends` (line 2024)
- **GET** `/api/analytics/validation-turnaround` (line 2092)
- **GET** `/api/analytics/team-productivity` (line 2129)
- **GET** `/api/user/stats` (line 2194)
- **GET** `/api/compliance/overview` (line 2250)
- **GET** `/api/compliance/metrics` (line 2342)
- **GET** `/api/compliance/audit-trail` (line 2389)
- **GET** `/api/compliance/non-compliance` (line 2460)
- **GET** `/api/admin/scheduled-automation/status` (line 2559)
- **GET** `/api/admin/rpa/status` (line 2605)
- **POST** `/api/admin/rpa/trigger` (line 2648)
- **/** `/` (line 2689)

## Static Checklists

### 10_E_Cell_East_Side_Daily.html
- **Size:** 7KB
- **Links:** 1
  - `dhl-unified.css`

### 11_F_Cell_West_Side_Daily.html
- **Size:** 5KB
- **Links:** 1
  - `dhl-unified.css`

### 12_F_Cell_East_Side_Daily.html
- **Size:** 7KB
- **Links:** 1
  - `dhl-unified.css`

### 13_All_Cells_Weekly.html
- **Size:** 8KB
- **Links:** 1
  - `dhl-unified.css`

### 14_All_Cells_Weekly.html
- **Size:** 7KB
- **Links:** 1
  - `dhl-unified.css`

### 15_A&B_Cells_LL_Quarterly.html
- **Size:** 10KB
- **Links:** 1
  - `dhl-unified.css`

### 16_D_Cell_LL_Quarterly.html
- **Size:** 5KB
- **Links:** 1
  - `dhl-unified.css`

### 17_A_Cell_High_Level_Quarterly.html
- **Size:** 5KB
- **Links:** 1
  - `dhl-unified.css`

### 18_B_Cell_High_Level_Quarterly.html
- **Size:** 5KB
- **Links:** 1
  - `dhl-unified.css`

### 19_C_Cell_High_Level_Quarterly.html
- **Size:** 5KB
- **Links:** 1
  - `dhl-unified.css`

### 1_A_Cell_West_Side_Daily.html
- **Size:** 7KB
- **Links:** 1
  - `dhl-unified.css`

### 1_A_Cell_West_Side_Weekly.html
- **Size:** 7KB
- **Links:** 1
  - `dhl-unified.css`

### 20_D_Cell_High_Level_Quarterly.html
- **Size:** 5KB
- **Links:** 1
  - `dhl-unified.css`

### 21_E_Cell_High_Level_Quarterlyl.html
- **Size:** 5KB
- **Links:** 1
  - `dhl-unified.css`

### 22_F_Cell_High_Level_Quarterlyl.html
- **Size:** 6KB
- **Links:** 1
  - `dhl-unified.css`

### 2_A_Cell_East_Side_Daily.html
- **Size:** 6KB
- **Links:** 1
  - `dhl-unified.css`

### 2_B_Cell_East_Side_Daily.html
- **Size:** 6KB
- **Links:** 1
  - `dhl-unified.css`

### 3_B_Cell_West_Side_Daily.html
- **Size:** 4KB
- **Links:** 1
  - `dhl-unified.css`

### 4_B_Cell_East_Side_Daily.html
- **Size:** 9KB
- **Links:** 1
  - `dhl-unified.css`

### 5_C_Cell_West_Side_Daily.html
- **Size:** 7KB
- **Links:** 1
  - `dhl-unified.css`

### 6_C_Cell_East_Side_Daily.html
- **Size:** 8KB
- **Links:** 1
  - `dhl-unified.css`

### 7_D_Cell_West_Side_Daily.html
- **Size:** 8KB
- **Links:** 1
  - `dhl-unified.css`

### 8_D_Cell_East_Side_Daily.html
- **Size:** 8KB
- **Links:** 1
  - `dhl-unified.css`

### 9_E_Cell_West_Side_Daily.html
- **Size:** 8KB
- **Links:** 1
  - `dhl-unified.css`

### barcode_generator.html
- **Size:** 17KB
- **Links:** 0

### checklist-template.html
- **Size:** 1KB
- **Links:** 1
  - `dhl-unified.css`

### index.html
- **Size:** 2KB
- **Links:** 2
  - `dhl-unified.css`
  - `/login-page`

### test-scan.html
- **Size:** 8KB
- **Links:** 1
  - `dhl-unified.css`

### user_login.html
- **Size:** 3KB
- **Links:** 4
  - `dhl-unified.css`
  - `/dashboard`
  - `/login`
  - `/dashboard`

### validate-checklist.html
- **Size:** 37KB
- **Links:** 4
  - `/app/index.html`
  - `/login-page`
  - `/dashboard`
  - `/dashboard`

