import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

export async function POST(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || !['DISPATCHER', 'MASTER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized. Dispatcher access required.' }, { status: 403 });
  }

  const taskId = params.id;

  try {
    const { action, resolution, new_team_id, remarks } = await request.json();
    // action: 'APPROVED' | 'DENIED'[cite: 1]
    // resolution: 'SAME_TEAM' | 'REASSIGNED'[cite: 1]

    if (!['APPROVED', 'DENIED'].includes(action)) {
      return NextResponse.json({ error: 'Action must be either APPROVED or DENIED.' }, { status: 400 });
    }

    if (action === 'APPROVED' && resolution === 'REASSIGNED' && !new_team_id) {
      return NextResponse.json({ error: 'A new target team is required when reassigning.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query(`
        SELECT * FROM reassignment_requests 
        WHERE task_id = $1 AND status = 'PENDING'
        ORDER BY requested_at DESC LIMIT 1 FOR UPDATE;
      `, [taskId]);

      if (reqRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'No pending reassignment request found for this task.' }, { status: 404 });
      }

      const pendingReq = reqRes.rows[0];

      if (action === 'DENIED') {
        await client.query(`
          UPDATE reassignment_requests 
          SET status = 'DENIED', resolved_by = $1, resolved_at = CURRENT_TIMESTAMP
          WHERE request_id = $2;
        `, [user.userId, pendingReq.request_id]);

        // Return task to ASSIGNED status[cite: 1]
        await client.query(`
          UPDATE tasks SET status = 'ASSIGNED', updated_at = CURRENT_TIMESTAMP WHERE task_id = $1;
        `, [taskId]);

        await client.query(`
          INSERT INTO task_history (task_id, actor_id, actor_role, action, from_status, to_status, remarks)
          VALUES ($1, $2, $3, 'REASSIGNMENT_DENIED', 'REASSIGNMENT_REQUESTED', 'ASSIGNED', $4);
        `, [taskId, user.userId, user.role, remarks || 'Reassignment request denied by Dispatcher']);
      } else {
        // APPROVED[cite: 1]
        await client.query(`
          UPDATE reassignment_requests 
          SET status = 'APPROVED', resolution = $1, new_team_id = $2, resolved_by = $3, resolved_at = CURRENT_TIMESTAMP
          WHERE request_id = $4;
        `, [resolution, new_team_id || null, user.userId, pendingReq.request_id]);

        if (resolution === 'REASSIGNED') {
          await client.query(`
            UPDATE tasks 
            SET status = 'ASSIGNED', assigned_team_id = $1, assigned_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE task_id = $2;
          `, [new_team_id, taskId]);
        } else {
          // SAME_TEAM: Keep with existing team and return to ASSIGNED[cite: 1]
          await client.query(`
            UPDATE tasks SET status = 'ASSIGNED', updated_at = CURRENT_TIMESTAMP WHERE task_id = $1;
          `, [taskId]);
        }

        await client.query(`
          INSERT INTO task_history (task_id, actor_id, actor_role, action, from_status, to_status, remarks)
          VALUES ($1, $2, $3, 'REASSIGNMENT_APPROVED', 'REASSIGNMENT_REQUESTED', 'ASSIGNED', $4);
        `, [taskId, user.userId, user.role, remarks || `Reassignment approved (${resolution})`]);
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: `Reassignment request ${action.toLowerCase()} successfully.` });
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