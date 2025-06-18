# Comprehensive Link Audit Plan for Sanitation Checklist Application

## 1. Dashboard Identification Approach

Based on the codebase structure, I'll identify all dashboard interfaces:

1. **User Dashboard**
   - Primary location: `dhl_login/views/dashboard.ejs`
   - Access route: `/checklists/` (via `dhl_login/routes/checklist.js`)
   - User role: `user`

2. **Manager Dashboard**
   - Likely location: `dhl_login/views/admin/dashboard.ejs` 
   - Access route: Likely under `/admin/` routes
   - User role: `manager`

3. **Admin Dashboard**
   - Location: `dhl_login/views/admin/dashboard.ejs`
   - Access routes: Various admin routes in `dhl_login/routes/admin.js`
   - User role: `admin`

4. **Compliance Officer Dashboard**
   - Added in Phase 4 (per `docs/phase4_implementation_summary.md`)
   - User role: `compliance`

5. **Automation Rules Dashboard**
   - Location: `dhl_login/views/admin/automation-rules.ejs`
   - Access route: Likely under `/admin/automation/` routes

## 2. Link Extraction Methodology

1. **Static Analysis**
   - Parse all EJS templates for `<a href>`, `<form action>`, and JavaScript-based navigation
   - Extract frontend JavaScript navigation code from `Public/scripts.js`
   - Review route definitions in Express routers (`dhl_login/routes/*.js`)

2. **Dynamic Analysis**
   - Use authenticated browser sessions for each role
   - Capture all clickable elements using browser developer tools
   - Record all API calls made during dashboard interactions

3. **API Endpoint Collection**
   - Extract all API routes from `backend/server.js`
   - Document JWT-protected endpoints
   - Map frontend calls to backend endpoints

## 3. Testing Procedure

### For Each Dashboard:

1. **Authentication Testing**
   - Login with appropriate role credentials
   - Verify JWT token acquisition
   - Test session persistence

2. **Link Functionality Testing**
   - **For each link:**
     - Record HTTP method (GET, POST)
     - Capture request headers and body
     - Record response status code
     - Verify content type of response
     - Measure response time
     - Validate expected content/redirect

3. **Cross-Role Permission Testing**
   - Attempt to access each link with different user roles
   - Verify proper authorization controls

4. **Edge Case Testing**
   - Test with expired JWT tokens
   - Test with invalid parameters
   - Test concurrent access scenarios

## 4. Prioritized Task List Template

Create a CSV file with the following columns:

```
Dashboard,Section,Link Text,Target Endpoint,HTTP Method,Current Status,Response Code,Error Description,Expected Behavior,Proposed Fix,Effort (hours),Priority,Assigned To,Fixed Date
```

Example entries:
```
Admin,Automation Rules,Create Rule,/admin/automation/create,GET,Broken,404,Route not found,Should load rule creation form,Add missing route in admin.js,1,High,,
User,Active Checklists,Warehouse Daily,/app/warehouse-daily.html,GET,Working,200,N/A,Loads checklist form,N/A,0,N/A,,
```

## 5. Recommended Tools & Automation

1. **Automated Link Checking**
   - **Crawler Script**: Create a Node.js script using Puppeteer to:
     - Authenticate as different user roles
     - Crawl all dashboard pages
     - Test all links and record results

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const CREDENTIALS = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager', password: 'manager123' },
  user: { username: 'user', password: 'user123' }
};
const OUTPUT_FILE = 'link-audit-results.csv';

