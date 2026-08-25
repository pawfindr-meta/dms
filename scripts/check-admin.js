import pool from '../lib/db.js';

async function verifyAndFixAdmin() {
  try {
    // 1. Force the role of admin@dms.local to MASTER_ADMIN
    await pool.query(`
      UPDATE users 
      SET role = 'MASTER_ADMIN' 
      WHERE username_or_email = 'admin@dms.local';
    `);

    // 2. Fetch the user info
    const res = await pool.query(`
      SELECT user_id, username_or_email, full_name, role 
      FROM users 
      WHERE username_or_email = 'admin@dms.local';
    `);

    console.log('✅ Admin Account Verified:');
    console.log(res.rows[0]);
  } catch (err) {
    console.error('❌ Error verifying admin:', err);
  } finally {
    process.exit(0);
  }
}

verifyAndFixAdmin();