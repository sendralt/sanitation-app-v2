# CORS Configuration Documentation

## Overview

Cross-Origin Resource Sharing (CORS) is a security feature implemented by web browsers to prevent malicious websites from accessing resources from other domains without permission. This document describes the CORS configuration implemented in the Sanitation App.

## Security Implementation

### ✅ **SECURE CONFIGURATION IMPLEMENTED**

Both services now implement **secure, restrictive CORS policies** instead of the previous permissive `Access-Control-Allow-Origin: '*'` configuration.

## Service-Specific CORS Configuration

### Backend Service (Port 3001)

**File**: `backend/server.js`
**Configuration**: Lines 59-82

```javascript
// Parse allowed origins from environment variable
const allowedOriginsString = process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000';
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

// Configure CORS options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like server-to-server requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11) choke on 204
};

// Apply CORS middleware
app.use(cors(corsOptions));
```

**Environment Variable**: `CORS_ALLOWED_ORIGINS`
**Default**: `http://localhost:3000` (dhl_login service)

### DHL Login Service (Port 3000)

**File**: `dhl_login/app.js`
**Configuration**: Lines 30-54

```javascript
// Parse allowed origins from environment variable
const allowedOriginsString = process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3001';
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

// Configure CORS options for API routes
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like server-to-server requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11) choke on 204
};

// Apply CORS to API routes only (not to web pages)
app.use('/api', cors(corsOptions));
```

**Environment Variable**: `CORS_ALLOWED_ORIGINS`
**Default**: `http://localhost:3001` (backend service)
**Scope**: Applied only to `/api/*` routes

## Environment Configuration

### Backend (.env)
```bash
# CORS allowed origins (comma-separated list)
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### DHL Login (.env)
```bash
# CORS allowed origins for API endpoints (comma-separated list)
CORS_ALLOWED_ORIGINS=http://localhost:3001
```

## Production Configuration Examples

### Single Domain
```bash
# Backend
CORS_ALLOWED_ORIGINS=https://yourdomain.com

# DHL Login
CORS_ALLOWED_ORIGINS=https://api.yourdomain.com
```

### Multiple Domains
```bash
# Backend
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://staging.yourdomain.com

# DHL Login
CORS_ALLOWED_ORIGINS=https://api.yourdomain.com,https://api-staging.yourdomain.com
```

## Security Features

### ✅ **Implemented Security Measures**

1. **Dynamic Origin Validation**: Each request's origin is checked against the whitelist
2. **Environment-Based Configuration**: Origins are configurable per environment
3. **Logging**: Blocked requests are logged for monitoring
4. **Credentials Support**: Allows cookies and authentication headers
5. **Method Restrictions**: Only allows necessary HTTP methods
6. **Header Restrictions**: Limits allowed headers to essential ones

### ❌ **Security Vulnerabilities Eliminated**

1. **Wildcard Origins**: No more `Access-Control-Allow-Origin: '*'`
2. **Unrestricted Access**: All origins must be explicitly whitelisted
3. **Production Exposure**: Environment-specific configuration prevents accidental exposure

## Testing CORS Configuration

### Development Testing
```bash
# Test allowed origin (should succeed)
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3001/submit-form

# Test blocked origin (should fail)
curl -H "Origin: http://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3001/submit-form
```

### Browser Testing
1. Open browser developer tools
2. Navigate to the application
3. Check Network tab for CORS-related errors
4. Verify that cross-origin requests work as expected

## Troubleshooting

### Common Issues

1. **CORS Error in Browser Console**
   - Check that the origin is included in `CORS_ALLOWED_ORIGINS`
   - Verify the protocol (http vs https) matches exactly
   - Ensure port numbers are included if non-standard

2. **API Requests Failing**
   - Verify the backend service is running
   - Check that the frontend origin is whitelisted
   - Review server logs for CORS blocking messages

3. **Production Deployment Issues**
   - Update `CORS_ALLOWED_ORIGINS` with production URLs
   - Use HTTPS origins in production
   - Test thoroughly before going live

### Debug Logging

Both services log CORS configuration and blocking events:

```
CORS configured with allowed origins: http://localhost:3000
CORS blocked request from origin: http://malicious-site.com
```

## Maintenance

### Regular Tasks

1. **Review Allowed Origins**: Periodically audit the whitelist
2. **Update for New Environments**: Add staging/production URLs as needed
3. **Monitor Logs**: Watch for unexpected CORS blocking
4. **Security Audits**: Ensure no wildcard origins are accidentally introduced

### Version Updates

When updating the `cors` package:
1. Test the configuration thoroughly
2. Verify that the API remains compatible
3. Check for any new security features or breaking changes

## Compliance

This CORS configuration follows security best practices:
- ✅ Principle of least privilege (minimal allowed origins)
- ✅ Environment-specific configuration
- ✅ Comprehensive logging and monitoring
- ✅ No wildcard origins in production
- ✅ Explicit method and header restrictions