async function checkLinks(role) {
  console.log(`Starting link check for role: ${role}`);
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Login
  await page.goto(`${BASE_URL}/login-page`);
  await page.type('input[name="username"]', CREDENTIALS[role].username);
  await page.type('input[name="password"]', CREDENTIALS[role].password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  // Get all dashboard links
  const links = await collectLinks(page, role);
  
  // Test each link
  const results = [];
  for (const link of links) {
    try {
      const result = await testLink(page, link);
      results.push({ role, ...link, ...result });
    } catch (error) {
      results.push({ 
        role, 
        ...link, 
        status: 'Error', 
        responseCode: 'N/A', 
        errorDescription: error.message 
      });
    }
  }
  
  await browser.close();
  return results;
}

// Main execution
async function main() {
  let allResults = [];
  for (const role of Object.keys(CREDENTIALS)) {
    const results = await checkLinks(role);
    allResults = [...allResults, ...results];
  }
  
  // Write results to CSV
  const csv = convertToCSV(allResults);
  fs.writeFileSync(OUTPUT_FILE, csv);
  console.log(`Results written to ${OUTPUT_FILE}`);
}

main().catch(console.error);
```

2. **API Testing Tools**
   - **Postman/Newman**: Create collections for all API endpoints
   - **Jest/Supertest**: Write automated API tests

3. **Visual Regression Testing**
   - Use Percy or Applitools to detect UI changes when fixing links

## 6. Progress Tracking Mechanism

1. **GitHub Issue Tracking**
   - Create a dedicated project board
   - Use labels for priority and dashboard categories
   - Track progress with milestones

2. **Automated Status Dashboard**
   - Create a simple Express app that:
     - Runs the link checker periodically
     - Displays current link status by dashboard
     - Shows progress metrics and trends

```javascript
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const app = express();

// Serve static dashboard
app.use(express.static('public'));

// API endpoint to get latest results
app.get('/api/link-status', (req, res) => {
  const resultsPath = path.join(__dirname, 'link-audit-results.csv');
  if (fs.existsSync(resultsPath)) {
    const csv = fs.readFileSync(resultsPath, 'utf8');
    const results = parseCSV(csv);
    
    // Calculate statistics
    const stats = {
      total: results.length,
      working: results.filter(r => r.status === 'Working').length,
      broken: results.filter(r => r.status === 'Broken').length,
      byDashboard: {}
    };
    
    // Group by dashboard
    results.forEach(result => {
      if (!stats.byDashboard[result.dashboard]) {
        stats.byDashboard[result.dashboard] = { total: 0, working: 0, broken: 0 };
      }
      stats.byDashboard[result.dashboard].total++;
      if (result.status === 'Working') {
        stats.byDashboard[result.dashboard].working++;
      } else {
        stats.byDashboard[result.dashboard].broken++;
      }
    });
    
    res.json({ results, stats });
  } else {
    res.status(404).json({ error: 'No results found' });
  }
});

// Run link checker
app.post('/api/run-check', (req, res) => {
  exec('node link-checker.js', (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.json({ message: 'Link check completed', output: stdout });
  });
});

app.listen(3002, () => {
  console.log('Link status dashboard running on http://localhost:3002');
});
```

## 7. Application-Specific Considerations

1. **Microservice Architecture**
   - Test links between `dhl_login` (port 3000) and `backend` (port 3001/3445)
   - Verify Nginx routing for production environment

2. **Authentication Flow**
   - Ensure JWT tokens are properly passed between services
   - Test links that require different authentication levels

3. **Checklist-Specific Links**
   - Pay special attention to dynamic checklist links in `/app/` routes
   - Test supervisor validation links sent via email

4. **PostgreSQL Integration**
   - For Phase 1+ implementations, verify links to new PostgreSQL-backed features
   - Test automation rule links that interact with the database

5. **File Structure Awareness**
   - Links to static assets in `Public/` directory
   - Links to dynamically generated content from `backend/data/`

6. **Role-Based Access**
   - Test with all roles defined in `initialize-database.js`
   - Verify compliance officer role access added in Phase 4

## Implementation Timeline

1. **Week 1: Setup & Discovery**
   - Identify all dashboards and create inventory
   - Develop automated link checking tools
   - Create tracking dashboard

2. **Week 2: Testing & Documentation**
   - Run comprehensive tests across all roles
   - Document all links and their status
   - Prioritize issues based on impact

3. **Week 3: Fixes & Verification**
   - Implement fixes for broken links
   - Verify fixes with automated tests
   - Update documentation

4. **Week 4: Final Review & Monitoring**
   - Conduct final manual verification
   - Set up ongoing monitoring
   - Document process for future maintenance