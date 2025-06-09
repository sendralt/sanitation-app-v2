# Centralized Error Handling Implementation

## Overview

This document describes the comprehensive centralized error handling system implemented across the sanitation application. The system provides consistent error handling, logging, and user feedback for both the backend API service and the DHL login service.

## Architecture

### Core Components

1. **Custom Error Classes** - Standardized error types with consistent properties
2. **Global Error Handler Middleware** - Centralized error processing and response formatting
3. **Error Logger** - Structured logging with sanitization and file output
4. **Async Handler Wrapper** - Automatic error catching for async route handlers
5. **Request ID Middleware** - Request tracking for better debugging

### Services

- **Backend Service** (`backend/`) - API-focused error handling with JSON responses
- **DHL Login Service** (`dhl_login/`) - Web and API error handling with redirects and JSON responses

## Custom Error Classes

### Base Error Class: `AppError`

```javascript
class AppError extends Error {
    constructor(message, statusCode, code = null, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}
```

### Specialized Error Classes

| Error Class | Status Code | Use Case |
|-------------|-------------|----------|
| `ValidationError` | 400 | Input validation failures |
| `AuthenticationError` | 401 | Authentication failures |
| `AuthorizationError` | 403 | Permission denied |
| `NotFoundError` | 404 | Resource not found |
| `RateLimitError` | 429 | Rate limiting violations |
| `EmailError` | 500 | Email sending failures |
| `FileOperationError` | 500 | File system operations |
| `DatabaseError` | 500 | Database operation failures |

## Usage Examples

### Basic Error Throwing

```javascript
// Validation error
if (!email) {
    throw new ValidationError('Email is required');
}

// Not found error
if (!user) {
    throw new NotFoundError('User');
}

// Authentication error
if (!isValidToken) {
    throw new AuthenticationError('Invalid token');
}
```

### Async Route Handler

```javascript
app.post('/api/users', asyncHandler(async (req, res) => {
    const { username, email } = req.body;
    
    if (!username) {
        throw new ValidationError('Username is required');
    }
    
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
        throw new ValidationError('Username already exists');
    }
    
    const user = await User.create({ username, email });
    res.status(201).json({ user });
}));
```

### File Operations with Error Handling

```javascript
app.get('/api/data/:id', asyncHandler(async (req, res) => {
    const filePath = path.join(dataDir, `data_${req.params.id}.json`);
    
    if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Data file');
    }
    
    let data;
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(fileContent);
    } catch (error) {
        throw new FileOperationError('read', `data_${req.params.id}.json`, error);
    }
    
    res.json(data);
}));
```

## Error Response Format

### API Responses (JSON)

```json
{
    "status": "fail",
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "path": "/api/users",
    "method": "POST",
    "requestId": "abc123def456",
    "details": {
        "field": "email",
        "value": "invalid-email"
    }
}
```

### Development Mode (Additional Fields)

```json
{
    "status": "error",
    "message": "Database connection failed",
    "code": "DATABASE_ERROR",
    "stack": "Error: Connection refused\n    at ...",
    "details": {
        "originalError": "ECONNREFUSED"
    }
}
```

### Web Responses (DHL Login Service)

- **401 Errors**: Redirect to `/login-page`
- **403 Errors**: Render access denied page
- **404 Errors**: Render 404 page
- **500 Errors**: Redirect to dashboard with flash message

## Error Logging

### Log Structure

```json
{
    "timestamp": "2024-01-15T10:30:00.000Z",
    "error": {
        "message": "Validation failed",
        "stack": "Error: Validation failed\n    at ...",
        "statusCode": 400,
        "code": "VALIDATION_ERROR",
        "details": { "field": "email" }
    },
    "request": {
        "method": "POST",
        "url": "/api/users",
        "headers": { "content-type": "application/json" },
        "body": { "username": "testuser" },
        "user": { "id": 1, "username": "admin" },
        "ip": "127.0.0.1"
    },
    "environment": "development"
}
```

### Log Files

- **Development**: Console output only
- **Production**: Console + daily log files in `logs/error-YYYY-MM-DD.log`

### Data Sanitization

Sensitive fields are automatically removed from logs:
- `password` fields from request body
- `authorization` headers
- `cookie` headers
- `token` fields

## Health Check Endpoints

### Backend Service

- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system checks
- `GET /health/error-test/:type` - Test error scenarios
- `GET /health/error-stats` - Error logging statistics
- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe

### DHL Login Service

- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system checks including database
- `GET /health/database` - Database connectivity test
- `GET /health/auth-test` - Authentication system test
- `GET /ready` - Readiness probe
- `GET /live` - Liveness probe

## Testing

### Unit Tests

Run the error handling tests:

```bash
npm test tests/error-handling.test.js
```

### Manual Testing

Test different error scenarios:

```bash
# Test validation error
curl http://localhost:3001/health/error-test/validation

# Test authentication error
curl http://localhost:3000/health/error-test/auth

# Test database error
curl http://localhost:3000/health/error-test/database
```

## Best Practices

### 1. Always Use Custom Error Classes

```javascript
// Good
throw new ValidationError('Email is required');

// Avoid
throw new Error('Email is required');
```

### 2. Wrap Async Routes

```javascript
// Good
app.post('/api/users', asyncHandler(async (req, res) => {
    // async code here
}));

// Avoid
app.post('/api/users', async (req, res) => {
    try {
        // async code here
    } catch (error) {
        // manual error handling
    }
});
```

### 3. Provide Meaningful Error Messages

```javascript
// Good
throw new ValidationError('Username must be between 3 and 30 characters');

// Avoid
throw new ValidationError('Invalid input');
```

### 4. Include Context in Error Details

```javascript
throw new FileOperationError('read', filename, originalError);
throw new DatabaseError('user creation', { username, originalError });
```

## Migration Guide

### Converting Existing Routes

1. **Replace manual error responses**:
   ```javascript
   // Before
   if (!user) {
       return res.status(404).json({ message: 'User not found' });
   }
   
   // After
   if (!user) {
       throw new NotFoundError('User');
   }
   ```

2. **Wrap async routes**:
   ```javascript
   // Before
   app.get('/api/users/:id', async (req, res) => {
       try {
           // route logic
       } catch (error) {
           res.status(500).json({ message: 'Server error' });
       }
   });
   
   // After
   app.get('/api/users/:id', asyncHandler(async (req, res) => {
       // route logic - errors automatically handled
   }));
   ```

3. **Add request ID middleware**:
   ```javascript
   app.use(requestIdMiddleware);
   ```

## Monitoring and Alerting

### Key Metrics to Monitor

- Error rate by status code
- Response times for error scenarios
- Log file sizes and rotation
- Health check endpoint availability

### Recommended Alerts

- Error rate > 5% over 5 minutes
- Health check failures
- Log directory disk usage > 80%
- Memory usage spikes during error handling
