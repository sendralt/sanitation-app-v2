#!/usr/bin/env node

/**
 * Automated Link Monitoring System
 * Continuously monitors application health and link status
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const express = require('express');

// Configuration
const config = {
    monitoring: {
        interval: 30 * 60 * 1000, // 30 minutes
        healthCheckInterval: 5 * 60 * 1000, // 5 minutes
        alertThreshold: 0.8, // Alert if more than 80% links are broken
        retryAttempts: 3,
        retryDelay: 5000 // 5 seconds
    },
    endpoints: {
        frontend: 'http://localhost:3000',
        backend: 'http://localhost:3001',
        dashboard: 'http://localhost:3002'
    },
    notifications: {
        email: {
            enabled: false, // Set to true when email is configured
            recipients: ['admin@company.com']
        },
        webhook: {
            enabled: false, // Set to true for Slack/Teams integration
            url: ''
        }
    },
    storage: {
        resultsDir: './link-audit-results',
        maxHistoryDays: 30
    }
};

class AutomatedMonitor {
    constructor() {
        this.isRunning = false;
        this.lastResults = null;
        this.healthStatus = {
            frontend: 'unknown',
            backend: 'unknown',
            database: 'unknown'
        };
        this.alertHistory = [];
        this.monitoringInterval = null;
        this.healthCheckInterval = null;
    }

    async start() {
        if (this.isRunning) {
            console.log('Monitor is already running');
            return;
        }

        console.log('🚀 Starting Automated Link Monitor...');
        this.isRunning = true;

        // Ensure results directory exists
        this.ensureDirectoryExists(config.storage.resultsDir);

        // Start monitoring intervals
        this.startHealthChecks();
        this.startLinkMonitoring();

        // Start web dashboard
        this.startWebDashboard();

        console.log('✅ Automated Monitor started successfully');
        console.log(`📊 Dashboard available at: http://localhost:3002`);
        console.log(`🔍 Link audits every ${config.monitoring.interval / 60000} minutes`);
        console.log(`💓 Health checks every ${config.monitoring.healthCheckInterval / 60000} minutes`);
    }

    async stop() {
        if (!this.isRunning) {
            console.log('Monitor is not running');
            return;
        }

        console.log('🛑 Stopping Automated Link Monitor...');
        this.isRunning = false;

        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        console.log('✅ Monitor stopped');
    }

    startHealthChecks() {
        this.performHealthCheck(); // Initial check
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, config.monitoring.healthCheckInterval);
    }

    startLinkMonitoring() {
        this.performLinkAudit(); // Initial audit
        this.monitoringInterval = setInterval(() => {
            this.performLinkAudit();
        }, config.monitoring.interval);
    }

    async performHealthCheck() {
        console.log('🔍 Performing health check...');
        
        try {
            // Check frontend
            this.healthStatus.frontend = await this.checkEndpoint(config.endpoints.frontend + '/health');
            
            // Check backend
            this.healthStatus.backend = await this.checkEndpoint(config.endpoints.backend + '/health');
            
            // Check database (through backend)
            this.healthStatus.database = await this.checkEndpoint(config.endpoints.backend + '/health/db');
            
            console.log('💓 Health Status:', this.healthStatus);
            
            // Save health status
            this.saveHealthStatus();
            
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
        }
    }

    async checkEndpoint(url) {
        try {
            const fetch = require('node-fetch');
            const response = await fetch(url, { timeout: 5000 });
            return response.ok ? 'healthy' : 'unhealthy';
        } catch (error) {
            return 'down';
        }
    }

    async performLinkAudit() {
        console.log('🔗 Starting automated link audit...');
        
        try {
            const results = await this.runLinkChecker();
            this.lastResults = results;
            
            // Analyze results
            const analysis = this.analyzeResults(results);
            
            // Check if alerts are needed
            if (analysis.brokenPercentage > config.monitoring.alertThreshold) {
                await this.sendAlert(analysis);
            }
            
            // Save results with timestamp
            this.saveAuditResults(results, analysis);
            
            console.log(`✅ Link audit completed: ${analysis.working}/${analysis.total} links working`);
            
        } catch (error) {
            console.error('❌ Link audit failed:', error.message);
        }
    }

    async runLinkChecker() {
        return new Promise((resolve, reject) => {
            const linkChecker = spawn('node', ['link-checker.js'], {
                cwd: __dirname,
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            linkChecker.stdout.on('data', (data) => {
                output += data.toString();
            });

            linkChecker.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            linkChecker.on('close', (code) => {
                if (code === 0) {
                    try {
                        // Read the generated results
                        const resultsPath = path.join(config.storage.resultsDir, 'audit-summary.json');
                        if (fs.existsSync(resultsPath)) {
                            const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
                            resolve(results);
                        } else {
                            reject(new Error('Results file not found'));
                        }
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error(`Link checker failed with code ${code}: ${errorOutput}`));
                }
            });
        });
    }

    analyzeResults(results) {
        const total = results.total || 0;
        const working = results.working || 0;
        const broken = results.broken || 0;
        const brokenPercentage = total > 0 ? (broken / total) : 0;

        return {
            total,
            working,
            broken,
            brokenPercentage,
            timestamp: new Date().toISOString(),
            status: brokenPercentage > config.monitoring.alertThreshold ? 'critical' : 
                   brokenPercentage > 0.5 ? 'warning' : 'healthy'
        };
    }

    async sendAlert(analysis) {
        const alert = {
            timestamp: new Date().toISOString(),
            type: 'link_audit_alert',
            severity: analysis.status,
            message: `High number of broken links detected: ${analysis.broken}/${analysis.total} (${(analysis.brokenPercentage * 100).toFixed(1)}%)`,
            details: analysis
        };

        this.alertHistory.push(alert);
        console.log('🚨 ALERT:', alert.message);

        // Send email notification if configured
        if (config.notifications.email.enabled) {
            await this.sendEmailAlert(alert);
        }

        // Send webhook notification if configured
        if (config.notifications.webhook.enabled) {
            await this.sendWebhookAlert(alert);
        }
    }

    async sendEmailAlert(alert) {
        // TODO: Implement email notifications
        console.log('📧 Email alert would be sent:', alert.message);
    }

    async sendWebhookAlert(alert) {
        // TODO: Implement webhook notifications
        console.log('🔗 Webhook alert would be sent:', alert.message);
    }

    saveHealthStatus() {
        const statusFile = path.join(config.storage.resultsDir, 'health-status.json');
        const status = {
            ...this.healthStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
        
        fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    }

    saveAuditResults(results, analysis) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `audit-${timestamp}.json`;
        const filepath = path.join(config.storage.resultsDir, filename);
        
        const data = {
            results,
            analysis,
            timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        
        // Update latest results
        const latestPath = path.join(config.storage.resultsDir, 'latest-audit.json');
        fs.writeFileSync(latestPath, JSON.stringify(data, null, 2));
        
        // Cleanup old files
        this.cleanupOldResults();
    }

    cleanupOldResults() {
        try {
            const files = fs.readdirSync(config.storage.resultsDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - config.storage.maxHistoryDays);
            
            files.forEach(file => {
                if (file.startsWith('audit-') && file.endsWith('.json')) {
                    const filepath = path.join(config.storage.resultsDir, file);
                    const stats = fs.statSync(filepath);
                    
                    if (stats.mtime < cutoffDate) {
                        fs.unlinkSync(filepath);
                        console.log(`🗑️ Cleaned up old result: ${file}`);
                    }
                }
            });
        } catch (error) {
            console.error('Error cleaning up old results:', error.message);
        }
    }

    startWebDashboard() {
        const app = express();
        
        app.get('/status', (req, res) => {
            res.json({
                monitoring: {
                    isRunning: this.isRunning,
                    lastAudit: this.lastResults ? new Date().toISOString() : null
                },
                health: this.healthStatus,
                lastResults: this.lastResults,
                alerts: this.alertHistory.slice(-10) // Last 10 alerts
            });
        });

        app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                monitoring: this.isRunning
            });
        });

        app.listen(3002, () => {
            console.log('📊 Monitoring dashboard started on port 3002');
        });
    }

    ensureDirectoryExists(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

// CLI interface
if (require.main === module) {
    const monitor = new AutomatedMonitor();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            monitor.start();
            break;
        case 'stop':
            monitor.stop();
            process.exit(0);
            break;
        case 'status':
            console.log('Monitor status:', monitor.isRunning ? 'running' : 'stopped');
            break;
        default:
            console.log('Usage: node automated-monitor.js [start|stop|status]');
            console.log('');
            console.log('Commands:');
            console.log('  start   - Start the automated monitoring system');
            console.log('  stop    - Stop the monitoring system');
            console.log('  status  - Check if monitoring is running');
            break;
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        await monitor.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
        await monitor.stop();
        process.exit(0);
    });
}

module.exports = AutomatedMonitor;
