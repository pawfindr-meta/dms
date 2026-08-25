import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyPassword, signUserToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username/ID and password are required.' }, { status: 400 });
    }

    const trimmedId = identifier.trim();
    const upperId = trimmedId.toUpperCase();

    // 1. Check technicians_osp registry first (T-XXXX or OSP-XXXX)
    if (upperId.startsWith('T-') || upperId.startsWith('OSP-')) {
      const techRes = await pool.query(
        'SELECT * FROM technicians_osp WHERE UPPER(tech_id) = $1 AND status = $2 LIMIT 1;',
        [upperId, 'ACTIVE']
      );

      if (techRes.rows.length === 0) {
        return NextResponse.json({ error: 'Invalid Technician/OSP credentials.' }, { status: 401 });
      }

      const tech = techRes.rows[0];
      const isMatch = await verifyPassword(password, tech.password_hash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Invalid Technician/OSP credentials.' }, { status: 401 });
      }

      const tokenPayload = {
        userId: tech.tech_id,
        fullName: tech.full_name,
        role: tech.personnel_type,
      };

      const token = signUserToken(tokenPayload);

      // Set cookie and inform client if password change is required
      const response = NextResponse.json({
        success: true,
        role: tech.personnel_type,
        userId: tech.tech_id,
        fullName: tech.full_name,
        mustChangePassword: Boolean(tech.must_change_password),
      });

      response.cookies.set('dms_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    }

    // 2. Check standard system users (Admin, CSR, Dispatcher)
    const userRes = await pool.query(
      'SELECT * FROM users WHERE LOWER(username_or_email) = $1 AND status = $2 LIMIT 1;',
      [trimmedId.toLowerCase(), 'ACTIVE']
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid user credentials.' }, { status: 401 });
    }

    const user = userRes.rows[0];
    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid user credentials.' }, { status: 401 });
    }

    const tokenPayload = {
      userId: user.user_id,
      fullName: user.full_name,
      role: user.role,
    };

    const token = signUserToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      role: user.role,
      userId: user.user_id,
      fullName: user.full_name,
      mustChangePassword: false,
    });

    response.cookies.set('dms_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}