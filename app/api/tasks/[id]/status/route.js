import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { id } = await params;
  const taskId = id;
  const client = await pool.connect();

  try {
    const {
      new_status,
      assigned_team_id,
      resolution_notes,
      materials,
      reassign_reason,
      remarks,
    } = await request.json();

    if (!new_status && assigned_team_id === undefined) {
      return NextResponse.json({ error: 'No update parameters provided.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Get current task status and verify existence
    const currentRes = await client.query(
      'SELECT status, assigned_team_id FROM tasks WHERE task_id = $1 LIMIT 1 FOR UPDATE;',
      [taskId]
    );

    if (currentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    const currentStatus = currentRes.rows[0].status;
    const currentTeamId = currentRes.rows[0].assigned_team_id;

    // 2. Build Dynamic Update Statement
    const updates = [];
    const updateParams = [];
    let paramIndex = 1;

    if (new_status) {
      updates.push(`status = $${paramIndex++}`);
      updateParams.push(new_status);
    }

    if (assigned_team_id !== undefined) {
      updates.push(`assigned_team_id = $${paramIndex++}`);
      updateParams.push(assigned_team_id === null ? null : parseInt(assigned_team_id, 10));
    }

    if (resolution_notes !== undefined) {
      updates.push(`resolution_notes = $${paramIndex++}`);
      updateParams.push(resolution_notes);
    }

    if (materials !== undefined) {
      updates.push(`materials = $${paramIndex++}`);
      updateParams.push(typeof materials === 'object' ? JSON.stringify(materials) : materials);
    }

    if (reassign_reason !== undefined) {
      updates.push(`reassign_reason = $${paramIndex++}`);
      updateParams.push(reassign_reason);
    }

    updates.push(`updated_at = NOW()`);

    updateParams.push(taskId);
    const updateQuery = `
      UPDATE tasks 
      SET ${updates.join(', ')}
      WHERE task_id = $${paramIndex}
      RETURNING *;
    `;

    const taskRes = await client.query(updateQuery, updateParams);

    // 3. Compile Human-Readable Audit Remarks
    let auditRemarks = remarks || '';
    if (new_status === 'COMPLETED' && resolution_notes) {
      const matSummary = materials
        ? ` | Materials: Drop ${materials.dropCableMeters || 0}m, Connectors: ${materials.fastConnectors || 0}, Patch: ${materials.patchCords || 0}`
        : '';
      auditRemarks = `Resolved: ${resolution_notes}${matSummary}`;
    } else if (new_status === 'REASSIGNMENT_REQUESTED' && reassign_reason) {
      auditRemarks = `Escalation / Roadblock: ${reassign_reason}`;
    } else if (new_status === 'ASSIGNED' && assigned_team_id) {
      auditRemarks = `Assigned to Unit #${assigned_team_id}`;
    }

    // 4. Record Audit Log
    await client.query(
      `
      INSERT INTO task_history (task_id, actor_id, actor_role, action, from_status, to_status, remarks)
      VALUES ($1, $2, $3, 'STATUS_CHANGE', $4, $5, $6);
    `,
      [
        taskId,
        user.userId || user.techId || user.username_or_email,
        user.role,
        currentStatus,
        new_status || currentStatus,
        auditRemarks || null,
      ]
    );

    await client.query('COMMIT');
    return NextResponse.json({ success: true, task: taskRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Task status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}