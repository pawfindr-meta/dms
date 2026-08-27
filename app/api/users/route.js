import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken, hashPassword } from '@/lib/auth';

// GET: List all console users
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  try {
    const res = await pool.query(`
      SELECT user_id, username_or_email, full_name, role, status, created_at
      FROM users
      ORDER BY user_id ASC;
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new CSR, Dispatcher, or Admin
export async function POST(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  try {
    const { username_or_email, full_name, role, password } = await request.json();

    if (!username_or_email || !full_name || !password || !role) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const res = await pool.query(`
      INSERT INTO users (username_or_email, password_hash, full_name, role, status)
      VALUES (LOWER($1), $2, $3, $4, 'ACTIVE')
      RETURNING user_id, username_or_email, full_name, role, status, created_at;
    `, [username_or_email.trim(), passwordHash, full_name.trim(), role]);

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username/Email already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}