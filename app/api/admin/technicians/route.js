import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken, hashPassword } from '@/lib/auth';
import { generateTechId } from '@/lib/techIdGenerator';

// GET list all registered technicians and OSP
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Master Admin access required.' }, { status: 403 });
  }

  try {
    const res = await pool.query(`
      SELECT tech_id, full_name, contact_number, personnel_type, status, must_change_password, created_at
      FROM technicians_osp
      ORDER BY created_at DESC;
    `);
    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST register new Technician or OSP
export async function POST(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Master Admin access required.' }, { status: 403 });
  }

  try {
    const { full_name, contact_number, personnel_type } = await request.json();

    if (!full_name || !contact_number || !personnel_type) {
      return NextResponse.json({ error: 'Full name, contact number, and personnel type (TECHNICIAN/OSP) are required.' }, { status: 400 });
    }

    if (!['TECHNICIAN', 'OSP'].includes(personnel_type)) {
      return NextResponse.json({ error: 'Personnel type must be either TECHNICIAN or OSP.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const techId = await generateTechId(client, personnel_type);
      const defaultHash = await hashPassword('00000000'); // Default password per specification

      const insertQuery = `
        INSERT INTO technicians_osp (
          tech_id, full_name, contact_number, personnel_type, password_hash, must_change_password, registered_by
        ) VALUES ($1, $2, $3, $4, $5, TRUE, $6)
        RETURNING tech_id, full_name, contact_number, personnel_type, status, must_change_password, created_at;
      `;

      const result = await client.query(insertQuery, [
        techId,
        full_name.trim(),
        contact_number.trim(),
        personnel_type,
        defaultHash,
        user.userId,
      ]);

      await client.query('COMMIT');
      return NextResponse.json(result.rows[0], { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}