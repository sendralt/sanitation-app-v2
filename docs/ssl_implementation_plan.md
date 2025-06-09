# SSL Configuration Plan for DHL Sanitation App

This document outlines a comprehensive plan to implement SSL for the DHL Sanitation App.

## Current Status Analysis

The app already has most SSL components in place:
- SSL certificate handling via Let's Encrypt
- Scripts for certificate updates
- Basic Nginx configuration with SSL
- Environment variables for SSL in both services

## Implementation Plan

### 1. Domain & DNS Configuration

```bash
# Verify domain points to your server
dig dot1hundred.com +short
# Should return 98.123.244.251
```

### 2. Let's Encrypt Certificate Setup

```bash
#!/bin/bash

# Configuration
DOMAIN="dot1hundred.com"
LETSENCRYPT_DIR="/etc/letsencrypt/live/$DOMAIN"
APP_DIR="/var/www/sanitation-app"
DHL_LOGIN_SSL_DIR="$APP_DIR/dhl_login/ssl"
BACKEND_SSL_DIR="$APP_DIR/backend/ssl"
```

```bash
# Install Certbot if not already installed
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d dot1hundred.com

# Create renewal hook
sudo cp /var/www/sanitation-app/scripts/certbot-renewal-hook.sh /etc/letsencrypt/renewal-hooks/deploy/
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/certbot-renewal-hook.sh

# Run certificate update script
sudo /var/www/sanitation-app/scripts/update-ssl-certificates.sh
```

### 3. Nginx Configuration

```nginx
server {
    server_name dot1hundred.com;

    # Frontend routes (DHL Login Service)
    location / {
        proxy_pass https://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSL verification settings
        proxy_ssl_verify on;
        proxy_ssl_trusted_certificate /etc/letsencrypt/live/dot1hundred.com/chain.pem;
        proxy_ssl_session_reuse on;
    }

    # Backend API routes
    location ~ ^/(submit-form|validate|view-checklist) {
        proxy_pass https://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSL verification settings
        proxy_ssl_verify on;
        proxy_ssl_trusted_certificate /etc/letsencrypt/live/dot1hundred.com/chain.pem;
        proxy_ssl_session_reuse on;
    }

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/dot1hundred.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dot1hundred.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
}

server {
    listen 80;
    server_name dot1hundred.com;
    return 301 https://$host$request_uri;
}
```

```bash
# Create symlink if not exists
sudo ln -sf /etc/nginx/sites-available/sanitation-app.conf /etc/nginx/sites-enabled/

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Application Configuration

#### DHL Login Service (.env)
```bash
ENABLE_SSL=true
HTTPS_PORT=3000
SSL_KEY_PATH=ssl/server.key
SSL_CERT_PATH=ssl/server.crt
BACKEND_API_URL=https://localhost:3001
CORS_ALLOWED_ORIGINS=https://dot1hundred.com,https://localhost:3001
ENABLE_HTTP_REDIRECT=true
```

#### Backend Service (.env)
```bash
ENABLE_SSL=true
HTTPS_PORT=3001
SSL_KEY_PATH=ssl/server.key
SSL_CERT_PATH=ssl/server.crt
BASE_URL=https://dot1hundred.com
CORS_ALLOWED_ORIGINS=https://dot1hundred.com,https://localhost:3000
ENABLE_HTTP_REDIRECT=true
```

### 5. SSL Configuration in Node.js

```javascript
// Additional SSL options for security
secureProtocol: 'TLSv1_2_method',
ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384'
].join(':'),
honorCipherOrder: true,
minVersion: 'TLSv1.2'
```

### 6. Restart Services

```bash
# Restart both services
cd /var/www/sanitation-app/dhl_login
pm2 restart dhl_login

cd /var/www/sanitation-app/backend
pm2 restart backend
```

## Verification Steps

1. **Certificate Verification**:
   ```bash
   # Check certificate validity
   sudo certbot certificates
   ```

2. **SSL Configuration Test**:
   ```bash
   # Test SSL configuration
   curl -I https://dot1hundred.com
   # Should return HTTP/2 200 with proper security headers
   ```

3. **Browser Testing**:
   - Visit https://dot1hundred.com
   - Verify SSL padlock is present
   - Check certificate details in browser

4. **Application Testing**:
   - Test login functionality
   - Test form submissions
   - Verify all API calls work correctly

5. **Security Testing**:
   ```bash
   # Test SSL security
   nmap --script ssl-enum-ciphers -p 443 dot1hundred.com
   # Should show only strong ciphers
   ```

This plan ensures the DHL Sanitation App is properly configured with SSL, using Let's Encrypt certificates and following security best practices.