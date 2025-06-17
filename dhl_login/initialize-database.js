#!/usr/bin/env node

/**
 * Database Initialization Script
 * Alternative to Sequelize CLI for Windows systems with execution policy restrictions
 */

const sequelize = require('./config/sequelize');
const User = require('./models/user');
const bcrypt = require('bcryptjs');

console.log('🔧 Database Initialization Script\n');

async function initializeDatabase() {
    try {
        // Test database connection
        console.log('⏳ Testing database connection...');
        await sequelize.authenticate();
        console.log('✅ Database connection established successfully');

        // Sync User model (create table if it doesn't exist)
        console.log('⏳ Creating/updating Users table...');
        await User.sync({ alter: true });
        console.log('✅ Users table synchronized successfully');

        // Check if any users exist
        const userCount = await User.count();
        console.log(`📊 Current user count: ${userCount}`);

        if (userCount === 0) {
            console.log('⏳ Creating initial admin user...');

            // Create initial admin user
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const hashedAnswer1 = await bcrypt.hash('admin', 10);
            const hashedAnswer2 = await bcrypt.hash('system', 10);

            const adminUser = await User.create({
                username: 'admin',
                firstName: 'System',
                lastName: 'Administrator',
                passwordHash: hashedPassword,
                securityQuestion1Id: 1,
                securityAnswer1Hash: hashedAnswer1,
                securityQuestion2Id: 2,
                securityAnswer2Hash: hashedAnswer2,
                isAdmin: true,
                role: 'admin'
            });

            console.log('✅ Initial admin user created successfully');
            console.log(`   Username: admin`);
            console.log(`   Password: admin123`);
            console.log(`   Role: admin`);
            console.log(`   ID: ${adminUser.id}`);
        } else {
            console.log('ℹ️  Users already exist, skipping admin user creation');
        }

        // Add role column if it doesn't exist
        console.log('⏳ Checking for role column...');
        try {
            // Try to query the role column
            await sequelize.query('SELECT role FROM Users LIMIT 1');
            console.log('✅ Role column already exists');
        } catch (error) {
            if (error.message.includes('no such column: role')) {
                console.log('⏳ Adding role column to Users table...');
                await sequelize.query('ALTER TABLE Users ADD COLUMN role TEXT DEFAULT "user"');
                console.log('✅ Role column added successfully');
                
                // Update existing admin users
                await sequelize.query('UPDATE Users SET role = "admin" WHERE isAdmin = 1');
                console.log('✅ Existing admin users updated with admin role');
            } else {
                console.error('❌ Error checking role column:', error.message);
            }
        }

        // Create a test manager user if none exists
        const managerCount = await User.count({ where: { role: 'manager' } });
        if (managerCount === 0) {
            console.log('⏳ Creating test manager user...');

            const hashedPassword = await bcrypt.hash('manager123', 10);
            const hashedAnswer1 = await bcrypt.hash('manager', 10);
            const hashedAnswer2 = await bcrypt.hash('test', 10);

            const managerUser = await User.create({
                username: 'manager',
                firstName: 'Test',
                lastName: 'Manager',
                passwordHash: hashedPassword,
                securityQuestion1Id: 1,
                securityAnswer1Hash: hashedAnswer1,
                securityQuestion2Id: 2,
                securityAnswer2Hash: hashedAnswer2,
                isAdmin: false,
                role: 'manager'
            });

            console.log('✅ Test manager user created successfully');
            console.log(`   Username: manager`);
            console.log(`   Password: manager123`);
            console.log(`   Role: manager`);
            console.log(`   ID: ${managerUser.id}`);
        }

        // Create a test regular user if none exists
        const regularUserCount = await User.count({ where: { role: 'user' } });
        if (regularUserCount === 0) {
            console.log('⏳ Creating test regular user...');

            const hashedPassword = await bcrypt.hash('user123', 10);
            const hashedAnswer1 = await bcrypt.hash('user', 10);
            const hashedAnswer2 = await bcrypt.hash('test', 10);

            const regularUser = await User.create({
                username: 'user',
                firstName: 'Test',
                lastName: 'User',
                passwordHash: hashedPassword,
                securityQuestion1Id: 1,
                securityAnswer1Hash: hashedAnswer1,
                securityQuestion2Id: 2,
                securityAnswer2Hash: hashedAnswer2,
                isAdmin: false,
                role: 'user'
            });

            console.log('✅ Test regular user created successfully');
            console.log(`   Username: user`);
            console.log(`   Password: user123`);
            console.log(`   Role: user`);
            console.log(`   ID: ${regularUser.id}`);
        }

        // Show final user summary
        console.log('\n📊 Final User Summary:');
        const allUsers = await User.findAll({
            attributes: ['id', 'username', 'firstName', 'lastName', 'role', 'isAdmin'],
            order: [['role', 'DESC'], ['username', 'ASC']]
        });

        console.log('┌─────────────────────────────────────────────────────────────────┐');
        console.log('│ Username    │ Name           │ Role     │ Admin │ ID (first 8)   │');
        console.log('├─────────────────────────────────────────────────────────────────┤');
        
        allUsers.forEach(user => {
            const username = (user.username || '').padEnd(11);
            const name = `${user.firstName || ''} ${user.lastName || ''}`.padEnd(14);
            const role = (user.role || 'user').padEnd(8);
            const admin = user.isAdmin ? 'Yes' : 'No';
            const id = user.id.substring(0, 8);
            console.log(`│ ${username} │ ${name} │ ${role} │ ${admin.padEnd(5)} │ ${id.padEnd(14)} │`);
        });
        console.log('└─────────────────────────────────────────────────────────────────┘');

        console.log('\n🎉 Database initialization completed successfully!');
        console.log('\nNext steps:');
        console.log('1. ✅ Start the DHL login server: npm start');
        console.log('2. ✅ Start the backend server: cd ../backend && npm start');
        console.log('3. 🌐 Visit http://localhost:3000/dashboard');
        console.log('4. 🔑 Log in with any of the test accounts above');
        console.log('5. 👥 Test manager features with the manager account');

    } catch (error) {
        console.error('💥 Database initialization failed:', error);
        throw error;
    } finally {
        await sequelize.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n⏹️  Initialization interrupted by user');
    process.exit(0);
});

// Run the initialization
initializeDatabase().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});
