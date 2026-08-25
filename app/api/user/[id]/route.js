import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken, hashPassword } from '@/lib/auth';

// PUT: Update user profile, role, status, or reset password
export async function PUT(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);

  try {
    const { username_or_email, full_name, role, status, new_password } = await request.json();

    if (new_password && new_password.trim() !== '') {
      if (new_password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
      }
      const newHash = await hashPassword(new_password);
      await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2;', [newHash, userId]);
    }

    const res = await pool.query(`
      UPDATE users
      SET username_or_email = LOWER($1), full_name = $2, role = $3, status = $4
      WHERE user_id = $5
      RETURNING user_id, username_or_email, full_name, role, status;
    `, [username_or_email.trim(), full_name.trim(), role, status || 'ACTIVE', userId]);

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Username/Email is already taken by another account.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete user account
export async function DELETE(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id, 10);

  if (user.userId === userId) {
    return NextResponse.json({ error: 'Cannot delete your own active administrator account.' }, { status: 400 });
  }

  try {
    await pool.query('DELETE FROM users WHERE user_id = $1;', [userId]);
    return NextResponse.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}