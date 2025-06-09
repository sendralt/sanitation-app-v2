#!/bin/bash

# SSL Certificate Update Script for DHL Sanitation App
# This script copies Let's Encrypt certificates to Node.js applications
# and restarts the services if needed

set -e  # Exit on any error

# Configuration
DOMAIN="dot1hundred.com"
LETSENCRYPT_DIR="/etc/letsencrypt/live/$DOMAIN"
APP_DIR="/var/www/sanitation-app"
DHL_LOGIN_SSL_DIR="$APP_DIR/dhl_login/ssl"
BACKEND_SSL_DIR="$APP_DIR/backend/ssl"
USER="eh8180"
GROUP="eh8180"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 DHL Sanitation App - SSL Certificate Update Script${NC}"
echo "=================================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Check if Let's Encrypt certificates exist
if [ ! -d "$LETSENCRYPT_DIR" ]; then
    echo -e "${RED}❌ Let's Encrypt certificates not found for domain: $DOMAIN${NC}"
    echo "Please run: certbot certonly --nginx -d $DOMAIN"
    exit 1
fi

echo -e "${YELLOW}📋 Checking certificate status...${NC}"

# Check certificate expiry
CERT_EXPIRY=$(openssl x509 -enddate -noout -in "$LETSENCRYPT_DIR/cert.pem" | cut -d= -f2)
echo "Certificate expires: $CERT_EXPIRY"

# Function to copy certificates
copy_certificates() {
    local service_name=$1
    local ssl_dir=$2
    
    echo -e "${YELLOW}📁 Copying certificates for $service_name...${NC}"
    
    # Create SSL directory if it doesn't exist
    mkdir -p "$ssl_dir"
    
    # Copy certificates
    cp "$LETSENCRYPT_DIR/privkey.pem" "$ssl_dir/server.key"
    cp "$LETSENCRYPT_DIR/fullchain.pem" "$ssl_dir/server.crt"
    
    # Set correct ownership and permissions
    chown "$USER:$GROUP" "$ssl_dir/server.key" "$ssl_dir/server.crt"
    chmod 600 "$ssl_dir/server.key"
    chmod 644 "$ssl_dir/server.crt"
    
    echo -e "${GREEN}✓ Certificates copied for $service_name${NC}"
}

# Copy certificates to both services
copy_certificates "DHL Login Service" "$DHL_LOGIN_SSL_DIR"
copy_certificates "Backend API Service" "$BACKEND_SSL_DIR"

# Check if PM2 is managing the processes
if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}🔄 Checking PM2 processes...${NC}"
    
    # Check if processes are running under PM2
    if pm2 list | grep -q "dhl-login\|backend-api"; then
        echo -e "${YELLOW}🔄 Restarting PM2 processes to reload certificates...${NC}"
        pm2 restart all
        echo -e "${GREEN}✓ PM2 processes restarted${NC}"
    else
        echo -e "${YELLOW}⚠️  No PM2 processes found. You may need to manually restart your Node.js applications.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 not found. You may need to manually restart your Node.js applications.${NC}"
fi

# Reload nginx to ensure it's using the latest certificates
echo -e "${YELLOW}🔄 Reloading nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"

echo ""
echo -e "${GREEN}🎉 SSL certificate update completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Test your applications:"
echo "   - Frontend: https://dot1hundred.com"
echo "   - Check SSL certificate in browser"
echo "2. Verify email links are working correctly"
echo "3. Test form submissions and validations"
echo ""
echo -e "${YELLOW}📅 Certificate Auto-Renewal:${NC}"
echo "This script can be run automatically via cron job:"
echo "Add to crontab: 0 2 * * 0 /var/www/sanitation-app/scripts/update-ssl-certificates.sh"
echo ""
