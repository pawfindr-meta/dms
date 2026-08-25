import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const res = await pool.query(`
      SELECT tech_id, full_name, contact_number, personnel_type, status, must_change_password, created_at
      FROM technicians_osp
      ORDER BY tech_id ASC;
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    const { tech_id, full_name, contact_number, personnel_type } = await request.json();

    if (!tech_id || !full_name) {
      return NextResponse.json({ error: 'Tech ID and Full Name are required.' }, { status: 400 });
    }

    const defaultPinHash = await hashPassword('00000000');

    const res = await pool.query(`
      INSERT INTO technicians_osp (tech_id, full_name, contact_number, personnel_type, password_hash, must_change_password, status)
      VALUES ($1, $2, $3, $4, $5, TRUE, 'ACTIVE')
      RETURNING tech_id, full_name, contact_number, personnel_type, status, must_change_password;
    `, [tech_id.toUpperCase(), full_name, contact_number || null, personnel_type || 'TECHNICIAN', defaultPinHash]);

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}