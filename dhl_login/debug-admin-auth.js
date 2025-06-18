const User = require('./models/user');
const bcrypt = require('bcryptjs');

async function debugAdmin() {
  try {
    const admin = await User.findOne({ where: { username: 'admin' } });
    if (!admin) {
      console.log('❌ Admin user not found in database');
      return;
    }
    
    console.log('🔍 Admin user found:');
    console.log('   Username:', admin.username);
    console.log('   Role:', admin.role);
    console.log('   IsAdmin:', admin.isAdmin);
    console.log('   Password hash length:', admin.passwordHash.length);
    console.log('   Created:', admin.createdAt);
    
    // Test password verification
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, admin.passwordHash);
    console.log('   Password test (admin123):', isValid ? '✅ VALID' : '❌ INVALID');
    
    if (!isValid) {
      console.log('🔧 Fixing admin password...');
      const newHash = await bcrypt.hash('admin123', 10);
      await admin.update({ passwordHash: newHash });
      console.log('✅ Admin password reset to: admin123');
      
      // Verify the fix
      const verifyHash = await bcrypt.compare('admin123', newHash);
      console.log('   Verification:', verifyHash ? '✅ FIXED' : '❌ STILL BROKEN');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

debugAdmin();
