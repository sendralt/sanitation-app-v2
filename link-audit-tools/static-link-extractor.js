const fs = require('fs');
const path = require('path');

/**
 * Static Link Extractor for Sanitation App
 * Analyzes EJS templates, route files, and JavaScript for links
 */

const BASE_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(__dirname, 'link-audit-results', 'static-links-analysis.json');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Extract links from EJS templates
 */
function extractLinksFromEJS(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const links = [];
  
  // Patterns to match different types of links
  const patterns = [
    // href attributes
    /href\s*=\s*["']([^"']+)["']/gi,
    // action attributes
    /action\s*=\s*["']([^"']+)["']/gi,
    // JavaScript window.location
    /window\.location\s*=\s*["']([^"']+)["']/gi,
    /location\.href\s*=\s*["']([^"']+)["']/gi,
    // onclick navigation
    /onclick\s*=\s*["'][^"']*location[^"']*["']/gi
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (match[1] && !match[1].startsWith('javascript:') && !match[1].startsWith('#')) {
        links.push({
          url: match[1],
          type: 'href',
          context: getLineContext(content, match.index),
          line: getLineNumber(content, match.index)
        });
      }
    }
  });
  
  return links;
}

/**
 * Extract routes from Express router files
 */
function extractRoutesFromJS(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const routes = [];
  
  // Patterns for Express routes
  const routePatterns = [
    /router\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/gi,
    /app\.(get|post|put|delete|patch)\s*\(\s*["']([^"']+)["']/gi,
    /app\.use\s*\(\s*["']([^"']+)["']/gi
  ];
  
  routePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const method = match[1] || 'USE';
      const route = match[2] || match[1];
      
      routes.push({
        method: method.toUpperCase(),
        route: route,
        file: path.relative(BASE_DIR, filePath),
        line: getLineNumber(content, match.index),
        context: getLineContext(content, match.index)
      });
    }
  });
  
  return routes;
}

/**
 * Extract frontend JavaScript navigation
 */
function extractJSNavigation(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const navigation = [];
  
  // Patterns for JavaScript navigation
  const navPatterns = [
    /window\.location\s*=\s*["']([^"']+)["']/gi,
    /location\.href\s*=\s*["']([^"']+)["']/gi,
    /window\.open\s*\(\s*["']([^"']+)["']/gi,
    /fetch\s*\(\s*["']([^"']+)["']/gi,
    /axios\.(get|post|put|delete)\s*\(\s*["']([^"']+)["']/gi
  ];
  
  navPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const url = match[1] || match[2];
      if (url && !url.startsWith('javascript:')) {
        navigation.push({
          url: url,
          type: 'javascript',
          method: match[1] ? match[1].toUpperCase() : 'GET',
          file: path.relative(BASE_DIR, filePath),
          line: getLineNumber(content, match.index),
          context: getLineContext(content, match.index)
        });
      }
    }
  });
  
  return navigation;
}

/**
 * Get line number for a given index in content
 */
function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

/**
 * Get context around a match
 */
function getLineContext(content, index) {
  const lines = content.split('\n');
  const lineNum = getLineNumber(content, index) - 1;
  const start = Math.max(0, lineNum - 1);
  const end = Math.min(lines.length, lineNum + 2);
  
  return lines.slice(start, end).join('\n');
}

/**
 * Recursively find files with specific extensions
 */
