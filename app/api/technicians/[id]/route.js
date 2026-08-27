import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json(
      { error: 'Unauthorized. Administrator access required.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const techId = decodeURIComponent(id).trim().toUpperCase();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE tasks SET completed_by_tech_id = NULL WHERE UPPER(completed_by_tech_id) = $1;',
      [techId]
    );

    await client.query(
      'DELETE FROM team_members WHERE UPPER(tech_id) = $1;',
      [techId]
    ).catch(() => null);

    const res = await client.query(
      'DELETE FROM technicians_osp WHERE UPPER(tech_id) = $1 RETURNING tech_id, full_name;',
      [techId]
    );

    if (res.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Operative account not found.' }, { status: 404 });
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      deletedTechId: res.rows[0].tech_id,
      name: res.rows[0].full_name,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete Operative Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove operative.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}