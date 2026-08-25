import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken, hashPassword } from '@/lib/auth';

export async function POST(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  const techId = params.id;

  try {
    const defaultPinHash = await hashPassword('00000000');

    await pool.query(`
      UPDATE technicians_osp 
      SET password_hash = $1, must_change_password = TRUE 
      WHERE UPPER(tech_id) = UPPER($2);
    `, [defaultPinHash, techId]);

    return NextResponse.json({ message: `PIN reset to 00000000 for ${techId}` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}