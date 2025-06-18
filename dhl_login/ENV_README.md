# DHL Login Frontend Environment Configuration

This document describes the environment configuration for the DHL Login frontend application.

## Environment File Location

The environment configuration is stored in `.env` file in the `dhl_login` directory.

## Port Configuration

The frontend is configured to run on **Port 3000** as requested:

- `PORT=3000` - HTTP port for the frontend application
- `HTTPS_PORT=3000` - HTTPS port (when SSL is enabled)

## Generated Secrets

New secure secrets have been generated for this application:

- **JWT_SECRET** - 128-character hex string for JWT token signing
- **SESSION_SECRET** - 128-character hex string for session encryption
- **CSRF_SECRET** - 64-character hex string for CSRF protection

⚠️ **Security Note**: These secrets are cryptographically secure and should be kept confidential.

## Key Configuration Variables

### Required Variables
- `PORT` - Application port (set to 3000)
- `NODE_ENV` - Environment mode (development/production)
- `JWT_SECRET` - JWT signing secret
- `SESSION_SECRET` - Session encryption secret
- `CSRF_SECRET` - CSRF protection secret

### Optional Variables
- `HTTPS_PORT` - HTTPS port (3443)
- `ENABLE_SSL` - SSL/TLS enablement (false by default)
- `BACKEND_API_URL` - Backend API endpoint (http://localhost:3001)
- `SUPERVISOR_EMAIL` - Supervisor email address
- `BASE_URL` - Application base URL (http://localhost:3000)
- `CORS_ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins

## CORS Configuration

The application is configured to allow requests from:
1. `http://localhost:3001` (Backend API)
2. `http://localhost:3000` (Frontend)
3. `https://localhost:3443` (HTTPS Frontend)

## SSL Configuration

SSL is currently disabled (`ENABLE_SSL=false`) for development. To enable SSL:

1. Set `ENABLE_SSL=true`
2. Ensure SSL certificates exist in `./ssl/` directory
3. Update `SSL_KEY_PATH` and `SSL_CERT_PATH` if needed

## Database Configuration

- SQLite database: `./database.sqlite`
- PostgreSQL settings available for future use

## Testing Configuration

Run the environment test script to verify configuration:

```bash
node test-env.js
```

This will validate all required variables are set and display the current configuration.

## Starting the Application

With the .env file configured, start the application:

```bash
npm start
```

The application will start on http://localhost:3000

## Security Features

The configuration includes:
- Rate limiting for API endpoints
- CSRF protection
- Secure session cookies
- Content Security Policy headers
- CORS protection

## Email Configuration

Email settings are configured for supervisor notifications:
- `SUPERVISOR_EMAIL` - Default supervisor email
- `EMAIL_USER` - SMTP user (requires configuration)
- `EMAIL_PASS` - SMTP password (requires configuration)

## Environment Variables Summary

| Variable | Value | Description |
|----------|-------|-------------|
| PORT | 3000 | Frontend HTTP port |
| HTTPS_PORT | 3443 | Frontend HTTPS port |
| NODE_ENV | development | Environment mode |
| ENABLE_SSL | false | SSL enablement |
| BACKEND_API_URL | http://localhost:3001 | Backend API URL |
| BASE_URL | http://localhost:3000 | Frontend base URL |
| SUPERVISOR_EMAIL | sendral.ts.1@pg.com | Supervisor email |

## Notes

- All secrets are newly generated and unique to this installation
- Configuration supports both HTTP and HTTPS modes
- CORS is properly configured for multi-origin requests
- Database path is relative to the application directory
- Session configuration includes security best practices
