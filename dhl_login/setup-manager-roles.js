#!/usr/bin/env node

/**
 * Manager Role Setup Script
 * Sets up manager roles in the SQLite database for Phase 3 testing
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

console.log('🔧 Manager Role Setup Script for Phase 3\n');

// Database path - using the correct path from Sequelize config
const dbPath = path.join(__dirname, 'data', 'auth.db');

console.log(`📁 Database path: ${dbPath}`);

function setupManagerRoles() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err.message);
                reject(err);
                return;
            }
            console.log('✅ Connected to SQLite database');
        });

        // First, let's see what users exist
        console.log('\n📋 Current users in the database:');
        
        db.all("SELECT id, username, firstName, lastName, isAdmin FROM Users", [], (err, rows) => {
            if (err) {
                console.error('❌ Error fetching users:', err.message);
                reject(err);
                return;
            }

            if (rows.length === 0) {
                console.log('⚠️  No users found in database. Please create users first.');
                db.close();
                resolve();
                return;
            }

            console.log('┌─────────────────────────────────────────────────────────────────┐');
            console.log('│ ID                                   │ Username    │ Name       │ Admin │');
            console.log('├─────────────────────────────────────────────────────────────────┤');
            
            rows.forEach((row, index) => {
                const id = row.id.substring(0, 8) + '...';
                const username = (row.username || '').padEnd(11);
                const name = `${row.firstName || ''} ${row.lastName || ''}`.padEnd(10);
                const admin = row.isAdmin ? 'Yes' : 'No';
                console.log(`│ ${id.padEnd(36)} │ ${username} │ ${name} │ ${admin.padEnd(5)} │`);
            });
            console.log('└─────────────────────────────────────────────────────────────────┘');

            // Check if role column exists
            db.all("PRAGMA table_info(Users)", [], (err, columns) => {
                if (err) {
                    console.error('❌ Error checking table structure:', err.message);
                    reject(err);
                    return;
                }

                const hasRoleColumn = columns.some(col => col.name === 'role');
                
                if (!hasRoleColumn) {
                    console.log('\n⏳ Adding role column to Users table...');
                    
                    // Add the role column
                    db.run("ALTER TABLE Users ADD COLUMN role TEXT DEFAULT 'user'", (err) => {
                        if (err) {
                            console.error('❌ Error adding role column:', err.message);
                            reject(err);
                            return;
                        }
                        
                        console.log('✅ Role column added successfully');
                        updateUserRoles(db, rows, resolve, reject);
                    });
                } else {
                    console.log('\n✅ Role column already exists');
                    updateUserRoles(db, rows, resolve, reject);
                }
            });
        });
    });
}

function updateUserRoles(db, users, resolve, reject) {
    console.log('\n🔄 Setting up user roles...');
    
    // Update admin users to have admin role
    db.run("UPDATE Users SET role = 'admin' WHERE isAdmin = 1", (err) => {
        if (err) {
            console.error('❌ Error updating admin roles:', err.message);
            reject(err);
            return;
        }
        
        console.log('✅ Admin users updated to admin role');
        
        // Interactive role assignment
        if (users.length > 0) {
            console.log('\n👥 Would you like to assign manager roles to specific users?');
            console.log('   You can do this manually or I can set up a demo user as manager.');
            console.log('\n📝 Available options:');
            console.log('   1. Set the first non-admin user as manager (for testing)');
            console.log('   2. Set all non-admin users as managers');
            console.log('   3. Skip role assignment (do it manually later)');
            
            // For automation, let's set the first non-admin user as manager
            const nonAdminUsers = users.filter(user => !user.isAdmin);
            
            if (nonAdminUsers.length > 0) {
                const firstUser = nonAdminUsers[0];
                console.log(`\n⏳ Setting ${firstUser.username} as manager for testing...`);
                
                db.run("UPDATE Users SET role = 'manager' WHERE id = ?", [firstUser.id], (err) => {
                    if (err) {
                        console.error('❌ Error setting manager role:', err.message);
                        reject(err);
                        return;
                    }
                    
                    console.log(`✅ ${firstUser.username} is now a manager`);
                    
                    // Show final status
                    showFinalStatus(db, resolve, reject);
                });
            } else {
                console.log('⚠️  No non-admin users found to set as manager');
                showFinalStatus(db, resolve, reject);
            }
        } else {
            showFinalStatus(db, resolve, reject);
        }
    });
}

function showFinalStatus(db, resolve, reject) {
    console.log('\n📊 Final user roles:');
    
    db.all("SELECT username, firstName, lastName, isAdmin, role FROM Users", [], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching final status:', err.message);
            reject(err);
            return;
        }

        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│ Username    │ Name           │ Role                     │');
        console.log('├─────────────────────────────────────────────────────────┤');
        
        rows.forEach(row => {
            const username = (row.username || '').padEnd(11);
            const name = `${row.firstName || ''} ${row.lastName || ''}`.padEnd(14);
            const role = (row.role || 'user').padEnd(24);
            console.log(`│ ${username} │ ${name} │ ${role} │`);
        });
        console.log('└─────────────────────────────────────────────────────────┘');

        console.log('\n🎉 Manager role setup completed!');
        console.log('\nNext steps:');
        console.log('1. ✅ Backend server should be running with Phase 3 APIs');
        console.log('2. 🌐 Visit http://localhost:3000/dashboard to see the Manager Panel');
        console.log('3. 👥 Log in with a manager-role user to access manager features');
        console.log('4. 🚀 Test team management and performance analytics');

        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err.message);
                reject(err);
            } else {
                console.log('\n🔌 Database connection closed');
                resolve();
            }
        });
    });
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('\n⏹️  Setup interrupted by user');
    process.exit(0);
});

// Run the setup
setupManagerRoles().catch(error => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
});
