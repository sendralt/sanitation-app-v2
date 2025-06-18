const User = require('./models/user');
const bcrypt = require('bcryptjs');

const TEST_CREDENTIALS = {
  admin: 'admin123',
  manager: 'manager123', 
  user: 'user123',
  compliance: 'Compliance123!'
};

async function verifyAllUsers() {
  console.log('🔍 Verifying all user credentials...\n');
  
  try {
    const users = await User.findAll({
      attributes: ['username', 'role', 'isAdmin', 'passwordHash', 'createdAt']
    });
    
    for (const user of users) {
      console.log(`👤 Testing user: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Admin: ${user.isAdmin}`);
      console.log(`   Created: ${user.createdAt}`);
      
      const expectedPassword = TEST_CREDENTIALS[user.username];
      if (!expectedPassword) {
        console.log(`   ⚠️  No test password defined for ${user.username}`);
        continue;
      }
      
      const isValid = await bcrypt.compare(expectedPassword, user.passwordHash);
      console.log(`   Password (${expectedPassword}): ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      
      if (!isValid) {
        console.log(`   🔧 Fixing password for ${user.username}...`);
        const newHash = await bcrypt.hash(expectedPassword, 10);
        await user.update({ passwordHash: newHash });
        console.log(`   ✅ Password reset for ${user.username}`);
      }
      
      console.log('');
    }
    
    console.log('🎉 All user verification completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

verifyAllUsers();
