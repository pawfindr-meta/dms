import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

export async function PATCH(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const taskId = params.id;
  const client = await pool.connect();

  try {
    const { new_status, assigned_team_id, remarks } = await request.json();

    await client.query('BEGIN');

    // 1. Get current task status
    const currentRes = await client.query(
      'SELECT status, assigned_team_id FROM tasks WHERE task_id = $1 LIMIT 1 FOR UPDATE;',
      [taskId]
    );

    if (currentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    const currentStatus = currentRes.rows[0].status;

    // 2. Perform Update
    let updateQuery = '';
    let updateParams = [];

    if (assigned_team_id !== undefined && new_status) {
      updateQuery = `
        UPDATE tasks 
        SET status = $1, assigned_team_id = $2
        WHERE task_id = $3
        RETURNING *;
      `;
      updateParams = [new_status, assigned_team_id, taskId];
    } else if (new_status) {
      updateQuery = `
        UPDATE tasks 
        SET status = $1
        WHERE task_id = $2
        RETURNING *;
      `;
      updateParams = [new_status, taskId];
    } else {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'No update parameters provided.' }, { status: 400 });
    }

    const taskRes = await client.query(updateQuery, updateParams);

    // 3. Record Audit Log
    await client.query(`
      INSERT INTO task_history (task_id, actor_id, actor_role, action, from_status, to_status, remarks)
      VALUES ($1, $2, $3, 'STATUS_CHANGE', $4, $5, $6);
    `, [taskId, user.userId, user.role, currentStatus, new_status || currentStatus, remarks || null]);

    await client.query('COMMIT');
    return NextResponse.json(taskRes.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Task status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}