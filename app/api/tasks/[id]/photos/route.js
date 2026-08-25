import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';
import { uploadTaskPhotoToDrive } from '@/lib/googleDrive';

export async function POST(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || !['TECHNICIAN', 'OSP', 'MASTER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized. Technician/Admin access required.' }, { status: 403 });
  }

  const taskId = params.id;

  try {
    const formData = await request.formData();
    const file = formData.get('photo');

    if (!file) {
      return NextResponse.json({ error: 'No photo provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${taskId}_${Date.now()}_${file.name || 'photo.jpg'}`;

    // Upload to Google Drive
    const { fileId, driveUrl } = await uploadTaskPhotoToDrive(buffer, fileName, file.type);

    // Save to task_photos table
    const insertRes = await pool.query(`
      INSERT INTO task_photos (task_id, drive_file_id, drive_url, uploaded_by_tech_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [taskId, fileId, driveUrl, user.userId]);

    return NextResponse.json(insertRes.rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET list of photos attached to a task
export async function GET(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const taskId = params.id;

  try {
    const res = await pool.query(`
      SELECT photo_id, task_id, drive_file_id, drive_url, uploaded_by_tech_id, uploaded_at
      FROM task_photos
      WHERE task_id = $1
      ORDER BY uploaded_at ASC;
    `, [taskId]);

    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}