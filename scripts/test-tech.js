import pool from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';

async function test() {
  try {
    const hash = await hashPassword('00000000');
    const res = await pool.query(
      `INSERT INTO technicians_osp (tech_id, full_name, contact_number, personnel_type, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tech_id) DO NOTHING
       RETURNING tech_id, full_name, personnel_type;`,
      ['T-0001', 'Juan Dela Cruz', '09170001122', 'TECHNICIAN', hash]
    );

    if (res.rows.length > 0) {
      console.log('✅ Created Tech:', res.rows[0].tech_id, '-', res.rows[0].full_name);
    } else {
      console.log('ℹ️ Tech T-0001 already exists in database.');
    }
  } catch (err) {
    console.error('❌ Error creating tech:', err);
  } finally {
    process.exit(0);
  }
}

test();