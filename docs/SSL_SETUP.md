# SSL/HTTPS Setup Guide

This guide explains how to set up SSL/HTTPS for the DHL Sanitation App, including both development and production configurations.

## Overview

The DHL Sanitation App consists of two services that can be configured to use HTTPS:
- **DHL Login Service** (Frontend/Authentication) - Default HTTPS port: 3443
- **Backend API Service** - Default HTTPS port: 3444

## Quick Start (Development)

### 1. SSL Certificates (Let's Encrypt)

The application uses Let's Encrypt certificates for production SSL:

```bash
# Certificates are automatically copied from Let's Encrypt
sudo /var/www/sanitation-app/scripts/update-ssl-certificates.sh
```

This copies Let's Encrypt certificates to both services:
- `dhl_login/ssl/server.key` and `dhl_login/ssl/server.crt`
- `backend/ssl/server.key` and `backend/ssl/server.crt`

### 2. Environment Configuration

SSL is already enabled in your `.env` files. Key settings:

**dhl_login/.env:**
```bash
ENABLE_SSL=true
HTTPS_PORT=3443
SSL_KEY_PATH=ssl/server.key
SSL_CERT_PATH=ssl/server.crt
BACKEND_API_URL=https://localhost:3444
CORS_ALLOWED_ORIGINS=https://localhost:3444
```

**backend/.env:**
```bash
ENABLE_SSL=true
HTTPS_PORT=3444
SSL_KEY_PATH=ssl/server.key
SSL_CERT_PATH=ssl/server.crt
BASE_URL=https://localhost:3443
CORS_ALLOWED_ORIGINS=https://localhost:3443
```

### 3. Start the Applications

```bash
# Terminal 1 - Start Backend API
cd backend
npm start

# Terminal 2 - Start DHL Login Service
cd dhl_login
npm start
```

### 4. Access the Applications

- **DHL Login**: https://localhost:3443
- **Backend API**: https://localhost:3444

**Note:** Your browser will show a security warning for self-signed certificates. Click "Advanced" and "Proceed to localhost" to continue.

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENABLE_SSL` | Enable/disable HTTPS | `true` |
| `HTTPS_PORT` | HTTPS port number | `3443` (login), `3444` (backend) |
| `PORT` | HTTP port (for redirects) | `3000` (login), `3001` (backend) |
| `SSL_KEY_PATH` | Path to SSL private key | `ssl/server.key` |
| `SSL_CERT_PATH` | Path to SSL certificate | `ssl/server.crt` |
| `ENABLE_HTTP_REDIRECT` | Redirect HTTP to HTTPS | `true` |

### SSL Certificate Paths

Paths are relative to the service directory:
- DHL Login: `dhl_login/ssl/`
- Backend: `backend/ssl/`

## Production Setup

### 1. Obtain Real SSL Certificates

For production, replace self-signed certificates with real ones from a Certificate Authority (CA):

#### Option A: Let's Encrypt (Free)
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate for your domain
sudo certbot certonly --standalone -d yourdomain.com
```

#### Option B: Commercial CA
Purchase certificates from providers like DigiCert, Comodo, or GoDaddy.

### 2. Update Certificate Paths

Update your production `.env` files:

```bash
# Production certificate paths
SSL_KEY_PATH=/etc/ssl/private/yourdomain.com.key
SSL_CERT_PATH=/etc/ssl/certs/yourdomain.com.crt
```

### 3. Production Environment Variables

```bash
NODE_ENV=production
ENABLE_SSL=true
BASE_URL=https://yourdomain.com:3443
BACKEND_API_URL=https://yourdomain.com:3444
```

## Security Features

### Implemented Security Measures

1. **TLS 1.2+ Only**: Configured to use modern TLS versions
2. **Strong Ciphers**: Uses secure cipher suites
3. **Secure Cookies**: Session cookies are marked as secure when HTTPS is enabled
4. **HTTP to HTTPS Redirects**: Automatic redirection from HTTP to HTTPS
5. **CORS Configuration**: Properly configured for HTTPS origins

### Additional Security Headers

Consider adding these security headers in production:

```javascript
// Add to your Express app
app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});
```

## Troubleshooting

### Common Issues

1. **Certificate Not Found**
   - Verify certificate files exist in the specified paths
   - Check file permissions (readable by Node.js process)

2. **Port Already in Use**
   - Check if another service is using the HTTPS ports
   - Use `netstat -tulpn | grep :3443` to check port usage

3. **Browser Security Warnings**
   - Normal for self-signed certificates
   - Click "Advanced" → "Proceed to localhost"

4. **CORS Errors**
   - Ensure CORS_ALLOWED_ORIGINS includes HTTPS URLs
   - Check that frontend is making requests to HTTPS backend

### Logs and Debugging

Enable debug logging:
```bash
DEBUG=true
```

Check server logs for SSL-related messages:
- `[SSL]` prefix indicates SSL operations
- `[HTTP->HTTPS]` shows redirect operations

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Certificates | Self-signed | CA-issued |
| Ports | 3443, 3444 | 443, custom |
| Domain | localhost | Real domain |
| Security | Basic | Enhanced headers |
| Monitoring | Console logs | Production logging |

## File Structure

```
sanitation-app/
├── dhl_login/
│   ├── ssl/
│   │   ├── server.key
│   │   └── server.crt
│   ├── config/
│   │   └── ssl.js
│   └── .env
├── backend/
│   ├── ssl/
│   │   ├── server.key
│   │   └── server.crt
│   ├── config/
│   │   └── ssl.js
│   └── .env
├── scripts/
│   └── generate-ssl-certificates.js
└── docs/
    └── SSL_SETUP.md
```
