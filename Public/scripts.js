// Global variables for JWT and user data
let authToken = null;
let currentUser = null;

// Function to fetch JWT from the server (dhl_login)
async function fetchAuthToken() {
    // This function should only be called if not on the main landing page
    // and the user is expected to be session-authenticated.
    try {
        const response = await fetch('/api/auth/issue-jwt-for-session'); // Relative to dhl_login server
        if (!response.ok) {
            if (response.status === 401) {
                console.error('[Debug] fetchAuthToken: Session not authenticated to get JWT (401). User should be redirected to login by server.');
                // Redirect to login page if not authenticated
                window.location.href = '/login-page';
            } else {
                console.error(`[Debug] fetchAuthToken: Failed to fetch JWT. Status: ${response.status}, Text: ${response.statusText}`);
            }
            return false; // Return false to indicate failure
        }
        const data = await response.json();
        authToken = data.token;
        currentUser = data.user;
        console.log('[Debug] fetchAuthToken: JWT acquired successfully for user:', currentUser.username);
        return true; // Return true to indicate success
    } catch (error) {
        console.error('[Debug] fetchAuthToken: Error acquiring JWT:', error);
        return false;
    }
}

// Function to update the navbar with user information
function updateNavbar(user) {
    const userNavInfo = document.getElementById('user-nav-info');
    if (userNavInfo && user) {
        userNavInfo.innerHTML = `
            <span>Hi, ${user.username}</span>
            | <a href="/logout-page">Logout</a>
        `;
        userNavInfo.style.display = 'block';
    } else if (userNavInfo) {
        userNavInfo.style.display = 'none';
    }
}

// Function to check authentication status on main page
async function checkAuthenticationStatus() {
    try {
        const response = await fetch('/api/auth/issue-jwt-for-session');
        if (response.ok) {
            const data = await response.json();
            authToken = data.token;
            currentUser = data.user;
            console.log('[Debug] User is authenticated:', currentUser.username);

            // Update navbar with user info
            updateNavbar(currentUser);

            // Show checklist menu and hide login section
            const landingPageMenu = document.querySelector("#landing-page-menu");
            const authSection = document.querySelector(".auth-section");

            if (landingPageMenu) {
                landingPageMenu.style.display = "block";
            }
            if (authSection) {
                authSection.style.display = "none";
            }

            return true;
        } else {
            console.log('[Debug] User is not authenticated');
            return false;
        }
    } catch (error) {
        console.error('[Error] Failed to check authentication status:', error);
        return false;
    }
}


