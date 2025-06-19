#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Sanitation App
 * This script runs all tests across the entire application
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test configuration
const testConfig = {
    backend: {
        name: 'Backend Tests',
        directory: './backend',
        packageJson: './backend/package.json',
        testCommand: 'npm test',
        coverageCommand: 'npm run test:coverage'
    },
    frontend: {
        name: 'Frontend Tests',
        directory: './dhl_login',
        packageJson: './dhl_login/package.json',
        testCommand: 'npm test',
        coverageCommand: 'npm run test:coverage'
    },
    integration: {
        name: 'Integration Tests',
        directory: './tests',
        testCommand: 'jest --testPathPattern=integration',
        coverageCommand: 'jest --testPathPattern=integration --coverage'
    }
};

// Utility functions
function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
    const border = '='.repeat(60);
    log(border, colors.cyan);
    log(`  ${message}`, colors.cyan + colors.bright);
    log(border, colors.cyan);
}

function logSection(message) {
    log(`\n${colors.blue}${colors.bright}${message}${colors.reset}`);
    log('-'.repeat(40), colors.blue);
}

function logSuccess(message) {
    log(`✅ ${message}`, colors.green);
}

function logError(message) {
    log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
    log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
    log(`ℹ️  ${message}`, colors.blue);
}

// Check if directory exists and has package.json
function checkTestEnvironment(config) {
    if (!fs.existsSync(config.directory)) {
        logError(`Directory ${config.directory} does not exist`);
        return false;
    }

    if (config.packageJson && !fs.existsSync(config.packageJson)) {
        logError(`Package.json not found at ${config.packageJson}`);
        return false;
    }

    return true;
}

// Run a command and return a promise
function runCommand(command, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
        logInfo(`Running: ${command} in ${cwd}`);
        
        const [cmd, ...args] = command.split(' ');
        const child = spawn(cmd, args, {
            cwd,
            stdio: 'inherit',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(new Error(`Command failed with exit code ${code}`));
            }
        });

        child.on('error', (error) => {
            reject(error);
        });
    });
}

// Install dependencies if needed
async function installDependencies(config) {
    if (!config.packageJson) return;

    const nodeModulesPath = path.join(config.directory, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
        logInfo(`Installing dependencies for ${config.name}...`);
        try {
            await runCommand('npm install', config.directory);
            logSuccess(`Dependencies installed for ${config.name}`);
        } catch (error) {
            logError(`Failed to install dependencies for ${config.name}: ${error.message}`);
            throw error;
        }
    } else {
        logInfo(`Dependencies already installed for ${config.name}`);
    }
}

// Run tests for a specific configuration
async function runTests(config, options = {}) {
    logSection(`Running ${config.name}`);

    if (!checkTestEnvironment(config)) {
        throw new Error(`Test environment check failed for ${config.name}`);
    }

    try {
        await installDependencies(config);

        const command = options.coverage ? config.coverageCommand : config.testCommand;
        if (!command) {
            logWarning(`No test command configured for ${config.name}`);
            return;
        }

        await runCommand(command, config.directory);
        logSuccess(`${config.name} completed successfully`);
    } catch (error) {
        logError(`${config.name} failed: ${error.message}`);
        throw error;
    }
}

// Main test runner function
async function runAllTests(options = {}) {
    logHeader('Sanitation App Test Suite');
    
    const startTime = Date.now();
    const results = {
        passed: [],
        failed: [],
        skipped: []
    };

    // Run tests for each configuration
    for (const [key, config] of Object.entries(testConfig)) {
        if (options.only && !options.only.includes(key)) {
            logInfo(`Skipping ${config.name} (not in --only list)`);
            results.skipped.push(config.name);
            continue;
        }

        try {
            await runTests(config, options);
            results.passed.push(config.name);
        } catch (error) {
            results.failed.push(config.name);
            if (options.failFast) {
                logError('Stopping due to --fail-fast option');
                break;
            }
        }
    }

    // Print summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    logHeader('Test Results Summary');
    
    if (results.passed.length > 0) {
        logSuccess(`Passed (${results.passed.length}):`);
        results.passed.forEach(name => log(`  • ${name}`, colors.green));
    }

    if (results.failed.length > 0) {
        logError(`Failed (${results.failed.length}):`);
        results.failed.forEach(name => log(`  • ${name}`, colors.red));
    }

    if (results.skipped.length > 0) {
        logWarning(`Skipped (${results.skipped.length}):`);
        results.skipped.forEach(name => log(`  • ${name}`, colors.yellow));
    }

    log(`\nTotal time: ${duration}s`, colors.cyan);

    // Exit with appropriate code
    if (results.failed.length > 0) {
        process.exit(1);
    } else {
        logSuccess('All tests passed! 🎉');
        process.exit(0);
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        coverage: false,
        failFast: false,
        only: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--coverage':
                options.coverage = true;
                break;
            case '--fail-fast':
                options.failFast = true;
                break;
            case '--only':
                if (i + 1 < args.length) {
                    options.only = args[i + 1].split(',');
                    i++; // Skip next argument
                } else {
                    logError('--only requires a comma-separated list of test suites');
                    process.exit(1);
                }
                break;
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                break;
            default:
                logError(`Unknown option: ${arg}`);
                printHelp();
                process.exit(1);
        }
    }

    return options;
}

// Print help message
function printHelp() {
    log('Sanitation App Test Runner', colors.cyan + colors.bright);
    log('');
    log('Usage: node run-tests.js [options]', colors.bright);
    log('');
    log('Options:');
    log('  --coverage     Run tests with coverage reporting');
    log('  --fail-fast    Stop on first test failure');
    log('  --only <list>  Run only specified test suites (comma-separated)');
    log('                 Available: backend, frontend, integration');
    log('  --help, -h     Show this help message');
    log('');
    log('Examples:');
    log('  node run-tests.js                    # Run all tests');
    log('  node run-tests.js --coverage         # Run all tests with coverage');
    log('  node run-tests.js --only backend     # Run only backend tests');
    log('  node run-tests.js --only backend,frontend  # Run backend and frontend tests');
}

// Main execution
if (require.main === module) {
    const options = parseArgs();
    runAllTests(options).catch((error) => {
        logError(`Test runner failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    runTests,
    testConfig
};
