/**
 * Frontend Configuration Module
 * 
 * This module fetches configuration from the server and provides
 * it to other frontend scripts. This eliminates hardcoded URLs
 * and makes the application more flexible across environments.
 */

// Global configuration object
window.AppConfig = {
    backendApiUrl: null,
    supervisorEmail: null,
    environment: null,
    version: null,
    isLoaded: false
};

/**
 * Fetch configuration from the server
 * @returns {Promise<Object>} Configuration object
 */
async function fetchConfig() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`Failed to fetch configuration: ${response.status} ${response.statusText}`);
        }
        
        const config = await response.json();
        
        // Update global configuration
        window.AppConfig.backendApiUrl = config.backendApiUrl;
        window.AppConfig.supervisorEmail = config.supervisorEmail;
        window.AppConfig.environment = config.environment;
        window.AppConfig.version = config.version;
        window.AppConfig.isLoaded = true;
        
        console.log('[Config] Configuration loaded:', config);
        return config;
        
    } catch (error) {
        console.error('[Config] Failed to fetch configuration:', error);
        
        // Fallback to default configuration for development
        const fallbackConfig = {
            backendApiUrl: 'https://localhost:3001',
            supervisorEmail: 'supervisor@company.com',
            environment: 'development',
            version: 'unknown'
        };

        window.AppConfig.backendApiUrl = fallbackConfig.backendApiUrl;
        window.AppConfig.supervisorEmail = fallbackConfig.supervisorEmail;
        window.AppConfig.environment = fallbackConfig.environment;
        window.AppConfig.version = fallbackConfig.version;
        window.AppConfig.isLoaded = true;
        
        console.warn('[Config] Using fallback configuration:', fallbackConfig);
        return fallbackConfig;
    }
}

/**
 * Get the backend API URL
 * @returns {string} Backend API URL
 */
function getBackendApiUrl() {
    if (!window.AppConfig.isLoaded) {
        console.warn('[Config] Configuration not loaded yet, using fallback URL');
        return 'http://localhost:3001';
    }
    return window.AppConfig.backendApiUrl;
}

/**
 * Get the supervisor email
 * @returns {string} Supervisor email address
 */
function getSupervisorEmail() {
    if (!window.AppConfig.isLoaded) {
        console.warn('[Config] Configuration not loaded yet, using fallback email');
        return 'supervisor@company.com';
    }
    return window.AppConfig.supervisorEmail;
}

/**
 * Get the current environment
 * @returns {string} Environment (development, production, etc.)
 */
function getEnvironment() {
    if (!window.AppConfig.isLoaded) {
        return 'development';
    }
    return window.AppConfig.environment;
}

/**
 * Check if configuration is loaded
 * @returns {boolean} True if configuration is loaded
 */
function isConfigLoaded() {
    return window.AppConfig.isLoaded;
}

/**
 * Wait for configuration to be loaded
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise<Object>} Configuration object
 */
function waitForConfig(timeout = 5000) {
    return new Promise((resolve, reject) => {
        if (window.AppConfig.isLoaded) {
            resolve(window.AppConfig);
            return;
        }
        
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (window.AppConfig.isLoaded) {
                clearInterval(checkInterval);
                resolve(window.AppConfig);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkInterval);
                reject(new Error('Configuration load timeout'));
            }
        }, 100);
    });
}

// Auto-load configuration when script loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('[Config] Auto-loading configuration...');
    fetchConfig();
});

// Export functions for use by other scripts
window.AppConfig.fetch = fetchConfig;
window.AppConfig.getBackendApiUrl = getBackendApiUrl;
window.AppConfig.getSupervisorEmail = getSupervisorEmail;
window.AppConfig.getEnvironment = getEnvironment;
window.AppConfig.isLoaded = isConfigLoaded;
window.AppConfig.waitForConfig = waitForConfig;