document.addEventListener("DOMContentLoaded", function() {
    console.log('[Debug] DOMContentLoaded event fired.');
    // Elements for the landing page
    const landingPageMenu = document.querySelector("#landing-page-menu");

    // If on the main landing page, check authentication status
    if (landingPageMenu) {
        console.log('[Debug] On main landing page, checking authentication...');
        checkAuthenticationStatus();
    }
    // If on a checklist page (not the main index.html menu), try to fetch the JWT
    else if (window.location.pathname.startsWith('/app/') && window.location.pathname !== '/app/index.html') {
        console.log('[Debug] On checklist page, fetching auth token...');
        fetchAuthToken();
    }

    // Form Elements
    const nameInput = document.getElementById("name");
    const dateInput = document.getElementById("date");
    const commentsTextarea = document.getElementById("comments");
    const addCommentsButton = document.querySelector(".button input[value='Add Comments']");
    const submitButton = document.querySelector(".button input[value='Submit']");
    const commentsSection = document.querySelector(".comments");
    //const auditorNameInput = document.getElementById("auditorName");
    const taskContainer = document.querySelector(".task-container");

    // List of checklist filenames
    const checklists = [
        "1_A_Cell_West_Side_Daily.html",
        "2_A_Cell_East_Side_Daily.html",
        "3_B_Cell_West_Side_Daily.html",
        "4_B_Cell_East_Side_Daily.html",
        "5_C_Cell_West_Side_Daily.html",
        "6_C_Cell_East_Side_Daily.html",
        "7_D_Cell_West_Side_Daily.html",
        "8_D_Cell_East_Side_Daily.html",
        "9_E_Cell_West_Side_Daily.html",
        "10_E_Cell_East_Side_Daily.html",
        "11_F_Cell_West_Side_Daily.html",
        "12_F_Cell_East_Side_Daily.html",
        "13_All_Cells_Weekly.html",
        "14_All_Cells_Weekly.html",
        "15_A&B_Cells_LL_Quarterly.html",
        "16_D_Cell_LL_Quarterly.html",
        "17_A_Cell_High_Level_Quarterly.html",
        "18_B_Cell_High_Level_Quarterly.html",
        "19_C_Cell_High_Level_Quarterly.html",
        "20_D_Cell_High_Level_Quarterly.html",
        "21_E_Cell_High_Level_Quarterlyl.html",
        "22_F_Cell_High_Level_Quarterlyl.html"
    ];

    // Generate checklist menu if on the landing page
    if (landingPageMenu) {
        checklists.forEach(checklist => {
            const listItem = document.createElement("li");
            const link = document.createElement("a");
            link.href = checklist;
            link.textContent = `Checklist # ${checklist.replace(".html", "").replace(/_/g, " ")}`;
            listItem.appendChild(link);
            landingPageMenu.appendChild(listItem);
        });
    }

    // --- Barcode/Scanner Functionality START ---
    console.log('[Debug] Attempting to get scannerInput element.');
    const scannerInput = document.getElementById('scannerInput');
    console.log('[Debug] scannerInput element found:', scannerInput);

    function handleScannerInput() {
        console.log('[Debug] handleScannerInput called.');
        if (!scannerInput) {
            console.log('[Debug] scannerInput is null or undefined in handleScannerInput. Aborting scanner setup.');
            return;
        }
        console.log('[Scanner] handleScannerInput initialized.');

        const messageArea = document.createElement('div');
        messageArea.id = 'scanner-message';
        messageArea.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 1000;
        `;
        document.body.appendChild(messageArea);
        messageArea.style.display = 'none';

        function showMessage(message, duration = 3000) {
            messageArea.textContent = message;
            messageArea.style.display = 'block';
            setTimeout(() => {
                messageArea.style.display = 'none';
            }, duration);
        }

        scannerInput.addEventListener('keydown', function(event) {
            console.log(`[Scanner] keydown event on scannerInput. Key: ${event.key}, Code: ${event.code}`); // Log any keydown
            if (event.key === 'Enter') {
                console.log('[Scanner] Enter key detected.');
                event.preventDefault(); // Prevent default form submission if any
                const scannedValue = scannerInput.value.trim();
                console.log('[Scanner] Scanned Value (trimmed):', scannedValue);

                if (scannedValue) {
                    console.log('[Scanner] Attempting to find checkbox with ID:', scannedValue);

                    // Try to find the checkbox by ID
                    let targetCheckbox = document.getElementById(scannedValue);
                    console.log('[Scanner] Result of getElementById:', targetCheckbox);

                    // If not found and the scanned value contains spaces, try escaping them
                    if (!targetCheckbox && scannedValue.includes(' ')) {
                        console.log('[Scanner] ID contains spaces, trying CSS selector approach');
                        try {
                            // Use CSS selector to handle IDs with spaces
                            targetCheckbox = document.querySelector(`input[id="${scannedValue}"]`);
                            console.log('[Scanner] Result of querySelector with spaces:', targetCheckbox);
                        } catch (error) {
                            console.warn('[Scanner] Error with querySelector:', error);
                        }
                    }

                    if (targetCheckbox && targetCheckbox.type === 'checkbox') {
                        targetCheckbox.checked = !targetCheckbox.checked;
                        console.log('[Scanner] Checkbox found and toggled:', targetCheckbox.id);

                        // Visual feedback
                        const parentElement = targetCheckbox.closest('div'); // Assuming checkbox is in a div
                        if (parentElement) {
                            parentElement.classList.add('highlight-scan');
                            setTimeout(() => {
                                parentElement.classList.remove('highlight-scan');
                            }, 1000); // Highlight for 1 second
                        }

                        // Show success message
                        showMessage(`✅ Scanned: ${targetCheckbox.id}`, 1500);
                    } else {
                        console.warn("[Scanner] Scanned ID not found or not a checkbox:", scannedValue);
                        showMessage("❌ Checkbox ID not found: " + scannedValue, 2000);
                    }
                }
                scannerInput.value = ""; // Clear input for next scan
                setTimeout(() => scannerInput.focus(), 0); // Re-focus for next scan, deferred slightly
                console.log('[Scanner] Re-focused on scannerInput after scan (using setTimeout).');
            }
        });

        scannerInput.addEventListener('blur', function(event) {
            console.log('[Debug] scannerInput BLUR event. Current activeElement:', document.activeElement, 'RelatedTarget (what gained focus, if available):', event.relatedTarget);
            // If focus is lost to something other than itself, try to refocus.
            // This check helps prevent potential infinite loops if refocusing itself triggers another blur.
            if (document.activeElement !== scannerInput) {
                console.log('[Debug] scannerInput lost focus to something else. Attempting to re-focus scannerInput.');
                // scannerInput.focus(); // Intentionally commented out to allow focus on other fields
                console.log('[Debug] Active element after trying to re-focus scannerInput in blur handler (scannerInput.focus() is now commented out):', document.activeElement);
            }
        });
        // DELAYED Initial focus
        setTimeout(() => {
            console.log('[Debug] Attempting DELAYED focus on scannerInput (after 200ms).');
            scannerInput.focus();
            console.log('[Scanner] DELAYED Initial focus set on scannerInput.');
            console.log('[Debug] Active element immediately after DELAYED scannerInput.focus():', document.activeElement);
        }, 200);
    }

    // Call scanner setup if not on landing page
    // (assuming scannerInput will only exist on checklist pages)
    if (scannerInput) {
        handleScannerInput(); // This will now set up listeners and the delayed focus
        setTimeout(() => {
            // This log will now effectively check ~300ms after the delayed focus attempt
            console.log('[Debug] Active element 500ms after handleScannerInput call (and ~300ms after delayed focus attempt):', document.activeElement);
        }, 500);
    } else {
        console.log('[Debug] scannerInput element was not found in DOMContentLoaded. Scanner not initialized.');
    }
    // --- Barcode/Scanner Functionality END ---

    // Function to gather checkbox states
    function getCheckboxStates() {
        const sections = document.querySelectorAll('section');
        const checkboxData = {}; // This will be the nested object

        sections.forEach(section => {
            // Get the heading text of the section, assuming h2 or h3
            const headingElement = section.querySelector('h2, h3');
            const headingText = headingElement ? headingElement.textContent.trim() : 'Unnamed Section'; // Fallback for sections without headings

            checkboxData[headingText] = {}; // Create an entry for the heading

            const checkboxesInSection = section.querySelectorAll('input[type="checkbox"]:not(.select-all)');
            if (checkboxesInSection.length > 0) {
                checkboxesInSection.forEach(checkbox => {
                    if (checkbox.id) { // Ensure the checkbox has an ID
                        let labelText = checkbox.id; // Default to ID if no label is found
                        const labelElement = section.querySelector(`label[for="${checkbox.id}"]`); // Search label within the section
                        if (labelElement) {
                            labelText = labelElement.textContent.trim();
                        }
                        // Store checkbox data under its heading
                        checkboxData[headingText][checkbox.id] = {
                            checked: checkbox.checked,
                            label: labelText
                        };
                    } else {
                        console.warn("Checkbox found without an ID within section:", headingText, checkbox);
                    }
                });
            } else {
            }
        });
        return checkboxData;
    }

    // Validate Form
    function validateForm() {
        let isValid = true;
        if (nameInput && nameInput.value.trim() === "") {
            alert("Name is required.");
            isValid = false;
        }
        if (dateInput && dateInput.value === "") {
            alert("Date is required.");
            isValid = false;
        }
        return isValid;
    }

    // Email validation helper function
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email.toLowerCase());
    }

    // Add Comment
    function addComment() {
        if (commentsTextarea && commentsTextarea.value.trim() !== "") {
            const newComment = document.createElement("p");
            newComment.textContent = commentsTextarea.value;
            commentsSection.appendChild(newComment);
            commentsTextarea.value = ""; // Clear the textarea
        } else {
            alert("Please enter a comment before adding.");
        }
    }

    // Function to redirect to the menu page
    function goToMenu() {
        window.location.href = "index.html"; 
    }

    // Save Data to Backend
    async function saveData() {
        // Wait for configuration to be loaded and get supervisor email
        let supervisorEmail;
        try {
            if (window.AppConfig && window.AppConfig.waitForConfig) {
                await window.AppConfig.waitForConfig();
                supervisorEmail = window.AppConfig.getSupervisorEmail();
            } else {
                // Fallback if config module is not available
                supervisorEmail = 'supervisor@company.com';
                console.warn('[saveData] Config module not available, using fallback email');
            }
        } catch (error) {
            console.error('[saveData] Failed to load configuration for supervisor email:', error);
            supervisorEmail = 'supervisor@company.com';
        }

        const data = {
            title: document.title,
            name: nameInput.value,
            date: dateInput.value,
            checkboxes: getCheckboxStates(),
            comments: commentsTextarea.value,
            //auditorName: auditorNameInput.value,
            //supervisorName: supervisorName.value,
            supervisorEmail: supervisorEmail,
        };

        if (!authToken) {
            alert('Authentication token is not available. Please ensure you are properly logged in.');
            console.error('Auth token not available for saveData.');
            return Promise.reject(new Error('Auth token not available.')); // Prevent submission
        }

        // Wait for configuration to be loaded and get backend API URL
        let backendApiUrl;
        try {
            if (window.AppConfig && window.AppConfig.waitForConfig) {
                await window.AppConfig.waitForConfig();
                backendApiUrl = window.AppConfig.getBackendApiUrl();
            } else {
                // Fallback if config module is not available
                backendApiUrl = window.AppConfig.getBackendApiUrl();
                console.warn('[saveData] Config module not available, using fallback URL');
            }
        } catch (error) {
            console.error('[saveData] Failed to load configuration:', error);
            backendApiUrl = window.AppConfig.getBackendApiUrl();
        }

        console.log('[Debug] saveData: Using backend URL:', backendApiUrl);
        return fetch(`${backendApiUrl}/submit-form`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` // Add JWT to Authorization header
            },
            body: JSON.stringify(data)
        })
        .then(async response => { // Made this an async function
            if (!response.ok) {
                // Log more details from the response
                const errorText = await response.text(); // Attempt to get error text from server
                console.error(`[Debug] saveData: Network response was not ok. Status: ${response.status}, StatusText: ${response.statusText}, ServerResponse: ${errorText}`);
                throw new Error(`Network response was not ok. Status: ${response.status}. Server message: ${errorText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
            alert(data.message); // Provide user feedback
        })
        .catch((error) => {
            console.error('[Debug] saveData: Error caught in fetch chain:', error.message, error);
            // Display a more informative error if possible, or fall back to generic
            const displayError = error.message.includes("Server message:") ? error.message : 'An error occurred while submitting the form. Check console for details.';
            alert(displayError);
            throw error; // Propagate the error for further handling
        });
    }

    // Event Listener for Add Comments Button
    if (addCommentsButton) {
        addCommentsButton.addEventListener("click", function(event) {
            event.preventDefault(); // Prevent default action if it's a submit button
            if (validateForm()) {
                addComment(); // Add the comment only, do not save form data
            }
        });
    }

    // Event Listener for Submit Button
    if (submitButton) {
        submitButton.addEventListener("click", function(event) {
            event.preventDefault(); // Prevent default form submission
            if (validateForm()) {
                submitButton.disabled = true; // Disable the button to prevent multiple clicks
                saveData().then(() => {
                    goToMenu(); // Redirect to the menu page after saving data
                }).catch(() => {
                    submitButton.disabled = false; // Re-enable the button on failure
                });
            }
        });
    }

    // Event listener for the Back/Menu button
    //const backButton = document.getElementById("backButton");
    //if (backButton) {
    //    backButton.addEventListener("click", function() {
    //        window.location.href = "index.html"; // Replace with the correct URL of your landing page
    //    });
    //}

    // Select All Functionality (inside DOMContentLoaded)
    //document.querySelectorAll('.select-all').forEach(selectAllRadio => {
    //    selectAllRadio.addEventListener('change', function(event) {
    //        const section = event.target.closest('.section');
    //        if (section) { // Ensure section exists
    //            const checkboxes = section.querySelectorAll('input[type="checkbox"]:not(.select-all)');
    //            checkboxes.forEach(checkbox => {
    //                checkbox.checked = true;
//                });
//            }
//        });
//
});

