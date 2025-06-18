const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const CREDENTIALS = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager', password: 'manager123' },
  user: { username: 'user', password: 'user123' },
  compliance: { username: 'compliance', password: 'Compliance123!' }
};

async function debugLogin(role) {
  console.log(`\n🔍 Debugging login for role: ${role.toUpperCase()}`);
  
  const browser = await puppeteer.launch({ 
    headless: false, // Run in visible mode for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    timeout: 60000
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to login page
    console.log('1. Navigating to login page...');
    await page.goto(`${BASE_URL}/login-page`, { waitUntil: 'domcontentloaded' });
    
    // Take screenshot of login page
    await page.screenshot({ path: `link-audit-results/debug-login-page-${role}.png` });
    console.log('2. Login page loaded, screenshot saved');
    
    // Check for login form elements
    const usernameField = await page.$('input[name="username"]');
    const passwordField = await page.$('input[name="password"]');
    const submitButton = await page.$('button[type="submit"]');
    const csrfField = await page.$('input[name="_csrf"]');
    
    console.log('3. Form elements found:');
    console.log(`   - Username field: ${usernameField ? 'YES' : 'NO'}`);
    console.log(`   - Password field: ${passwordField ? 'YES' : 'NO'}`);
    console.log(`   - Submit button: ${submitButton ? 'YES' : 'NO'}`);
    console.log(`   - CSRF field: ${csrfField ? 'YES' : 'NO'}`);
    
    if (!usernameField || !passwordField || !submitButton) {
      console.log('❌ Required form elements missing!');
      await browser.close();
      return;
    }
    
    // Get CSRF token
    const csrfToken = await page.$eval('input[name="_csrf"]', el => el.value).catch(() => null);
    console.log(`4. CSRF token: ${csrfToken ? 'Found' : 'Missing'}`);
    
    // Fill credentials
    console.log('5. Filling credentials...');
    await page.type('input[name="username"]', CREDENTIALS[role].username);
    await page.type('input[name="password"]', CREDENTIALS[role].password);
    
    // Verify values were entered
    const enteredUsername = await page.$eval('input[name="username"]', el => el.value);
    const enteredPassword = await page.$eval('input[name="password"]', el => el.value);
    console.log(`6. Entered values:`);
    console.log(`   - Username: '${enteredUsername}'`);
    console.log(`   - Password length: ${enteredPassword.length}`);
    
    // Take screenshot before submit
    await page.screenshot({ path: `link-audit-results/debug-before-submit-${role}.png` });
    console.log('7. Screenshot before submit saved');
    
    // Submit form
    console.log('8. Submitting form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);
    
    // Check result
    const currentUrl = page.url();
    console.log(`9. Current URL after submit: ${currentUrl}`);
    
    // Take screenshot after submit
    await page.screenshot({ path: `link-audit-results/debug-after-submit-${role}.png` });
    console.log('10. Screenshot after submit saved');
    
    // Check page content for errors
    const pageContent = await page.content();
    const hasLoginForm = pageContent.includes('name="username"');
    const hasErrorMessage = pageContent.includes('error') || pageContent.includes('Error') || pageContent.includes('Invalid');
    const hasDashboard = pageContent.includes('dashboard') || pageContent.includes('Dashboard');
    
    console.log('11. Page analysis:');
    console.log(`    - Still has login form: ${hasLoginForm ? 'YES' : 'NO'}`);
    console.log(`    - Contains error messages: ${hasErrorMessage ? 'YES' : 'NO'}`);
    console.log(`    - Contains dashboard content: ${hasDashboard ? 'YES' : 'NO'}`);
    
    // Check for specific error messages
    try {
      const errorElements = await page.$$('.alert, .error, .flash-message');
      if (errorElements.length > 0) {
        console.log('12. Error messages found:');
        for (let i = 0; i < errorElements.length; i++) {
          const errorText = await page.evaluate(el => el.textContent, errorElements[i]);
          console.log(`    - ${errorText.trim()}`);
        }
      } else {
        console.log('12. No error message elements found');
      }
    } catch (e) {
      console.log('12. Could not check for error messages');
    }
    
    // Check if user is authenticated
    try {
      const userInfo = await page.evaluate(() => {
        // Try to find user info in the page
        const userElement = document.querySelector('[data-user], .user-info, .username');
        return userElement ? userElement.textContent : null;
      });
      console.log(`13. User info on page: ${userInfo || 'Not found'}`);
    } catch (e) {
      console.log('13. Could not extract user info');
    }
    
    // Final assessment
    if (currentUrl.includes('/dashboard') && !hasLoginForm && !hasErrorMessage) {
      console.log('✅ LOGIN SUCCESSFUL!');
    } else if (currentUrl.includes('/login') || hasLoginForm) {
      console.log('❌ LOGIN FAILED - Still on login page or form present');
    } else {
      console.log('⚠️  LOGIN STATUS UNCLEAR - Need manual review');
    }
    
  } catch (error) {
    console.error(`❌ Error during login debug: ${error.message}`);
  } finally {
    console.log('14. Keeping browser open for manual inspection...');
    console.log('    Press Ctrl+C to close when done reviewing');
    
    // Keep browser open for manual inspection
    await new Promise(resolve => {
      process.on('SIGINT', () => {
        console.log('\n15. Closing browser...');
        browser.close().then(resolve);
      });
    });
  }
}

// Run debug for admin role
if (require.main === module) {
  const role = process.argv[2] || 'admin';
  debugLogin(role).catch(console.error);
}

module.exports = { debugLogin };
