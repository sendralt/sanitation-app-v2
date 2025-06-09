# Deployment Plan: Sanitation Checklist App on Ubuntu 24.04

**Goal:** Deploy the Sanitation Checklist application's backend service to an Ubuntu 24.04 server. This single service will handle API requests, data storage, email notifications, user authentication, and serve all frontend static assets (HTML, CSS, JS from the `Public/` directory, and UI for login/dashboard). The application will be accessible via the server's IP address on a specified port (e.g., 3000 or 3001), managed by PM2.

**Important Note on Service Consolidation:**
This deployment plan assumes a **consolidated service model**. Unlike the local development setup which uses two separate services (`dhl_login` and `backend`), this plan outlines deploying a *single, modified Node.js application* (likely an evolution of the `backend/server.js` or `dhl_login/app.js`) that incorporates the functionalities of both. This means the deployed `server.js` (or equivalent main application file) must be capable of:
1.  Handling all API endpoints for checklist data.
2.  Managing user authentication (login, sessions, JWTs).
3.  Serving static files from the `Public/` directory (for checklists).
4.  Serving static files and views for the main UI (login pages, dashboard, admin pages, etc., previously handled by `dhl_login`).
5.  Initializing and managing the authentication database (e.g., SQLite).

If the application has not been refactored into such a single service, this plan will need significant adjustments, or a more complex deployment strategy involving running and managing two separate Node.js processes with PM2 would be required.

**Prerequisites:**
*   SSH access to a fresh Ubuntu 24.04 server.
*   The application code (the consolidated service, `Public/` directory, database models, migrations, seeders, views, etc.) ready for transfer.
*   Gmail credentials (`EMAIL_USER` and `EMAIL_PASS` - preferably an App Password) for email notifications.
*   A `JWT_SECRET` for token signing.
*   A `SESSION_SECRET` for session management.

---

## Phase 1: Server Preparation & Prerequisite Installation

1.  **Connect to Server:**
    *   SSH into your Ubuntu server: `ssh your_username@your_server_ip`

2.  **Update System Packages:**
    *   Ensure all system packages are up-to-date.
        ```bash
        sudo apt update
        sudo apt upgrade -y
        ```

3.  **Install Node.js and npm:**
    *   Install Node.js (e.g., LTS version, Node.js 20.x or as per project needs).
        ```bash
        sudo apt install -y ca-certificates curl gnupg
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
        NODE_MAJOR=20 # Or your desired major version
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list
        sudo apt update
        sudo apt install nodejs -y
        ```
    *   Verify installation:
        ```bash
        node -v
        npm -v
        ```

4.  **Install PM2 (Process Manager for Node.js):**
    *   PM2 will keep your application running and manage restarts.
        ```bash
        sudo npm install pm2 -g
        ```
    *   Verify installation:
        ```bash
        pm2 --version
        ```

5.  **Configure Firewall (UFW):**
    *   Allow SSH, and the port your application will run on (e.g., 3000).
        ```bash
        sudo ufw allow OpenSSH
        sudo ufw allow 3000/tcp  # Adjust if your app runs on a different port
        sudo ufw enable
        sudo ufw status
        ```
    *   Answer `y` to enable UFW.

---

## Phase 2: Application Deployment & Configuration

1.  **Create Application Directory:**
    *   Create a directory to hold your application code.
        ```bash
        sudo mkdir -p /var/www/sanitation-app
        sudo chown $USER:$USER /var/www/sanitation-app # Give your user ownership
        cd /var/www/sanitation-app
        ```

2.  **Transfer Application Files:**
    *   Use `scp` or `rsync` to copy your entire consolidated project (e.g., the contents of `SanitationChecksLatest/` excluding `node_modules` and local `.env` files) to `/var/www/sanitation-app/` on the server.
    *   **Example using `scp` (run from your local machine):**
        ```bash
        scp -r /path/to/your/local/consolidated-SanitationChecksLatest/* your_username@your_server_ip:/var/www/sanitation-app/
        ```
    *   Ensure all necessary directories are transferred: the main application logic, `Public/`, `views/`, `models/`, `config/`, `migrations/`, `seeders/`, `package.json`, etc.
    *   **Important:** Do NOT transfer local `node_modules` or `.env` files.

3.  **Install Application Dependencies:**
    *   Navigate to the application directory on the server and install dependencies.
        ```bash
        cd /var/www/sanitation-app
        npm install --production # Install only production dependencies
        ```

