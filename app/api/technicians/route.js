import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken, hashPassword } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT tech_id, full_name, contact_number, personnel_type, must_change_password, status, created_at
      FROM technicians_osp
      ORDER BY tech_id ASC;
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('Fetch Technicians Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch technicians' }, { status: 500 });
  }
}

export async function POST(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tech_id, full_name, contact_number, personnel_type } = body;

    if (!tech_id || !full_name || !personnel_type) {
      return NextResponse.json(
        { error: 'Tech ID, Full Name, and Personnel Type are required.' },
        { status: 400 }
      );
    }

    const defaultHash = await hashPassword('00000000');

    const res = await pool.query(
      `
      INSERT INTO technicians_osp (tech_id, full_name, contact_number, personnel_type, password_hash, must_change_password, status)
      VALUES (UPPER($1), $2, $3, $4, $5, TRUE, 'ACTIVE')
      RETURNING tech_id, full_name, contact_number, personnel_type, must_change_password, status, created_at;
      `,
      [tech_id.trim().toUpperCase(), full_name.trim(), contact_number?.trim() || null, personnel_type, defaultHash]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error) {
    console.error('Enroll Operative Error:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Operative ID already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to register operative' }, { status: 500 });
  }
}