#!/bin/bash
# Copy the repaired config file to the Nginx sites-available directory
sudo cp ./sanitation-app-repaired.conf /etc/nginx/sites-available/sanitation-app-repaired.conf

# Remove old symlinks to prevent conflicts
sudo rm -f /etc/nginx/sites-enabled/sanitation-app.conf
sudo rm -f /etc/nginx/sites-enabled/sanitation-app-repaired.conf

# Create the new symlink for the repaired configuration
sudo ln -s /etc/nginx/sites-available/sanitation-app-repaired.conf /etc/nginx/sites-enabled/

# Test the Nginx configuration
sudo nginx -t

# If the test is successful, reload Nginx
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "Nginx reloaded successfully."
else
    echo "Nginx configuration test failed."
fi