// Seeder: Add compliance officer user
// Phase 4: Compliance & Advanced Automation Implementation
// Date: 2025-06-17

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if compliance user already exists
    const existingUser = await queryInterface.sequelize.query(
      "SELECT id FROM Users WHERE username = 'compliance' LIMIT 1",
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existingUser.length > 0) {
      console.log('Compliance user already exists, skipping...');
      return;
    }

    // Hash password and security answers
    const password = 'Compliance123!';
    const passwordHash = await bcrypt.hash(password, 12);
    
    const securityAnswer1 = 'compliance';
    const securityAnswer1Hash = await bcrypt.hash(securityAnswer1.toLowerCase(), 12);
    
    const securityAnswer2 = 'officer';
    const securityAnswer2Hash = await bcrypt.hash(securityAnswer2.toLowerCase(), 12);

    // Create compliance user
    await queryInterface.bulkInsert('Users', [{
      id: uuidv4(),
      username: 'compliance',
      firstName: 'Compliance',
      lastName: 'Officer',
      passwordHash: passwordHash,
      securityQuestion1Id: 1, // What is your favorite color?
      securityAnswer1Hash: securityAnswer1Hash,
      securityQuestion2Id: 2, // What is your pet's name?
      securityAnswer2Hash: securityAnswer2Hash,
      passwordResetAttemptCount: 0,
      lastPasswordResetAttempt: null,
      isAdmin: false,
      role: 'compliance',
      managerId: null,
      department: 'Quality Assurance',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);

    console.log('Compliance user created successfully');
    console.log('Username: compliance');
    console.log('Password: Compliance123!');
    console.log('Security Question 1: What is your favorite color? Answer: compliance');
    console.log('Security Question 2: What is your pet\'s name? Answer: officer');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove compliance user
    await queryInterface.bulkDelete('Users', {
      username: 'compliance'
    });
    console.log('Compliance user removed');
  }
};
