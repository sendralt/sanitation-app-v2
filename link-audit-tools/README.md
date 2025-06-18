# Link Audit Tools for Sanitation Checklist Application

## Overview
This directory contains automated tools for auditing and monitoring link health across all dashboards and user roles in the Sanitation Checklist Application.

## Tools Included

### 1. Link Checker (`link-checker.js`)
Automated Puppeteer-based tool that:
- Authenticates as different user roles (admin, manager, user, compliance)
- Crawls all dashboard pages for each role
- Tests every link, form, and navigation element
- Records response codes, errors, and performance metrics
- Generates comprehensive CSV reports

### 2. Status Dashboard (`status-dashboard.js`)
Web-based monitoring dashboard that:
- Displays real-time link audit results
- Shows statistics by role and dashboard
- Allows manual audit execution
- Provides filtering and search capabilities
- Runs on port 3002

### 3. Dashboard Inventory (`dashboard-inventory.md`)
Comprehensive documentation of:
- All dashboard routes and views
- User roles and permissions
- API endpoints and authentication flow
- Known issues and testing credentials

## Installation

1. **Install Dependencies**
   ```bash
   cd link-audit-tools
   npm install
   ```

2. **Ensure Main Application is Running**
   - Start the dhl_login service on port 3000
   - Start the backend service on port 3001
   - Verify test users exist in the database

## Usage

### Running the Link Audit

**Command Line:**
```bash
npm run audit
```

**Programmatic:**
```javascript
const { main } = require('./link-checker');
main().then(() => console.log('Audit complete'));
```

### Starting the Status Dashboard

```bash
npm run dashboard
```

Then open http://localhost:3002 in your browser.

### Output Files

The link checker generates:
- `link-audit-results/link-audit-results.csv` - Detailed results
- `link-audit-results/audit-summary.json` - Summary statistics

## CSV Report Format

| Column | Description |
|--------|-------------|
| Role | User role (admin, manager, user, compliance) |
| Dashboard | Dashboard URL being tested |
| Section | Section within dashboard (e.g., "Admin Panel") |
| Link Text | Visible text of the link |
| Target Endpoint | URL the link points to |
| HTTP Method | GET, POST, etc. |
| Element Type | a, button, form |
| Current Status | Working, Broken, Error |
| Response Code | HTTP status code |
| Response Time (ms) | Time to load |
| Error Description | Details of any errors |
| Timestamp | When the test was performed |

## Test Credentials

The link checker uses these credentials:
- **Admin**: `admin` / `admin123`
- **Manager**: `manager` / `manager123`
- **User**: `user` / `user123`
- **Compliance**: `compliance` / `Compliance123!`

## Dashboard Coverage

### User Dashboard (`/checklists/`)
- All checklist links (daily, weekly, quarterly)
- User-specific functionality
- Role-based conditional sections

### Admin Dashboard (`/admin`)
- User management links
- PostgreSQL dashboard access
- Automation rules management
- System monitoring tools

### Manager Dashboard (`/manager`)
- Team management interface
- Performance analytics
- Assignment management
- Direct reports overview

### Compliance Dashboard (`/compliance`)
- Compliance metrics
- Audit trail access
- Non-compliance tracking
- Regulatory reporting

## API Endpoints Tested

### Authentication
- `/api/auth/login-api`
- `/api/auth/token`
- `/api/auth/users`

### Backend Services
- `/api/compliance/*`
- `/api/admin/*`
- Health check endpoints

### Static Assets
- `/app/*` (checklist files)
- CSS and JavaScript resources

## Configuration

### Environment Variables
- `BASE_URL` - Application base URL (default: http://localhost:3000)
- `HEADLESS` - Run browser in headless mode (default: true)
- `TIMEOUT` - Page load timeout in ms (default: 10000)

### Customizing Credentials
Edit the `CREDENTIALS` object in `link-checker.js`:
```javascript
const CREDENTIALS = {
  admin: { username: 'admin', password: 'admin123' },
  // ... other roles
};
```

## Troubleshooting

### Common Issues

1. **Login Failures**
   - Verify test users exist in database
   - Check credentials match seeded users
   - Ensure application is running on correct port

2. **Timeout Errors**
   - Increase timeout values for slow responses
   - Check network connectivity
   - Verify services are responsive

3. **Permission Errors**
   - Verify user roles are correctly assigned
   - Check authentication middleware
   - Validate session management

### Debug Mode
Run with additional logging:
```bash
DEBUG=true node link-checker.js
```

## Integration with CI/CD

### GitHub Actions Example
```yaml
- name: Run Link Audit
  run: |
    cd link-audit-tools
    npm install
    npm run audit
    
- name: Upload Results
  uses: actions/upload-artifact@v2
  with:
    name: link-audit-results
    path: link-audit-tools/link-audit-results/
```

### Automated Monitoring
Set up cron job for regular audits:
```bash
# Run link audit daily at 2 AM
0 2 * * * cd /path/to/link-audit-tools && npm run audit
```

## Extending the Tools

### Adding New Dashboards
1. Update `getDashboardUrls()` function
2. Add role-specific routes
3. Update dashboard inventory documentation

### Custom Link Testing
Extend the `testLink()` function for:
- Form submission testing
- JavaScript-heavy interactions
- File download verification
- API response validation

### Additional Metrics
Modify `collectLinks()` to capture:
- Accessibility information
- Performance metrics
- SEO data
- Security headers

## Support

For issues or questions:
1. Check the dashboard inventory for route documentation
2. Review the CSV output for specific error details
3. Use the status dashboard for real-time monitoring
4. Examine browser console logs for JavaScript errors

## License
MIT License - See main application license for details.