4.  **Configure Environment Variables:**
    *   Create a `.env` file in the `/var/www/sanitation-app/` directory (or wherever your consolidated app expects it, e.g., `/var/www/sanitation-app/config/.env`).
        ```bash
        cd /var/www/sanitation-app
        nano .env # Or nano config/.env
        ```
    *   Add your configuration (replace placeholders):
        ```env
        NODE_ENV=production
        PORT=3000 # Or the port you configured in UFW
        SESSION_SECRET=your_production_session_secret_here
        JWT_SECRET=your_production_jwt_secret_here # Ensure this is strong
        DB_PATH=/var/www/sanitation-app/data/auth.db # Example production path for SQLite DB
        EMAIL_USER=your_gmail_address@gmail.com
        EMAIL_PASS=your_gmail_app_password
        BASE_URL=http://your_server_ip:3000 # Publicly accessible URL of the app
        # Add any other necessary environment variables for your consolidated app
        ```
    *   **Security:**
        *   Use strong, unique secrets for `SESSION_SECRET` and `JWT_SECRET`.
        *   For Gmail, use an "App Password".
        *   Restrict permissions for the `.env` file: `chmod 600 .env`

5.  **Create Data Directories and Set Permissions:**
    *   Ensure directories for data storage (like SQLite DB, checklist JSONs) exist and are writable by the Node.js process.
        ```bash
        cd /var/www/sanitation-app
        mkdir -p data # For SQLite DB, if DB_PATH points here
        mkdir -p backend/data # If checklist data is still saved here by the consolidated app
        # Adjust paths and ownership as needed. If PM2 runs as your user, permissions might be fine.
        # If PM2 runs as 'www-data', you might need:
        # sudo chown -R www-data:www-data data backend/data
        # sudo chmod -R 755 data backend/data
        ```

6.  **Initialize/Sync Database (If Applicable):**
    *   If your consolidated application has a database sync/migration/seeding script (similar to `dhl_login/sync-db.js`), run it.
        ```bash
        cd /var/www/sanitation-app
        # Example: npm run sync-db-prod (assuming you have such a script in your package.json)
        # Or: node scripts/sync-database.js
        ```
    *   This step is crucial for setting up the `auth.db` and any initial user data.

---

## Phase 3: Running the Application with PM2

1.  **Start the Application using PM2:**
    *   Navigate to your application directory.
        ```bash
        cd /var/www/sanitation-app
        ```
    *   Start your main application file (e.g., `app.js` or `server.js`) with PM2:
        ```bash
        # Replace 'app.js' with your actual main server file if different
        pm2 start app.js --name sanitation-app-prod --env production
        ```
    *   `--name sanitation-app-prod` gives a recognizable name.
    *   `--env production` ensures PM2 sets `NODE_ENV=production` if not already picked up from `.env`.

2.  **Check Application Status:**
    *   View status and logs:
        ```bash
        pm2 list
        pm2 logs sanitation-app-prod
        ```

3.  **Enable PM2 Startup Script:**
    *   To ensure PM2 restarts your application on server reboots:
        ```bash
        pm2 startup systemd
        ```
    *   PM2 will output a command. Copy and execute it with `sudo`.
    *   Save the current PM2 process list:
        ```bash
        pm2 save
        ```

---

## Phase 4: Accessing and Testing the Application

1.  **Access the Application:**
    *   Open your web browser and navigate to `http://your_server_ip:PORT` (e.g., `http://your_server_ip:3000`).
    *   You should see your application's login page or main interface.

2.  **Test Functionality Thoroughly:**
    *   User registration (if applicable) and login.
    *   Dashboard access and navigation.
    *   Checklist form submissions.
    *   Verify data is being saved correctly (e.g., in the SQLite DB and JSON files).
    *   Check that supervisor emails are being sent and validation links work.
    *   Test all critical user flows.

---

## Phase 5: Future Considerations & Maintenance

1.  **HTTPS/SSL Setup (Crucial for Production):**
    *   Obtain a domain name.
    *   Use a reverse proxy like Nginx or Apache.
    *   Configure the reverse proxy to handle HTTPS (port 443) and forward requests to your Node.js app (e.g., `http://localhost:3000`).
    *   Use Let's Encrypt for free SSL certificates.

2.  **Data Backups:**
    *   Implement a strategy for backing up the SQLite database (`auth.db`) and any JSON data files.

3.  **Log Management:**
    *   PM2 handles basic logging. For advanced needs, explore `logrotate` or cloud-based logging services.

4.  **Security Hardening:**
    *   Regularly update server packages, Node.js, and npm dependencies (`npm audit`).
    *   Review firewall rules and minimize open ports.
    *   Implement security headers via your reverse proxy or application.

---

## High-Level Deployment Diagram (Consolidated Service)

```mermaid
graph TD
    A[User's Browser] -- HTTP/S Request (IP:PORT or Domain) --> B(Ubuntu Server);
    B -- Port (e.g., 3000 UFW) / Reverse Proxy (Nginx/Apache for HTTPS) --> C{PM2};
    C -- Manages --> D[Consolidated Node.js App (app.js/server.js)];
    D -- Serves Static Files & Views --> E[Public/ (Checklists) & views/ (UI)];
    D -- Reads/Writes --> F[data/auth.db (SQLite)];
    D -- Reads/Writes --> G[backend/data/ (JSON files, if still used)];
    D -- Uses --> H[Nodemailer];
    H -- SMTP over TLS --> I[Gmail SMTP Server];

    subgraph Ubuntu Server
        direction LR
        B
        C
        D
        E
        F
        G
    end