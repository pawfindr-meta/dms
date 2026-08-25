import { config } from 'dotenv';
import { resolve } from 'path';

// Force load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import pool from '../lib/db.js';
import { hashPassword } from '../lib/auth.js';

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL is not defined. Check your .env.local file.');
    process.exit(1);
  }

  const adminPassword = await hashPassword('Admin@12345');
  const dispatcherPassword = await hashPassword('Dispatch@12345');
  const csrPassword = await hashPassword('Csr@12345');

  try {
    // Insert Master Admin
    await pool.query(`
      INSERT INTO users (full_name, username_or_email, password_hash, role, contact_number)
      VALUES ($1, $2, $3, 'MASTER_ADMIN', '09171234567')
      ON CONFLICT (username_or_email) DO NOTHING;
    `, ['System Administrator', 'admin@dms.local', adminPassword]);

    // Insert Default Dispatcher
    await pool.query(`
      INSERT INTO users (full_name, username_or_email, password_hash, role, contact_number)
      VALUES ($1, $2, $3, 'DISPATCHER', '09181234567')
      ON CONFLICT (username_or_email) DO NOTHING;
    `, ['Head Dispatcher', 'dispatcher@dms.local', dispatcherPassword]);

    // Insert Default CSR
    await pool.query(`
      INSERT INTO users (full_name, username_or_email, password_hash, role, contact_number)
      VALUES ($1, $2, $3, 'CSR', '09191234567')
      ON CONFLICT (username_or_email) DO NOTHING;
    `, ['Main CSR', 'csr@dms.local', csrPassword]);

    console.log('✅ Seed users created successfully:');
    console.log('   - Admin: admin@dms.local / Admin@12345');
    console.log('   - Dispatcher: dispatcher@dms.local / Dispatch@12345');
    console.log('   - CSR: csr@dms.local / Csr@12345');
  } catch (err) {
    console.error('❌ Error seeding users:', err);
  } finally {
    process.exit(0);
  }
}

seed();