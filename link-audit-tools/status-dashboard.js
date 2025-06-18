const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3002;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Paths
const RESULTS_DIR = 'link-audit-results';
const RESULTS_FILE = path.join(RESULTS_DIR, 'link-audit-results.csv');
const SUMMARY_FILE = path.join(RESULTS_DIR, 'audit-summary.json');

/**
 * Parse CSV file to JSON
 */
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = lines[i].split(',');
      const result = {};
      headers.forEach((header, index) => {
        result[header.trim()] = values[index] ? values[index].replace(/"/g, '').trim() : '';
      });
      results.push(result);
    }
  }
  
  return results;
}

/**
 * Get latest audit results
 */
app.get('/api/link-status', (req, res) => {
  try {
    // Check if results exist
    if (!fs.existsSync(RESULTS_FILE)) {
      return res.status(404).json({ 
        error: 'No audit results found. Run the link checker first.',
        hasResults: false
      });
    }
    
    // Read CSV results
    const csvContent = fs.readFileSync(RESULTS_FILE, 'utf8');
    const results = parseCSV(csvContent);
    
    // Read summary if available
    let summary = null;
    if (fs.existsSync(SUMMARY_FILE)) {
      summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
    } else {
      // Calculate summary from results
      summary = calculateSummary(results);
    }
    
    // Get file modification time
    const stats = fs.statSync(RESULTS_FILE);
    const lastRun = stats.mtime.toISOString();
    
    res.json({ 
      results, 
      summary, 
      lastRun,
      hasResults: true,
      totalResults: results.length
    });
    
  } catch (error) {
    console.error('Error reading audit results:', error);
    res.status(500).json({ 
      error: 'Failed to read audit results: ' + error.message,
      hasResults: false
    });
  }
});

/**
 * Calculate summary statistics from results
 */
function calculateSummary(results) {
  const summary = {
    total: results.length,
    working: results.filter(r => r['Current Status'] === 'Working').length,
    broken: results.filter(r => r['Current Status'] === 'Broken').length,
    errors: results.filter(r => r['Current Status'] === 'Error').length,
    byRole: {},
    byDashboard: {}
  };
  
  // Group by role
  const roles = [...new Set(results.map(r => r.Role))];
  roles.forEach(role => {
    const roleResults = results.filter(r => r.Role === role);
    summary.byRole[role] = {
      total: roleResults.length,
      working: roleResults.filter(r => r['Current Status'] === 'Working').length,
      broken: roleResults.filter(r => r['Current Status'] === 'Broken').length,
      errors: roleResults.filter(r => r['Current Status'] === 'Error').length
    };
  });
  
  // Group by dashboard
  const dashboards = [...new Set(results.map(r => r.Dashboard))];
  dashboards.forEach(dashboard => {
    const dashboardResults = results.filter(r => r.Dashboard === dashboard);
    summary.byDashboard[dashboard] = {
      total: dashboardResults.length,
      working: dashboardResults.filter(r => r['Current Status'] === 'Working').length,
      broken: dashboardResults.filter(r => r['Current Status'] === 'Broken').length,
      errors: dashboardResults.filter(r => r['Current Status'] === 'Error').length
    };
  });
  
  return summary;
}

/**
 * Run link checker
 */
app.post('/api/run-check', (req, res) => {
  console.log('Starting link audit...');
  
  exec('node link-checker.js', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error('Link checker error:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message,
        output: stdout,
        stderr: stderr
      });
    }
    
    console.log('Link audit completed successfully');
    res.json({ 
      success: true,
      message: 'Link audit completed successfully',
      output: stdout
    });
  });
});

/**
 * Get broken links only
 */
