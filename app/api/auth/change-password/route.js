import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken, hashPassword, verifyPassword } from '@/lib/auth';

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('dms_session')?.value;
    const user = verifyUserToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    const { current_password, new_password } = await request.json();

    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long.' }, { status: 400 });
    }

    // 1. Check Technician / OSP record
    if (['TECHNICIAN', 'OSP'].includes(user.role)) {
      const techRes = await pool.query(
        'SELECT password_hash FROM technicians_osp WHERE UPPER(tech_id) = UPPER($1) LIMIT 1;',
        [user.userId]
      );

      if (techRes.rows.length === 0) {
        return NextResponse.json({ error: 'Technician record not found.' }, { status: 404 });
      }

      const isCurrentValid = await verifyPassword(current_password, techRes.rows[0].password_hash);
      if (!isCurrentValid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      const newHash = await hashPassword(new_password);
      await pool.query(
        'UPDATE technicians_osp SET password_hash = $1, must_change_password = FALSE WHERE UPPER(tech_id) = UPPER($2);',
        [newHash, user.userId]
      );

      return NextResponse.json({ success: true, message: 'Password updated successfully.' });
    }

    // 2. Otherwise update standard user
    const userRes = await pool.query('SELECT password_hash FROM users WHERE user_id = $1 LIMIT 1;', [user.userId]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User record not found.' }, { status: 404 });
    }

    const isCurrentValid = await verifyPassword(current_password, userRes.rows[0].password_hash);
    if (!isCurrentValid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    const newHash = await hashPassword(new_password);
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE user_id = $2;',
      [newHash, user.userId]
    );

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}