#!/bin/bash

# Certbot Renewal Hook for DHL Sanitation App
# This script is called automatically when Certbot renews certificates
# Place this in /etc/letsencrypt/renewal-hooks/deploy/

# Run the SSL certificate update script
/var/www/sanitation-app/scripts/update-ssl-certificates.sh

# Log the renewal
echo "$(date): SSL certificates updated for DHL Sanitation App" >> /var/log/certbot-renewal.log
