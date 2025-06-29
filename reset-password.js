const { pool } = require('./config/database');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    console.log('Resetting password for test user...');
    
    // Reset password for the first user
    const saltRounds = 12;
    const newPassword = 'password123';
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, username, email',
      [passwordHash, 'davidtheo@gmail.com']
    );
    
    if (result.rows.length > 0) {
      console.log('Password reset successful for:', result.rows[0]);
      console.log('New password:', newPassword);
      console.log('You can now sign in with:');
      console.log('Email: davidtheo@gmail.com');
      console.log('Password: password123');
    } else {
      console.log('User not found');
    }
    
  } catch (error) {
    console.error('Password reset failed:', error);
  } finally {
    await pool.end();
  }
}

resetPassword(); 