app.get('/api/broken-links', (req, res) => {
  try {
    if (!fs.existsSync(RESULTS_FILE)) {
      return res.status(404).json({ error: 'No audit results found' });
    }
    
    const csvContent = fs.readFileSync(RESULTS_FILE, 'utf8');
    const results = parseCSV(csvContent);
    
    const brokenLinks = results.filter(r => 
      r['Current Status'] === 'Broken' || r['Current Status'] === 'Error'
    );
    
    res.json({ 
      brokenLinks,
      count: brokenLinks.length
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get links by role
 */
app.get('/api/links-by-role/:role', (req, res) => {
  try {
    const { role } = req.params;
    
    if (!fs.existsSync(RESULTS_FILE)) {
      return res.status(404).json({ error: 'No audit results found' });
    }
    
    const csvContent = fs.readFileSync(RESULTS_FILE, 'utf8');
    const results = parseCSV(csvContent);
    
    const roleLinks = results.filter(r => r.Role === role);
    
    res.json({ 
      role,
      links: roleLinks,
      count: roleLinks.length
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Serve the dashboard HTML
 */
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link Audit Status Dashboard</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: #d40511;
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #d40511;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        .controls {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .btn {
            background: #d40511;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
        }
        .btn:hover {
            background: #b8040f;
        }
        .btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .results-table {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
        }
        .status-working { color: #28a745; }
        .status-broken { color: #dc3545; }
        .status-error { color: #fd7e14; }
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔗 Link Audit Status Dashboard</h1>
            <p>Monitor and track link health across all sanitation app dashboards</p>
        </div>

        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <div class="stat-number" id="totalLinks">--</div>
                <div class="stat-label">Total Links</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="workingLinks">--</div>
                <div class="stat-label">Working Links</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="brokenLinks">--</div>
                <div class="stat-label">Broken Links</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="errorLinks">--</div>
                <div class="stat-label">Error Links</div>
            </div>
        </div>

        <div class="controls">
            <button class="btn" onclick="runAudit()" id="runBtn">🚀 Run Link Audit</button>
            <button class="btn" onclick="refreshData()" id="refreshBtn">🔄 Refresh Data</button>
            <button class="btn" onclick="showBrokenOnly()" id="brokenBtn">❌ Show Broken Only</button>
            <button class="btn" onclick="showAll()" id="allBtn">📋 Show All</button>
            <span id="lastRun" style="margin-left: 20px; color: #666;"></span>
        </div>

        <div id="messageArea"></div>

        <div class="results-table">
            <div id="loadingArea" class="loading">
                Loading audit results...
            </div>
            <table id="resultsTable" style="display: none;">
                <thead>
                    <tr>
                        <th>Role</th>
                        <th>Dashboard</th>
                        <th>Section</th>
                        <th>Link Text</th>
                        <th>Target</th>
                        <th>Status</th>
                        <th>Response</th>
                        <th>Error</th>
                    </tr>
                </thead>
                <tbody id="resultsBody">
                </tbody>
            </table>
        </div>
    </div>

    <script>
        let currentData = null;
        let showingBrokenOnly = false;

        async function loadData() {
            try {
                const response = await fetch('/api/link-status');
                const data = await response.json();
                
                if (data.hasResults) {
                    currentData = data;
                    updateStats(data.summary);
                    updateTable(data.results);
                    updateLastRun(data.lastRun);
                    document.getElementById('loadingArea').style.display = 'none';
                    document.getElementById('resultsTable').style.display = 'table';
                } else {
                    document.getElementById('loadingArea').innerHTML = 
                        '<p>No audit results found. Click "Run Link Audit" to start.</p>';
                }
            } catch (error) {
                console.error('Error loading data:', error);
                document.getElementById('loadingArea').innerHTML = 
                    '<p class="error">Error loading data: ' + error.message + '</p>';
            }
        }

        function updateStats(summary) {
            document.getElementById('totalLinks').textContent = summary.total;
            document.getElementById('workingLinks').textContent = summary.working;
            document.getElementById('brokenLinks').textContent = summary.broken;
            document.getElementById('errorLinks').textContent = summary.errors;
        }

        function updateTable(results) {
            const tbody = document.getElementById('resultsBody');
            tbody.innerHTML = '';
            
            const filteredResults = showingBrokenOnly ? 
                results.filter(r => r['Current Status'] === 'Broken' || r['Current Status'] === 'Error') :
                results;
            
            filteredResults.forEach(result => {
                const row = document.createElement('tr');
                const statusClass = 'status-' + (result['Current Status'] || '').toLowerCase();
                
                row.innerHTML = \`
                    <td>\${result.Role || ''}</td>
                    <td>\${result.Dashboard || ''}</td>
                    <td>\${result.Section || ''}</td>
                    <td>\${result['Link Text'] || ''}</td>
                    <td><a href="\${result['Target Endpoint']}" target="_blank">\${result['Target Endpoint'] || ''}</a></td>
                    <td class="\${statusClass}">\${result['Current Status'] || ''}</td>
                    <td>\${result['Response Code'] || ''}</td>
                    <td>\${result['Error Description'] || ''}</td>
                \`;
                tbody.appendChild(row);
            });
        }

        function updateLastRun(timestamp) {
            if (timestamp) {
                const date = new Date(timestamp);
                document.getElementById('lastRun').textContent = 
                    'Last run: ' + date.toLocaleString();
            }
        }

        async function runAudit() {
            const btn = document.getElementById('runBtn');
            const messageArea = document.getElementById('messageArea');
            
            btn.disabled = true;
            btn.textContent = '⏳ Running Audit...';
            
            messageArea.innerHTML = '<div class="loading">Running link audit... This may take a few minutes.</div>';
            
            try {
                const response = await fetch('/api/run-check', { method: 'POST' });
                const result = await response.json();
                
                if (result.success) {
                    messageArea.innerHTML = '<div class="success">✅ Audit completed successfully!</div>';
                    setTimeout(() => {
                        loadData();
                        messageArea.innerHTML = '';
                    }, 2000);
                } else {
                    messageArea.innerHTML = '<div class="error">❌ Audit failed: ' + result.error + '</div>';
                }
            } catch (error) {
                messageArea.innerHTML = '<div class="error">❌ Error running audit: ' + error.message + '</div>';
            } finally {
                btn.disabled = false;
                btn.textContent = '🚀 Run Link Audit';
            }
        }

        function refreshData() {
            document.getElementById('loadingArea').style.display = 'block';
            document.getElementById('resultsTable').style.display = 'none';
            loadData();
        }

        function showBrokenOnly() {
            showingBrokenOnly = true;
            if (currentData) {
                updateTable(currentData.results);
            }
        }

        function showAll() {
            showingBrokenOnly = false;
            if (currentData) {
                updateTable(currentData.results);
            }
        }

        // Load data on page load
        loadData();
        
        // Auto-refresh every 30 seconds
        setInterval(loadData, 30000);
    </script>
</body>
</html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🔗 Link Audit Status Dashboard running on http://localhost:${PORT}`);
  console.log('📊 Use this dashboard to monitor link audit progress and results');
});

module.exports = app;
