/**
 * Comprehensive link checker for the Sanitation App
 * This script will test all links across all dashboards for all user roles
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000';
const OUTPUT_FILE = path.join(__dirname, 'link-audit-results.json');
const CREDENTIALS = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager', password: 'manager123' },
  user: { username: 'user', password: 'user123' },
  compliance: { username: 'compliance', password: 'Compliance123!' }
};

// Main function to run the link audit
async function runLinkAudit() {
  console.log('🚀 Starting comprehensive link audit...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null
  });
  
  const allResults = [];
  
  // Test each role
  for (const role of Object.keys(CREDENTIALS)) {
    console.log(`\n🔍 Testing links for role: ${role.toUpperCase()}`);
    const results = await testRoleLinks(browser, role);
    allResults.push(...results);
  }
  
  // Save results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2));
  console.log(`\n✅ Link audit completed. Results saved to ${OUTPUT_FILE}`);
  
  await browser.close();
  return allResults;
}

// Test all links for a specific role
async function testRoleLinks(browser, role) {
  const results = [];
  const page = await browser.newPage();
  
  try {
    // Login
    console.log(`[${role}] Logging in...`);
    await page.goto(`${BASE_URL}/login-page`);
    await page.waitForSelector('form');
    
    await page.type('input[name="username"]', CREDENTIALS[role].username);
    await page.type('input[name="password"]', CREDENTIALS[role].password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('.dashboard-container', { timeout: 10000 });
    console.log(`[${role}] Login successful`);
    
    // Get all dashboard cards
    const cards = await page.$$('.card');
    console.log(`[${role}] Found ${cards.length} dashboard cards`);
    
    // Test each card's links
    for (let i = 0; i < cards.length; i++) {
      const cardTitle = await page.evaluate(card => {
        const header = card.querySelector('.card-header');
        return header ? header.textContent.trim() : 'Unknown Card';
      }, cards[i]);
      
      console.log(`[${role}] Testing card: ${cardTitle}`);
      
      // Get all links in this card
      const links = await page.evaluate(card => {
        const anchors = card.querySelectorAll('a.btn');
        return Array.from(anchors).map(a => ({
          text: a.textContent.trim(),
          href: a.getAttribute('href')
        }));
      }, cards[i]);
      
      console.log(`[${role}] Found ${links.length} links in card: ${cardTitle}`);
      
      // Test each link
      for (const link of links) {
        console.log(`[${role}] Testing link: ${link.text} (${link.href})`);
        
        const result = {
          role,
          cardTitle,
          linkText: link.text,
          linkHref: link.href,
          status: 'Unknown',
          error: null
        };
        
        try {
          // Click the link
          const newPage = await browser.newPage();
          await newPage.goto(`${BASE_URL}${link.href}`);
          
          // Wait for page to load
          await newPage.waitForSelector('body', { timeout: 5000 });
          
          // Check if there's an error message
          const hasError = await newPage.evaluate(() => {
            const errorElements = document.querySelectorAll('.alert-danger, .error-message');
            return errorElements.length > 0;
          });
          
          if (hasError) {
            const errorText = await newPage.evaluate(() => {
              const errorElement = document.querySelector('.alert-danger, .error-message');
              return errorElement ? errorElement.textContent.trim() : 'Unknown error';
            });
            
            result.status = 'Error';
            result.error = errorText;
            console.log(`[${role}] ❌ Link error: ${errorText}`);
          } else {
            result.status = 'Success';
            console.log(`[${role}] ✅ Link working`);
          }
          
          await newPage.close();
        } catch (error) {
          result.status = 'Failed';
          result.error = error.message;
          console.log(`[${role}] ❌ Link failed: ${error.message}`);
        }
        
        results.push(result);
      }
    }
    
  } catch (error) {
    console.error(`[${role}] Error during testing: ${error.message}`);
    results.push({
      role,
      cardTitle: 'General Error',
      linkText: 'N/A',
      linkHref: 'N/A',
      status: 'Fatal Error',
      error: error.message
    });
  } finally {
    await page.close();
  }
  
  return results;
}

// Run the audit
if (require.main === module) {
  runLinkAudit().catch(console.error);
}

module.exports = { runLinkAudit };

