require('dotenv').config();
const { hashPassword, hashAnswer } = require('./dhl_login/utils/auth');
const { v4: uuidv4 } = require('uuid');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './dhl_login/data/auth.db', // Path to your SQLite database
  logging: false, // Disable logging to the console
});

const User = require('./dhl_login/models/user')(sequelize, Sequelize);

async function createAdminUser() {
  try {
    await sequelize.authenticate();
    console.log('Connection to the database has been established successfully.');

    const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'password123';
    const adminSecAnswer1 = process.env.INITIAL_ADMIN_SEC_ANSWER1 || 'Fluffy';
    const adminSecAnswer2 = process.env.INITIAL_ADMIN_SEC_ANSWER2 || 'Central Elementary';

    const hashedPassword = await hashPassword(adminPassword);
    const hashedAnswer1 = await hashAnswer(adminSecAnswer1);
    const hashedAnswer2 = await hashAnswer(adminSecAnswer2);

    const existingAdmin = await User.findOne({ where: { username: adminUsername } });

    if (!existingAdmin) {
      const newUser = await User.create({
        id: uuidv4(),
        username: adminUsername,
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: hashedPassword,
        securityQuestion1Id: 1,
        securityAnswer1Hash: hashedAnswer1,
        securityQuestion2Id: 3,
        securityAnswer2Hash: hashedAnswer2,
        isAdmin: true,
      });
      console.log(`Admin user "${adminUsername}" created successfully with ID: ${newUser.id}`);
    } else {
      console.log(`Admin user "${adminUsername}" already exists.`);
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

createAdminUser();
