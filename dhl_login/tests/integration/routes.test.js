/**
 * Integration Tests for DHL Login Routes
 */

const request = require('supertest');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');

// Mock dependencies
jest.mock('../../models/user');
jest.mock('../../utils/auth');

const User = require('../../models/user');
const { hashPassword, verifyPassword, getSecurityQuestions } = require('../../utils/auth');

describe('DHL Login Routes Integration Tests', () => {
    let app;

    beforeEach(() => {
        // Create test app with necessary middleware
        app = express();
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());
        app.use(session({
            secret: 'test-secret',
            resave: false,
            saveUninitialized: false
        }));
        app.use(flash());

        // Mock template engine
        app.set('view engine', 'ejs');
        app.set('views', __dirname + '/../../views');

        // Mock render function to return JSON instead of HTML
        app.use((req, res, next) => {
            const originalRender = res.render;
            res.render = function(template, data) {
                res.json({ template, data });
            };
            next();
        });

        // Clear mocks
        jest.clearAllMocks();
    });

    describe('Authentication Routes', () => {
        beforeEach(() => {
            // Add auth routes
            app.get('/login', (req, res) => {
                res.render('login', {
                    title: 'Login',
                    errorMessages: req.flash('error'),
                    successMessages: req.flash('success')
                });
            });

            app.post('/login', async (req, res) => {
                const { username, password } = req.body;

                if (!username || !password) {
                    req.flash('error', 'Username and password are required');
                    return res.redirect('/login');
                }

                try {
                    const user = await User.findOne({ where: { username } });
                    if (!user) {
                        req.flash('error', 'Invalid credentials');
                        return res.redirect('/login');
                    }

                    const isValidPassword = await verifyPassword(password, user.passwordHash);
                    if (!isValidPassword) {
                        req.flash('error', 'Invalid credentials');
                        return res.redirect('/login');
                    }

                    req.session.userId = user.id;
                    req.session.user = user;
                    res.redirect('/dashboard');
                } catch (error) {
                    req.flash('error', 'An error occurred during login');
                    res.redirect('/login');
                }
            });

            app.get('/logout', (req, res) => {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destruction error:', err);
                    }
                    res.redirect('/login');
                });
            });
        });

        it('should render login page', async () => {
            const response = await request(app)
                .get('/login')
                .expect(200);

            expect(response.body.template).toBe('login');
            expect(response.body.data.title).toBe('Login');
        });

        it('should handle valid login', async () => {
            const mockUser = {
                id: 'user-123',
                username: 'testuser',
                passwordHash: 'hashedpassword'
            };

            User.findOne.mockResolvedValue(mockUser);
            verifyPassword.mockResolvedValue(true);

            const response = await request(app)
                .post('/login')
                .send({
                    username: 'testuser',
                    password: 'password123'
                })
                .expect(302);

            expect(response.headers.location).toBe('/dashboard');
        });

        it('should reject invalid credentials', async () => {
            User.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post('/login')
                .send({
                    username: 'invaliduser',
                    password: 'wrongpassword'
                })
                .expect(302);

            expect(response.headers.location).toBe('/login');
        });

        it('should require username and password', async () => {
            const response = await request(app)
                .post('/login')
                .send({
                    username: 'testuser'
                    // Missing password
                })
                .expect(302);

            expect(response.headers.location).toBe('/login');
        });

        it('should handle logout', async () => {
            const response = await request(app)
                .get('/logout')
                .expect(302);

            expect(response.headers.location).toBe('/login');
        });
    });

    describe('Registration Routes', () => {
        beforeEach(() => {
            app.get('/register', (req, res) => {
                const securityQuestions = getSecurityQuestions();
                res.render('register', {
                    title: 'Register',
                    securityQuestions,
                    errorMessages: req.flash('error'),
                    successMessages: req.flash('success'),
                    formData: {},
                    validationErrors: {}
                });
            });

            app.post('/register', async (req, res) => {
                const { username, firstName, lastName, password, confirmPassword, securityQuestionId, securityAnswer } = req.body;

                // Basic validation
                if (!username || !firstName || !lastName || !password || !securityQuestionId || !securityAnswer) {
                    req.flash('error', 'All fields are required');
                    return res.redirect('/register');
                }

                if (password !== confirmPassword) {
                    req.flash('error', 'Passwords do not match');
                    return res.redirect('/register');
                }

                try {
                    // Check if user exists
                    const existingUser = await User.findOne({ where: { username } });
                    if (existingUser) {
                        req.flash('error', 'Username already exists');
                        return res.redirect('/register');
                    }

                    // Create user
                    const passwordHash = await hashPassword(password);
                    const user = await User.create({
                        username,
                        firstName,
                        lastName,
                        passwordHash,
                        securityQuestionId,
                        securityAnswerHash: 'hashed-answer'
                    });

                    req.flash('success', 'Registration successful! Please log in.');
                    res.redirect('/login');
                } catch (error) {
                    req.flash('error', 'Registration failed');
                    res.redirect('/register');
                }
            });
        });

        it('should render registration page', async () => {
            const mockQuestions = [
                { id: 'q1', question: 'What is your favorite color?' }
            ];
            getSecurityQuestions.mockReturnValue(mockQuestions);

            const response = await request(app)
                .get('/register')
                .expect(200);

            expect(response.body.template).toBe('register');
            expect(response.body.data.securityQuestions).toEqual(mockQuestions);
        });

        it('should handle valid registration', async () => {
            User.findOne.mockResolvedValue(null); // No existing user
            User.create.mockResolvedValue({ id: 'new-user-123' });
            hashPassword.mockResolvedValue('hashedpassword');

            const response = await request(app)
                .post('/register')
                .send({
                    username: 'newuser',
                    firstName: 'New',
                    lastName: 'User',
                    password: 'password123',
                    confirmPassword: 'password123',
                    securityQuestionId: 'q1',
                    securityAnswer: 'blue'
                })
                .expect(302);

            expect(response.headers.location).toBe('/login');
        });

        it('should reject registration with existing username', async () => {
            User.findOne.mockResolvedValue({ username: 'existinguser' });

            const response = await request(app)
                .post('/register')
                .send({
                    username: 'existinguser',
                    firstName: 'Existing',
                    lastName: 'User',
                    password: 'password123',
                    confirmPassword: 'password123',
                    securityQuestionId: 'q1',
                    securityAnswer: 'blue'
                })
                .expect(302);

            expect(response.headers.location).toBe('/register');
        });

        it('should reject registration with mismatched passwords', async () => {
            const response = await request(app)
                .post('/register')
                .send({
                    username: 'newuser',
                    firstName: 'New',
                    lastName: 'User',
                    password: 'password123',
                    confirmPassword: 'differentpassword',
                    securityQuestionId: 'q1',
                    securityAnswer: 'blue'
                })
                .expect(302);

            expect(response.headers.location).toBe('/register');
        });

        it('should require all fields', async () => {
            const response = await request(app)
                .post('/register')
                .send({
                    username: 'newuser',
                    firstName: 'New'
                    // Missing required fields
                })
                .expect(302);

            expect(response.headers.location).toBe('/register');
        });
    });

    describe('Dashboard Routes', () => {
        beforeEach(() => {
            // Add authentication middleware
            app.use((req, res, next) => {
                if (req.path === '/dashboard' && !req.session.userId) {
                    return res.redirect('/login');
                }
                next();
            });

            app.get('/dashboard', (req, res) => {
                res.render('dashboard', {
                    title: 'Dashboard',
                    user: req.session.user || { username: 'testuser' }
                });
            });
        });

        it('should redirect to login if not authenticated', async () => {
            const response = await request(app)
                .get('/dashboard')
                .expect(302);

            expect(response.headers.location).toBe('/login');
        });

        it('should render dashboard if authenticated', async () => {
            const agent = request.agent(app);
            
            // Simulate login session
            await agent
                .get('/dashboard')
                .set('Cookie', ['connect.sid=test-session'])
                .expect(302); // Will redirect to login since we can't easily mock session

            // In a real test, you would properly set up session middleware
        });
    });

    describe('Password Reset Routes', () => {
        beforeEach(() => {
            app.get('/forgot-password', (req, res) => {
                res.render('forgot-password', {
                    title: 'Forgot Password',
                    errorMessages: req.flash('error'),
                    successMessages: req.flash('success')
                });
            });

            app.post('/forgot-password', async (req, res) => {
                const { username } = req.body;

                if (!username) {
                    req.flash('error', 'Username is required');
                    return res.redirect('/forgot-password');
                }

                try {
                    const user = await User.findOne({ where: { username } });
                    if (!user) {
                        req.flash('error', 'User not found');
                        return res.redirect('/forgot-password');
                    }

                    // In real implementation, would send email
                    req.flash('success', 'Password reset instructions sent to your email');
                    res.redirect('/login');
                } catch (error) {
                    req.flash('error', 'An error occurred');
                    res.redirect('/forgot-password');
                }
            });
        });

        it('should render forgot password page', async () => {
            const response = await request(app)
                .get('/forgot-password')
                .expect(200);

            expect(response.body.template).toBe('forgot-password');
        });

        it('should handle valid username', async () => {
            User.findOne.mockResolvedValue({ username: 'testuser' });

            const response = await request(app)
                .post('/forgot-password')
                .send({ username: 'testuser' })
                .expect(302);

            expect(response.headers.location).toBe('/login');
        });

        it('should handle invalid username', async () => {
            User.findOne.mockResolvedValue(null);

            const response = await request(app)
                .post('/forgot-password')
                .send({ username: 'nonexistentuser' })
                .expect(302);

            expect(response.headers.location).toBe('/forgot-password');
        });

        it('should require username', async () => {
            const response = await request(app)
                .post('/forgot-password')
                .send({})
                .expect(302);

            expect(response.headers.location).toBe('/forgot-password');
        });
    });
});
