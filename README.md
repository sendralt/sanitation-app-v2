# Sanitation Checks Application

## Overview

A web application for managing and validating warehouse sanitation checklists. It consists of a login/authentication service ([`dhl_login`](dhl_login:1)), a backend API ([`backend`](backend:1)) for data handling, and a frontend ([`Public`](Public:1)) for displaying and interacting with checklists.

The typical local development setup involves running two main services:
1.  **`dhl_login`**: Handles user authentication, session management, and serves the main application UI, including the checklist frontend from the [`Public`](Public:1) directory.
2.  **`backend`**: Provides APIs for checklist submission, validation, data retrieval, and email notifications.

## Prerequisites

*   Node.js (v16.x or later recommended)
*   npm (Node Package Manager, usually comes with Node.js)

## Installation

1.  **Clone the repository** (if you haven't already).
2.  **Install root dependencies:**
    Open a terminal in the project root directory and run:
    ```bash
    npm install
    ```
3.  **Install `dhl_login` service dependencies:**
    ```bash
    cd dhl_login
    npm install
    cd ..
    ```
4.  **Install `backend` service dependencies:**
    ```bash
    cd backend
    npm install
    cd ..
    ```

## Running the Application (Local Development)

Follow these steps in order to run the application locally:

### 1. Set up Environment Variables

You'll need to create `.env` files for configuration in their respective service directories. Template files are provided to help you get started.

*   **In the `dhl_login` directory:**
    ```bash
    cd dhl_login
    cp .env.example .env
    ```
    Edit the `.env` file and replace the placeholder values with your actual configuration. Key variables to set:
    - `SESSION_SECRET`: A strong, random string for session security
    - `JWT_SECRET`: A secure secret for JWT token signing (must match backend)
    - `BACKEND_API_URL`: URL for the backend API service (default: http://localhost:3001)
    - `SUPERVISOR_EMAIL`: Email address for receiving checklist notifications
    - `PORT`: Port for the dhl_login service (default: 3000)
    - `NODE_ENV`: Environment (development/production)

*   **In the `backend` directory:**
    ```bash
    cd backend
    cp .env.example .env
    ```
    Edit the `.env` file and replace the placeholder values. Key variables to set:
    - `JWT_SECRET`: Must match the JWT_SECRET in dhl_login/.env
    - `PORT`: Port for the backend service (default: 3001)
    - `EMAIL_USER`: Your Gmail address for sending notifications
    - `EMAIL_PASS`: Your Gmail App Password (see note below)
    - `SUPERVISOR_EMAIL`: Email address for receiving checklist notifications
    - `BASE_URL`: URL of the dhl_login application (default: http://localhost:3000)

    **Important Email Setup:** For `EMAIL_USER` and `EMAIL_PASS`, you'll need a Gmail account. If you have 2-Factor Authentication (2FA) enabled (recommended), you must generate an "App Password":
    1. Go to your Google Account settings
    2. Navigate to Security > 2-Step Verification > App passwords
    3. Generate a new app password for this application
    4. Use the generated password as `EMAIL_PASS`

    **Security Note:** Never commit your actual `.env` files to version control. The `.env.example` files are safe to commit as they contain no sensitive information.

    **Generate Secure Secrets:** Use the provided script to generate cryptographically secure secrets:
    ```bash
    node scripts/generate-secrets.js
    ```
    This will generate secure `SESSION_SECRET` and `JWT_SECRET` values that you can copy into your `.env` files.

### 2. Initialize/Sync the Database (for `dhl_login`)

This step creates the SQLite database file (if it doesn't exist) and runs migrations and seeders (e.g., to create an initial admin user).

*   Navigate to the `dhl_login` directory:
    ```bash
    cd dhl_login
    ```
*   Run the database synchronization script:
    ```bash
    npm run sync-db
    ```
    This command executes [`sync-db.js`](dhl_login/sync-db.js:1), which sets up the database and runs seeders like [`dhl_login/seeders/20250518192538-001-initial-admin-user.js`](dhl_login/seeders/20250518192538-001-initial-admin-user.js:1).
*   Navigate back to the project root directory:
    ```bash
    cd ..
    ```

### 3. Start the `dhl_login` Service

This service handles user authentication, sessions, and serves the main application UI including checklists.

*   In your terminal, navigate to the `dhl_login` directory:
    ```bash
    cd dhl_login
    ```
*   Start the server (it will typically run on `http://localhost:3000` as specified in [`app.js`](dhl_login/app.js:159)):
    ```bash
    node app.js
    ```
*   Keep this terminal window open and running.

### 4. Start the `backend` Service

This service provides APIs for checklist submission, validation, and data retrieval.

*   Open a **new terminal window or tab**.
*   Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
*   Start the server (it will typically run on `http://localhost:3001` as per its [`package.json`](backend/package.json:8) start script and [`server.js`](backend/server.js:16)):
    ```bash
    npm start
    ```
*   Keep this second terminal window open and running.

### 5. Accessing the Application

*   Open your web browser.
*   Navigate to: `http://localhost:3000`
*   You should be presented with the login page from the `dhl_login` application.
*   Log in using the credentials for the admin user. Default credentials can be found in the seeder file: [`dhl_login/seeders/20250518192538-001-initial-admin-user.js`](dhl_login/seeders/20250518192538-001-initial-admin-user.js:1).
*   After successful login, you'll be redirected to the dashboard, from where you can access and manage the sanitation checklists. The checklists themselves are served from the [`Public`](Public:1) directory via the `/app` route configured in [`dhl_login/app.js`](dhl_login/app.js:106).

## Directory Structure

*   `./` (Root Directory):
    *   [`README.md`](README.md:1): This file.
    *   [`package.json`](package.json:1): Root project dependencies.
    *   [`ubuntu_deployment_plan.md`](ubuntu_deployment_plan.md:1): Example deployment plan for Ubuntu.
*   `dhl_login/`: Handles user authentication, session management, and serves the main frontend application UI.
    *   [`app.js`](dhl_login/app.js:1): The main Express application file.
    *   [`package.json`](dhl_login/package.json:1): Dependencies and scripts for this service.
    *   `config/`: Configuration files (database, authentication).
    *   `data/`: Default location for the SQLite database (`auth.db`).
    *   `middleware/`: Custom middleware.
    *   `migrations/`: Database migration files.
    *   `models/`: Sequelize model definitions (e.g., `User`).
    *   `public/`: Static assets specific to `dhl_login` views (e.g., logo, CSS).
    *   `routes/`: Route definitions.
    *   `seeders/`: Database seeder files.
    *   `views/`: EJS templates for login, dashboard, etc.
*   `backend/`: The backend API service.
    *   [`server.js`](backend/server.js:1): The main Express application file for the API.
    *   [`package.json`](backend/package.json:1): Dependencies and scripts for this service.
    *   `data/`: (Created dynamically) Stores submitted checklist data as JSON files.
*   `Public/`: Contains all static frontend assets for the sanitation checklists.
    *   [`index.html`](Public/index.html:1): Main entry point for checklists (accessed via `/app/index.html` after login).
    *   HTML files for individual checklists (e.g., [`1_A_Cell_West_Side_Daily.html`](Public/1_A_Cell_West_Side_Daily.html:1)).
    *   [`styles.css`](Public/styles.css:1): CSS for checklists.
    *   [`scripts.js`](Public/scripts.js:1): JavaScript for checklist interactivity.

## Deployment Overview

The two-service setup (`dhl_login` and `backend`) described above is typical for local development. For some production or server deployment scenarios, the application might be configured differently. For instance, the `backend` service could be adapted to also handle user authentication and serve all frontend static assets (from both `dhl_login/public` and `Public/`) directly.

For a detailed example of deploying a streamlined version of the application to an Ubuntu server using PM2 (where the `backend` component is the primary service), please refer to the [`ubuntu_deployment_plan.md`](ubuntu_deployment_plan.md:1) document in the root of this project.