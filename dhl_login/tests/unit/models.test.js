/**
 * Unit Tests for Sequelize Models
 */

const { Sequelize, DataTypes } = require('sequelize');

// Create test database connection
const sequelize = new Sequelize('sqlite::memory:', {
    logging: false // Disable logging for tests
});

// Mock the User model
const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('user', 'manager', 'compliance', 'admin'),
        defaultValue: 'user'
    },
    department: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    securityQuestionId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    securityAnswerHash: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

describe('User Model Tests', () => {
    beforeAll(async () => {
        await sequelize.authenticate();
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        await User.destroy({ where: {}, truncate: true });
    });

    describe('User Creation', () => {
        it('should create a user with valid data', async () => {
            const userData = {
                username: 'testuser',
                firstName: 'Test',
                lastName: 'User',
                passwordHash: 'hashedpassword123',
                role: 'user',
                department: 'IT',
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            const user = await User.create(userData);

            expect(user.id).toBeDefined();
            expect(user.username).toBe('testuser');
            expect(user.firstName).toBe('Test');
            expect(user.lastName).toBe('User');
            expect(user.role).toBe('user');
            expect(user.department).toBe('IT');
            expect(user.isAdmin).toBe(false);
        });

        it('should generate UUID for new users', async () => {
            const userData = {
                username: 'testuser2',
                firstName: 'Test',
                lastName: 'User',
                passwordHash: 'hashedpassword123',
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            const user = await User.create(userData);

            expect(user.id).toBeDefined();
            expect(typeof user.id).toBe('string');
            expect(user.id.length).toBe(36); // UUID length
        });

        it('should set default values correctly', async () => {
            const userData = {
                username: 'testuser3',
                firstName: 'Test',
                lastName: 'User',
                passwordHash: 'hashedpassword123',
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            const user = await User.create(userData);

            expect(user.role).toBe('user');
            expect(user.isAdmin).toBe(false);
            expect(user.department).toBeNull();
        });

        it('should create admin users correctly', async () => {
            const userData = {
                username: 'adminuser',
                firstName: 'Admin',
                lastName: 'User',
                passwordHash: 'hashedpassword123',
                role: 'admin',
                isAdmin: true,
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            const user = await User.create(userData);

            expect(user.role).toBe('admin');
            expect(user.isAdmin).toBe(true);
        });
    });

    describe('User Validation', () => {
        it('should require username', async () => {
            const userData = {
                firstName: 'Test',
                lastName: 'User',
                passwordHash: 'hashedpassword123',
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should require firstName', async () => {
            const userData = {
                username: 'testuser',
                lastName: 'User',
                passwordHash: 'hashedpassword123',
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should require lastName', async () => {
            const userData = {
                username: 'testuser',
                firstName: 'Test',
                passwordHash: 'hashedpassword123',
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should require passwordHash', async () => {
            const userData = {
                username: 'testuser',
                firstName: 'Test',
                lastName: 'User',
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            await expect(User.create(userData)).rejects.toThrow();
        });

        it('should enforce unique usernames', async () => {
            const userData1 = {
                username: 'duplicateuser',
                firstName: 'Test',
                lastName: 'User1',
                passwordHash: 'hashedpassword123',
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            const userData2 = {
                username: 'duplicateuser',
                firstName: 'Test',
                lastName: 'User2',
                passwordHash: 'hashedpassword456',
                securityQuestionId: 'q2',
                securityAnswerHash: 'hashedanswer456'
            };

            await User.create(userData1);
            await expect(User.create(userData2)).rejects.toThrow();
        });

        it('should validate role enum values', async () => {
            const userData = {
                username: 'testuser',
                firstName: 'Test',
                lastName: 'User',
                passwordHash: 'hashedpassword123',
                role: 'invalidrole',
                securityQuestionId: 'q1',
                securityAnswerHash: 'hashedanswer123'
            };

            await expect(User.create(userData)).rejects.toThrow();
        });
    });

    describe('User Queries', () => {
        beforeEach(async () => {
            // Create test users
            await User.bulkCreate([
                {
                    username: 'user1',
                    firstName: 'User',
                    lastName: 'One',
                    passwordHash: 'hash1',
                    role: 'user',
                    department: 'IT',
                    securityQuestionId: 'q1',
                    securityAnswerHash: 'answer1'
                },
                {
                    username: 'manager1',
                    firstName: 'Manager',
                    lastName: 'One',
                    passwordHash: 'hash2',
                    role: 'manager',
                    department: 'Operations',
                    securityQuestionId: 'q2',
                    securityAnswerHash: 'answer2'
                },
                {
                    username: 'admin1',
                    firstName: 'Admin',
                    lastName: 'One',
                    passwordHash: 'hash3',
                    role: 'admin',
                    isAdmin: true,
                    securityQuestionId: 'q3',
                    securityAnswerHash: 'answer3'
                }
            ]);
        });

        it('should find user by username', async () => {
            const user = await User.findOne({ where: { username: 'user1' } });

            expect(user).toBeDefined();
            expect(user.username).toBe('user1');
            expect(user.firstName).toBe('User');
            expect(user.lastName).toBe('One');
        });

        it('should find users by role', async () => {
            const managers = await User.findAll({ where: { role: 'manager' } });

            expect(managers).toHaveLength(1);
            expect(managers[0].username).toBe('manager1');
        });

        it('should find admin users', async () => {
            const admins = await User.findAll({ where: { isAdmin: true } });

            expect(admins).toHaveLength(1);
            expect(admins[0].username).toBe('admin1');
        });

        it('should count users by department', async () => {
            const itUsers = await User.count({ where: { department: 'IT' } });
            const opsUsers = await User.count({ where: { department: 'Operations' } });

            expect(itUsers).toBe(1);
            expect(opsUsers).toBe(1);
        });
    });

    describe('User Updates', () => {
        let testUser;

        beforeEach(async () => {
            testUser = await User.create({
                username: 'updateuser',
                firstName: 'Update',
                lastName: 'User',
                passwordHash: 'originalpassword',
                role: 'user',
                securityQuestionId: 'q1',
                securityAnswerHash: 'originalanswer'
            });
        });

        it('should update user fields', async () => {
            await testUser.update({
                firstName: 'Updated',
                lastName: 'Name',
                department: 'HR'
            });

            expect(testUser.firstName).toBe('Updated');
            expect(testUser.lastName).toBe('Name');
            expect(testUser.department).toBe('HR');
        });

        it('should update user role', async () => {
            await testUser.update({ role: 'manager' });

            expect(testUser.role).toBe('manager');
        });

        it('should promote user to admin', async () => {
            await testUser.update({ 
                role: 'admin',
                isAdmin: true 
            });

            expect(testUser.role).toBe('admin');
            expect(testUser.isAdmin).toBe(true);
        });
    });

    describe('User Deletion', () => {
        it('should delete user', async () => {
            const user = await User.create({
                username: 'deleteuser',
                firstName: 'Delete',
                lastName: 'User',
                passwordHash: 'password',
                securityQuestionId: 'q1',
                securityAnswerHash: 'answer'
            });

            await user.destroy();

            const deletedUser = await User.findByPk(user.id);
            expect(deletedUser).toBeNull();
        });

        it('should handle bulk deletion', async () => {
            await User.bulkCreate([
                {
                    username: 'bulk1',
                    firstName: 'Bulk',
                    lastName: 'One',
                    passwordHash: 'password1',
                    department: 'TestDept',
                    securityQuestionId: 'q1',
                    securityAnswerHash: 'answer1'
                },
                {
                    username: 'bulk2',
                    firstName: 'Bulk',
                    lastName: 'Two',
                    passwordHash: 'password2',
                    department: 'TestDept',
                    securityQuestionId: 'q2',
                    securityAnswerHash: 'answer2'
                }
            ]);

            const deletedCount = await User.destroy({
                where: { department: 'TestDept' }
            });

            expect(deletedCount).toBe(2);
        });
    });
});
