import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

export async function POST(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || !['TECHNICIAN', 'OSP', 'MASTER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized. Field technician access required.' }, { status: 403 });
  }

  const taskId = params.id;

  try {
    const { resolution_note } = await request.json();

    // Strict validation: Mandatory resolution note
    if (!resolution_note || resolution_note.trim().length === 0) {
      return NextResponse.json({ error: 'A resolution note describing actions taken is strictly required.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingTask = await client.query('SELECT * FROM tasks WHERE task_id = $1 FOR UPDATE;', [taskId]);
      if (existingTask.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      }

      const task = existingTask.rows[0];

      if (task.status === 'COMPLETED' || task.status === 'ACKNOWLEDGED') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Task is already marked as completed.' }, { status: 400 });
      }

      // Update task to COMPLETED
      const updateRes = await client.query(`
        UPDATE tasks 
        SET status = 'COMPLETED',
            completed_by_tech_id = $1,
            resolution_note = $2,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE task_id = $3
        RETURNING *;
      `, [user.userId, resolution_note.trim(), taskId]);

      // Record in task_notes
      await client.query(`
        INSERT INTO task_notes (task_id, author_id, author_role, note_text)
        VALUES ($1, $2, $3, $4);
      `, [taskId, user.userId, user.role, `[RESOLUTION] ${resolution_note.trim()}`]);

      // Record in task_history
      await client.query(`
        INSERT INTO task_history (task_id, actor_id, actor_role, action, from_status, to_status, remarks)
        VALUES ($1, $2, $3, 'STATUS_CHANGE', $4, 'COMPLETED', $5);
      `, [taskId, user.userId, user.role, task.status, resolution_note.trim()]);

      await client.query('COMMIT');
      return NextResponse.json(updateRes.rows[0]);
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