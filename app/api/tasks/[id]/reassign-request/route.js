import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

export async function POST(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || !['TECHNICIAN', 'OSP'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized. Only assigned field personnel can request reassignment.' }, { status: 403 });
  }

  const taskId = params.id;

  try {
    const { reason } = await request.json();

    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'A specific reason for the reassignment request is required.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const taskRes = await client.query('SELECT status FROM tasks WHERE task_id = $1 FOR UPDATE;', [taskId]);
      if (taskRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      }

      const currentStatus = taskRes.rows[0].status;
      if (['COMPLETED', 'ACKNOWLEDGED', 'CANCELLED'].includes(currentStatus)) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Cannot request reassignment for completed/closed tasks.' }, { status: 400 });
      }

      // Create reassignment request[cite: 1]
      const reqRes = await client.query(`
        INSERT INTO reassignment_requests (task_id, requested_by_tech_id, reason)
        VALUES ($1, $2, $3)
        RETURNING *;
      `, [taskId, user.userId, reason.trim()]);

      // Set task status to REASSIGNMENT_REQUESTED[cite: 1]
      await client.query(`
        UPDATE tasks 
        SET status = 'REASSIGNMENT_REQUESTED', updated_at = CURRENT_TIMESTAMP 
        WHERE task_id = $1;
      `, [taskId]);

      // Note and History audit logging[cite: 1]
      await client.query(`
        INSERT INTO task_notes (task_id, author_id, author_role, note_text)
        VALUES ($1, $2, $3, $4);
      `, [taskId, user.userId, user.role, `[REASSIGNMENT REQUEST] ${reason.trim()}`]);

      await client.query(`
        INSERT INTO task_history (task_id, actor_id, actor_role, action, from_status, to_status, remarks)
        VALUES ($1, $2, $3, 'REASSIGNMENT_REQUESTED', $4, 'REASSIGNMENT_REQUESTED', $5);
      `, [taskId, user.userId, user.role, currentStatus, reason.trim()]);

      await client.query('COMMIT');
      return NextResponse.json(reqRes.rows[0], { status: 201 });
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