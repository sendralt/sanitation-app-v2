const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const CREDENTIALS = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager', password: 'manager123' },
  user: { username: 'user', password: 'user123' },
  compliance: { username: 'compliance', password: 'Compliance123!' }
};

const OUTPUT_DIR = 'link-audit-results';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'link-audit-results.csv');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Collect all links from a page
 */
async function collectLinks(page, role) {
  console.log(`[${role}] Collecting links from current page...`);
  
  const links = await page.evaluate(() => {
    const linkElements = document.querySelectorAll('a[href], button[onclick], form[action]');
    const links = [];
    
    linkElements.forEach((element, index) => {
      let url = '';
      let method = 'GET';
      let linkText = '';
      let elementType = element.tagName.toLowerCase();
      
      if (element.tagName === 'A') {
        url = element.href;
        linkText = element.textContent.trim();
      } else if (element.tagName === 'BUTTON' && element.onclick) {
        // Extract URL from onclick if it contains navigation
        const onclickStr = element.onclick.toString();
        const urlMatch = onclickStr.match(/(?:window\.location|location\.href)\s*=\s*['"`]([^'"`]+)['"`]/);
        if (urlMatch) {
          url = urlMatch[1];
          linkText = element.textContent.trim();
        }
      } else if (element.tagName === 'FORM') {
        url = element.action;
        method = element.method.toUpperCase() || 'GET';
        linkText = `Form: ${element.querySelector('input[type="submit"], button[type="submit"]')?.value || 'Submit'}`;
      }
      
      if (url && !url.startsWith('javascript:') && !url.startsWith('mailto:') && !url.startsWith('#')) {
        // Get section context
        let section = 'Unknown';
        let parent = element.closest('.dashboard-card, .admin-section, .manager-section, .compliance-section');
        if (parent) {
          const titleElement = parent.querySelector('h3, h2, .card-title');
          if (titleElement) {
            section = titleElement.textContent.trim();
          }
        }
        
        links.push({
          url: url,
          linkText: linkText || `Element ${index}`,
          method: method,
          section: section,
          elementType: elementType
        });
      }
    });
    
    return links;
  });
  
  console.log(`[${role}] Found ${links.length} links`);
  return links;
}

/**
 * Test a single link
 */
async function testLink(page, link, role) {
  console.log(`[${role}] Testing: ${link.linkText} -> ${link.url}`);

  try {
    // Add delay to respect rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between requests

    const startTime = Date.now();

    // Handle different types of navigation
    let response;
    if (link.method === 'GET') {
      response = await page.goto(link.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    } else {
      // For POST requests, we'll just check if the URL is accessible
      response = await page.goto(link.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    }
    
    const responseTime = Date.now() - startTime;
    const statusCode = response ? response.status() : 'Unknown';
    
    // Check for error indicators in the page
    const pageContent = await page.content();
    const hasError = pageContent.includes('404') || 
                    pageContent.includes('500') || 
                    pageContent.includes('Error') ||
                    pageContent.includes('Not Found') ||
                    statusCode >= 400;
    
    const status = hasError ? 'Broken' : 'Working';
    const errorDescription = hasError ? `HTTP ${statusCode} or error content detected` : 'N/A';
    
    return {
      status: status,
      responseCode: statusCode,
      responseTime: responseTime,
      errorDescription: errorDescription,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.log(`[${role}] Error testing ${link.url}: ${error.message}`);
    return {
      status: 'Error',
      responseCode: 'N/A',
      responseTime: 'N/A',
      errorDescription: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Login with specific role credentials
 */
async function loginWithRole(page, role) {
  console.log(`[${role}] Logging in...`);

  try {
    // Set longer timeout and try multiple times
    await page.setDefaultTimeout(60000);
    await page.setDefaultNavigationTimeout(60000);

    console.log(`[${role}] Navigating to login page...`);
    await page.goto(`${BASE_URL}/login-page`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log(`[${role}] Waiting for login form...`);
    // Wait for login form with longer timeout
    await page.waitForSelector('input[name="username"]', { timeout: 30000 });

    // Check for CSRF token
    const csrfToken = await page.$eval('input[name="_csrf"]', el => el.value).catch(() => null);
    console.log(`[${role}] CSRF token found: ${csrfToken ? 'Yes' : 'No'}`);

    // Clear any existing values and fill credentials
    console.log(`[${role}] Clearing and filling credentials...`);
    await page.evaluate(() => {
      document.querySelector('input[name="username"]').value = '';
      document.querySelector('input[name="password"]').value = '';
    });

    await page.type('input[name="username"]', CREDENTIALS[role].username);
    await page.type('input[name="password"]', CREDENTIALS[role].password);

    // Verify the values were entered correctly
    const enteredUsername = await page.$eval('input[name="username"]', el => el.value);
    const enteredPassword = await page.$eval('input[name="password"]', el => el.value);
    console.log(`[${role}] Entered username: '${enteredUsername}', password length: ${enteredPassword.length}`);

    console.log(`[${role}] Submitting form...`);
    // Submit form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
      page.click('button[type="submit"]')
    ]);

    // Verify login success
    const currentUrl = page.url();
    console.log(`[${role}] Current URL after login: ${currentUrl}`);

    // Check for successful login indicators
    const pageContent = await page.content();
    const hasLoginForm = pageContent.includes('name="username"') && pageContent.includes('name="password"');
    const hasDashboardContent = pageContent.includes('dashboard') || pageContent.includes('Dashboard') ||
                               pageContent.includes('checklist') || pageContent.includes('Checklist');

    // More specific error detection - only look for actual login error messages
    const hasLoginError = pageContent.includes('Password incorrect') ||
                         pageContent.includes('Invalid credentials') ||
                         pageContent.includes('Login failed') ||
                         pageContent.includes('No user found');

    // Determine login success based on URL and content
    const loginSuccessful = (currentUrl.includes('/dashboard') || currentUrl.includes('/checklists')) &&
                           !hasLoginForm &&
                           !hasLoginError;

    if (!loginSuccessful) {
      // Try to extract specific error message
      let errorMessage = 'Login failed';
      if (hasLoginError) {
        try {
          const errorElement = await page.$('.alert-danger, .error-message, .flash-error, .alert');
          if (errorElement) {
            errorMessage = await page.evaluate(el => el.textContent, errorElement);
          }
        } catch (e) {
          // Ignore error extraction failures
        }
      } else if (hasLoginForm) {
        errorMessage = 'Still on login page';
      } else {
        errorMessage = 'Unexpected page content';
      }

      console.error(`[${role}] Login failed: ${errorMessage}`);
      console.error(`[${role}] URL: ${currentUrl}, Has login form: ${hasLoginForm}, Has login error: ${hasLoginError}`);

      // Save screenshot for debugging
      try {
        await page.screenshot({ path: `link-audit-results/login-failure-${role}.png` });
        console.log(`[${role}] Screenshot saved for debugging`);
      } catch (e) {
        // Ignore screenshot errors
      }

      throw new Error(errorMessage);
    }

    console.log(`[${role}] Login successful, redirected to: ${currentUrl}`);
    return true;

  } catch (error) {
    console.error(`[${role}] Login failed: ${error.message}`);
    return false;
  }
}

/**
 * Get dashboard URLs for each role
 */
function getDashboardUrls(role) {
  const dashboards = {
    user: ['/checklists/', '/'],
    manager: ['/checklists/', '/manager', '/manager/teams', '/manager/performance', '/manager/assignments'],
    admin: ['/checklists/', '/admin', '/admin/postgresql', '/admin/automation-rules', '/admin/users/new'],
    compliance: ['/checklists/', '/compliance', '/compliance/metrics']
  };
  
  return dashboards[role] || ['/checklists/'];
}

/**
 * Check links for a specific role
 */
async function checkLinksForRole(role) {
  console.log(`\n🔍 Starting link check for role: ${role.toUpperCase()}`);
  
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ],
    timeout: 60000
  });
  
  const page = await browser.newPage();
  const results = [];
  
  try {
    // Login
    const loginSuccess = await loginWithRole(page, role);
    if (!loginSuccess) {
      console.error(`[${role}] Skipping link check due to login failure`);
      await browser.close();
      return [];
    }
    
    // Get dashboard URLs for this role
    const dashboardUrls = getDashboardUrls(role);
    
    // Check each dashboard
    for (const dashboardUrl of dashboardUrls) {
      try {
        console.log(`[${role}] Checking dashboard: ${dashboardUrl}`);
        await page.goto(`${BASE_URL}${dashboardUrl}`, { waitUntil: 'networkidle0' });
        
        // Collect links from this dashboard
        const links = await collectLinks(page, role);
        
        // Test each link
        for (const link of links) {
          const result = await testLink(page, link, role);
          results.push({
            role: role,
            dashboard: dashboardUrl,
            section: link.section,
            linkText: link.linkText,
            targetEndpoint: link.url,
            httpMethod: link.method,
            elementType: link.elementType,
            ...result
          });
        }
        
      } catch (error) {
        console.error(`[${role}] Error checking dashboard ${dashboardUrl}: ${error.message}`);
        results.push({
          role: role,
          dashboard: dashboardUrl,
          section: 'Dashboard Access',
          linkText: 'Dashboard Load',
          targetEndpoint: dashboardUrl,
          httpMethod: 'GET',
          elementType: 'navigation',
          status: 'Error',
          responseCode: 'N/A',
          responseTime: 'N/A',
          errorDescription: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
  } catch (error) {
    console.error(`[${role}] Fatal error during link checking: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  console.log(`[${role}] Completed. Found ${results.length} total links/tests`);
  return results;
}

/**
 * Convert results to CSV format
 */
function convertToCSV(results) {
  const headers = [
    'Role', 'Dashboard', 'Section', 'Link Text', 'Target Endpoint', 'HTTP Method', 
    'Element Type', 'Current Status', 'Response Code', 'Response Time (ms)', 
    'Error Description', 'Timestamp', 'Expected Behavior', 'Proposed Fix', 
    'Effort (hours)', 'Priority', 'Assigned To', 'Fixed Date'
  ];
  
  let csv = headers.join(',') + '\n';
  
  results.forEach(result => {
    const row = [
      result.role || '',
      result.dashboard || '',
      result.section || '',
      `"${(result.linkText || '').replace(/"/g, '""')}"`,
      result.targetEndpoint || '',
      result.httpMethod || '',
      result.elementType || '',
      result.status || '',
      result.responseCode || '',
      result.responseTime || '',
      `"${(result.errorDescription || '').replace(/"/g, '""')}"`,
      result.timestamp || '',
      '', // Expected Behavior - to be filled manually
      '', // Proposed Fix - to be filled manually
      '', // Effort (hours) - to be filled manually
      '', // Priority - to be filled manually
      '', // Assigned To - to be filled manually
      ''  // Fixed Date - to be filled manually
    ];
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Comprehensive Link Audit for Sanitation App');
  console.log(`📊 Output will be saved to: ${OUTPUT_FILE}`);
  
  let allResults = [];
  
  // Test each role
  for (const role of Object.keys(CREDENTIALS)) {
    try {
      const results = await checkLinksForRole(role);
      allResults = [...allResults, ...results];
    } catch (error) {
      console.error(`Failed to check links for role ${role}: ${error.message}`);
    }
  }
  
  // Generate summary
  const summary = {
    total: allResults.length,
    working: allResults.filter(r => r.status === 'Working').length,
    broken: allResults.filter(r => r.status === 'Broken').length,
    errors: allResults.filter(r => r.status === 'Error').length,
    byRole: {}
  };
  
  Object.keys(CREDENTIALS).forEach(role => {
    const roleResults = allResults.filter(r => r.role === role);
    summary.byRole[role] = {
      total: roleResults.length,
      working: roleResults.filter(r => r.status === 'Working').length,
      broken: roleResults.filter(r => r.status === 'Broken').length,
      errors: roleResults.filter(r => r.status === 'Error').length
    };
  });
  
  // Write results to CSV
  const csv = convertToCSV(allResults);
  fs.writeFileSync(OUTPUT_FILE, csv);
  
  // Write summary to JSON
  const summaryFile = path.join(OUTPUT_DIR, 'audit-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
  
  // Display summary
  console.log('\n📋 AUDIT SUMMARY');
  console.log('================');
  console.log(`Total Links Tested: ${summary.total}`);
  console.log(`✅ Working: ${summary.working}`);
  console.log(`❌ Broken: ${summary.broken}`);
  console.log(`⚠️  Errors: ${summary.errors}`);
  console.log('\nBy Role:');
  Object.entries(summary.byRole).forEach(([role, stats]) => {
    console.log(`  ${role.toUpperCase()}: ${stats.total} total (${stats.working} working, ${stats.broken} broken, ${stats.errors} errors)`);
  });
  
  console.log(`\n📄 Detailed results saved to: ${OUTPUT_FILE}`);
  console.log(`📊 Summary saved to: ${summaryFile}`);
  
  if (summary.broken > 0 || summary.errors > 0) {
    console.log('\n⚠️  Issues found! Review the CSV file for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All links are working correctly!');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  checkLinksForRole,
  convertToCSV,
  main
};