function findFiles(dir, extensions) {
  const files = [];
  
  function traverse(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  traverse(dir);
  return files;
}

/**
 * Analyze static checklist files
 */
function analyzeStaticChecklists() {
  const publicDir = path.join(BASE_DIR, 'Public');
  const checklists = [];
  
  if (fs.existsSync(publicDir)) {
    const htmlFiles = findFiles(publicDir, ['.html']);
    
    htmlFiles.forEach(file => {
      const relativePath = path.relative(publicDir, file);
      const content = fs.readFileSync(file, 'utf8');
      
      // Extract form actions and links from checklist files
      const links = extractLinksFromEJS(file);
      
      checklists.push({
        file: relativePath,
        fullPath: file,
        links: links,
        size: fs.statSync(file).size,
        lastModified: fs.statSync(file).mtime
      });
    });
  }
  
  return checklists;
}

/**
 * Main analysis function
 */
function analyzeStaticLinks() {
  console.log('🔍 Starting static link analysis...');
  
  const analysis = {
    timestamp: new Date().toISOString(),
    summary: {
      ejsTemplates: 0,
      routeFiles: 0,
      jsFiles: 0,
      staticChecklists: 0,
      totalLinks: 0,
      totalRoutes: 0
    },
    ejsTemplates: [],
    routes: [],
    jsNavigation: [],
    staticChecklists: []
  };
  
  // Analyze EJS templates
  console.log('📄 Analyzing EJS templates...');
  const ejsFiles = [
    ...findFiles(path.join(BASE_DIR, 'dhl_login', 'views'), ['.ejs'])
  ];
  
  ejsFiles.forEach(file => {
    const links = extractLinksFromEJS(file);
    analysis.ejsTemplates.push({
      file: path.relative(BASE_DIR, file),
      fullPath: file,
      links: links,
      linkCount: links.length
    });
    analysis.summary.totalLinks += links.length;
  });
  analysis.summary.ejsTemplates = ejsFiles.length;
  
  // Analyze route files
  console.log('🛣️  Analyzing route files...');
  const routeFiles = [
    ...findFiles(path.join(BASE_DIR, 'dhl_login', 'routes'), ['.js']),
    ...findFiles(path.join(BASE_DIR, 'backend', 'routes'), ['.js']),
    path.join(BASE_DIR, 'dhl_login', 'app.js'),
    path.join(BASE_DIR, 'backend', 'server.js')
  ].filter(file => fs.existsSync(file));
  
  routeFiles.forEach(file => {
    const routes = extractRoutesFromJS(file);
    analysis.routes.push({
      file: path.relative(BASE_DIR, file),
      fullPath: file,
      routes: routes,
      routeCount: routes.length
    });
    analysis.summary.totalRoutes += routes.length;
  });
  analysis.summary.routeFiles = routeFiles.length;
  
  // Analyze JavaScript files
  console.log('📜 Analyzing JavaScript navigation...');
  const jsFiles = [
    ...findFiles(path.join(BASE_DIR, 'Public'), ['.js']),
    ...findFiles(path.join(BASE_DIR, 'dhl_login', 'public'), ['.js'])
  ];
  
  jsFiles.forEach(file => {
    const navigation = extractJSNavigation(file);
    analysis.jsNavigation.push({
      file: path.relative(BASE_DIR, file),
      fullPath: file,
      navigation: navigation,
      navCount: navigation.length
    });
    analysis.summary.totalLinks += navigation.length;
  });
  analysis.summary.jsFiles = jsFiles.length;
  
  // Analyze static checklist files
  console.log('📋 Analyzing static checklist files...');
  analysis.staticChecklists = analyzeStaticChecklists();
  analysis.summary.staticChecklists = analysis.staticChecklists.length;
  
  // Calculate totals
  analysis.staticChecklists.forEach(checklist => {
    analysis.summary.totalLinks += checklist.links.length;
  });
  
  // Write results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(analysis, null, 2));
  
  // Display summary
  console.log('\n📊 STATIC ANALYSIS SUMMARY');
  console.log('==========================');
  console.log(`EJS Templates: ${analysis.summary.ejsTemplates}`);
  console.log(`Route Files: ${analysis.summary.routeFiles}`);
  console.log(`JavaScript Files: ${analysis.summary.jsFiles}`);
  console.log(`Static Checklists: ${analysis.summary.staticChecklists}`);
  console.log(`Total Links Found: ${analysis.summary.totalLinks}`);
  console.log(`Total Routes Found: ${analysis.summary.totalRoutes}`);
  console.log(`\n📄 Results saved to: ${OUTPUT_FILE}`);
  
  return analysis;
}

/**
 * Generate a summary report
 */
function generateSummaryReport(analysis) {
  const reportFile = path.join(__dirname, 'link-audit-results', 'static-analysis-summary.md');
  
  let report = `# Static Link Analysis Summary\n\n`;
  report += `**Generated:** ${analysis.timestamp}\n\n`;
  
  report += `## Overview\n\n`;
  report += `- **EJS Templates:** ${analysis.summary.ejsTemplates}\n`;
  report += `- **Route Files:** ${analysis.summary.routeFiles}\n`;
  report += `- **JavaScript Files:** ${analysis.summary.jsFiles}\n`;
  report += `- **Static Checklists:** ${analysis.summary.staticChecklists}\n`;
  report += `- **Total Links:** ${analysis.summary.totalLinks}\n`;
  report += `- **Total Routes:** ${analysis.summary.totalRoutes}\n\n`;
  
  report += `## EJS Templates\n\n`;
  analysis.ejsTemplates.forEach(template => {
    report += `### ${template.file}\n`;
    report += `- **Links found:** ${template.linkCount}\n`;
    if (template.links.length > 0) {
      template.links.forEach(link => {
        report += `  - \`${link.url}\` (line ${link.line})\n`;
      });
    }
    report += `\n`;
  });
  
  report += `## Routes\n\n`;
  analysis.routes.forEach(routeFile => {
    if (routeFile.routeCount > 0) {
      report += `### ${routeFile.file}\n`;
      routeFile.routes.forEach(route => {
        report += `- **${route.method}** \`${route.route}\` (line ${route.line})\n`;
      });
      report += `\n`;
    }
  });
  
  report += `## Static Checklists\n\n`;
  analysis.staticChecklists.forEach(checklist => {
    report += `### ${checklist.file}\n`;
    report += `- **Size:** ${Math.round(checklist.size / 1024)}KB\n`;
    report += `- **Links:** ${checklist.links.length}\n`;
    if (checklist.links.length > 0) {
      checklist.links.forEach(link => {
        report += `  - \`${link.url}\`\n`;
      });
    }
    report += `\n`;
  });
  
  fs.writeFileSync(reportFile, report);
  console.log(`📋 Summary report saved to: ${reportFile}`);
}

// Run if called directly
if (require.main === module) {
  const analysis = analyzeStaticLinks();
  generateSummaryReport(analysis);
}

module.exports = {
  analyzeStaticLinks,
  extractLinksFromEJS,
  extractRoutesFromJS,
  extractJSNavigation
};
