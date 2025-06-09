# DHL Styling Standardization Plan

I'll outline a strategy to standardize styling across your application using the DHL branding from `dhl_login/public/css/dhl-styles.css`.

## Step 1: File Analysis

The main files to update are in the `Public` directory, which currently use `styles.css`:

````html path=Public/index.html mode=EXCERPT
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sanitation Checklists</title>

    <link rel="stylesheet" href="styles.css">
    <script defer src="scripts.js"></script>
</head>
````

Similar patterns exist in other HTML files like `3_B_Cell_West_Side_Daily.html`, `4_B_Cell_East_Side_Daily.html`, etc.

## Step 2: Stylesheet Consolidation

Create a consolidated stylesheet that preserves necessary styles from both:

````css path=Public/dhl-unified.css mode=EDIT
/* DHL Unified Stylesheet - Combines dhl-styles.css with checklist-specific styles */

/* Core DHL Styles */
body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  margin: 0;
  background: linear-gradient(to bottom, #FFCC00, white);
  color: #333333;
  min-height: 100vh;
}

/* Container Styles */
.App {
  background: transparent;
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Header Styles */
.header {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 30px;
  margin-bottom: 30px;
}

.logo {
  height: 80px;
  max-width: 90%;
}

/* Button Styles */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
  text-decoration: none;
  border-radius: 5px;
  transition: background-color 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  box-sizing: border-box;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.btn-primary {
  background-color: #FFCC00; /* DHL Yellow */
  color: #333333;
}

.btn-primary:hover {
  background-color: #D40511; /* DHL Red */
  color: white;
}

/* Checklist-specific styles */
/* Add any unique styles from Public/styles.css that aren't in dhl-styles.css */
````

## Step 3: HTML Updates

Update all HTML files in the `Public` directory:

````html path=Public/index.html mode=EDIT
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sanitation Checklists</title>

    <link rel="stylesheet" href="dhl-unified.css">
    <script defer src="scripts.js"></script>
</head>
````

## Step 4: Class Standardization

Update class names to match DHL branding:

````html path=Public/index.html mode=EDIT
<body>
    <div class="App page-container">
        <header class="header page-header">
            <img src="dhl-logo.svg" alt="DHL Logo" class="logo">
        </header>

        <h1>Warehouse Sanitation Checklists</h1>

        <ul id="landing-page-menu" class="action-list">
            <!-- Checklist links will be dynamically generated here -->
        </ul>
    </div>
</body>
````

## Step 5: Implementation Plan

1. **Copy DHL Styles**: Copy `dhl-styles.css` to the `Public` directory
2. **Create Unified CSS**: Create the consolidated stylesheet
3. **Update HTML Files**: Modify all HTML files to use the new stylesheet
4. **Test Visuals**: Verify appearance across all pages
5. **Fix Conflicts**: Address any styling conflicts
6. **Responsive Testing**: Test on mobile and desktop views

## Step 6: Testing Checklist

- [ ] Login/authentication pages
- [ ] Dashboard
- [ ] Checklist index page
- [ ] Individual checklist pages
- [ ] Form inputs and validation
- [ ] Buttons and interactive elements
- [ ] Mobile responsiveness

This approach maintains visual consistency while preserving the unique functionality of the checklist application.
