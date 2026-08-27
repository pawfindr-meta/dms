import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE: Remove a technician or OSP operative account
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

  try {
    const res = await pool.query(
      'DELETE FROM technicians_osp WHERE UPPER(tech_id) = $1 RETURNING tech_id, full_name;',
      [techId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Operative account not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deletedTechId: res.rows[0].tech_id,
      name: res.rows[0].full_name,
    });
  } catch (error) {
    console.error('Delete Operative Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove operative.' },
      { status: 500 }
    );
  }
}