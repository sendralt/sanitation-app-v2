# Production Deployment Plan: Sanitation Checklist App

**1. Overview**
    *   Application: Two Node.js applications (`dhl_login` for frontend/auth, `backend` for API/data).
    *   Deployment Environment: Ubuntu Server.
    *   Access: `https://dot1hundred.com` (via Nginx with SSL).
    *   Key Technologies: Node.js, Express, EJS, SQLite, Nginx, PM2.

**2. Architecture Diagram**
    ```mermaid
    graph TD
        User[Internet User] -- HTTPS via dot1hundred.com --> Nginx[Nginx Reverse Proxy on Ubuntu Server];

        Nginx -- / --> DhlLoginApp[dhl_login (Node.js on localhost:3000)];
        Nginx -- /api/ --> BackendApp[backend (Node.js on localhost:3001)];

        DhlLoginApp <--> SQLite[SQLite Database (dhl_login/data/auth.db)];
        DhlLoginApp -- Serves /app/* --> PublicAssets[Public/ Static Assets (HTML, CSS, JS for checklists)];
        DhlLoginApp -- Issues/Validates JWT --> User;

        BackendApp -- Reads/Writes --> JsonData[JSON Data (backend/data/*.json)];
        BackendApp -- Sends Email --> Gmail[Gmail SMTP];
        BackendApp -- Authenticates via JWT from DhlLoginApp --> DhlLoginApp;

        PublicAssets -- AJAX Calls to /api/ --> BackendApp;
        Gmail -- Validation Link (https://dot1hundred.com/app/validate-checklist/:id) --> User;
    ```

**3. Prerequisites**
    *   SSH access to the Ubuntu server with sudo privileges.
    *   Node.js (e.g., LTS version) and npm installed.
    *   Git installed.
    *   PM2 (Node.js process manager) installed globally (`npm install pm2 -g`).
    *   Nginx installed and running.

**4. Environment Variables & Configuration**
    *   **General:**
        *   `NODE_ENV=production` for both apps.
        *   `JWT_SECRET`: Must be a strong, shared secret for both `dhl_login` and `backend`.
    *   **`dhl_login` Application (`dhl_login/.env`)**
        *   `PORT=3000` (internal port, Nginx proxies to it)
        *   `SESSION_SECRET`: Strong unique secret.
        *   `BACKEND_API_URL=https://dot1hundred.com/api` (URL for backend API via nginx proxy)
        *   `SUPERVISOR_EMAIL`: Email address for receiving checklist notifications
        *   Database path: Default is `dhl_login/data/auth.db`.
    *   **`backend` Application (`backend/.env`)**
        *   `PORT=3001` (internal port, Nginx proxies to it)
        *   `BASE_URL=http://98.123.244.251`
        *   `EMAIL_USER`: Your Gmail address.
        *   `EMAIL_PASS`: Your Gmail App Password (recommended for security).
        *   `SUPERVISOR_EMAIL`: Email address for receiving checklist notifications
        *   Data path: Default is `backend/data/`.

**5. Deployment Steps**
    *   **A. Prepare Server & Code:**
        1.  Connect to Ubuntu server via SSH.
        2.  Create a main deployment directory if it doesn't exist (e.g., `/srv/sanitation-app`).
        3.  Clone or pull the latest application code into `/srv/sanitation-app`.
    *   **B. Deploy `dhl_login` Application:**
        1.  Navigate to `/srv/sanitation-app/dhl_login`.
        2.  Create/update `.env` file with production values.
        3.  Install dependencies: `npm install --production`.
        4.  Run database sync/migrations: `npm run sync-db`.
        5.  Start/Restart with PM2: `pm2 restart dhl-login-app || pm2 start app.js --name dhl-login-app`.
    *   **C. Deploy `backend` Application:**
        1.  Navigate to `/srv/sanitation-app/backend`.
        2.  Create/update `.env` file with production values.
        3.  Ensure `backend/data/` directory exists and is writable by the Node.js process.
        4.  Install dependencies: `npm install --production`.
        5.  Start/Restart with PM2: `pm2 restart backend-api || pm2 start server.js --name backend-api`.
    *   **D. Save PM2 Processes:**
        1.  `pm2 save` (to make processes restart on server reboot).
    *   **E. Verify Nginx Configuration:**
        1.  Since Nginx is "already set up," review its configuration to ensure:
            *   It listens on port 80 for IP `98.123.244.251`.
            *   Requests to `/` are proxied to `http://localhost:3000` (for `dhl_login`).
            *   Requests to a dedicated API path (e.g., `/api/`) are proxied to `http://localhost:3001` (for `backend`).
            *   Headers like `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` are correctly set.
            *   Consider SSL/HTTPS setup for security (e.g., using Let's Encrypt if a domain name is used in the future). For IP-only, self-signed might be an option but browsers will warn.
        2.  Reload Nginx if any verification leads to changes: `sudo systemctl reload nginx`.

**6. Testing**
    *   Access `http://98.123.244.251` in a browser.
    *   Test user login/logout.
    *   Test accessing authenticated pages (e.g., dashboard, `/app/index.html`).
    *   Submit a checklist form.
    *   Verify email notification is received by the supervisor.
    *   Test the supervisor validation link from the email.
    *   Verify data is saved correctly in `backend/data/` and updated after validation.

**7. Maintenance & Operations**
    *   **Logging:** Monitor application logs (via PM2 logs: `pm2 logs dhl-login-app` / `pm2 logs backend-api`) and Nginx logs.
    *   **Backups:**
        *   Regularly back up the SQLite database: `dhl_login/data/auth.db`.
        *   Regularly back up the JSON data directory: `backend/data/`.
    *   **Updates:** For application updates, repeat relevant deployment steps (pull code, install deps, restart PM2 processes).
    *   **Security:** Keep server and packages updated. Ensure firewall (e.g., `ufw`) is configured to allow only necessary ports (SSH, HTTP/HTTPS).

**8. Rollback Plan**
    *   Identify the previous working commit/tag in Git.
    *   Stop current PM2 processes: `pm2 stop dhl-login-app backend-api`.
    *   Checkout the previous version of the code for both applications.
    *   Re-run `npm install --production` if dependencies changed significantly.
    *   Restart PM2 processes.
    *   Restore database/data from the latest backup if data corruption occurred.