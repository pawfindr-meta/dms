import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';
import { generateDailyTaskId } from '@/lib/idGenerator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET list of tasks (filtered by user role)
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    let query = '';
    let params = [];

    if (user.role === 'MASTER_ADMIN' || user.role === 'DISPATCHER') {
      query = `
        SELECT 
          t.*,
          tm.team_name
        FROM tasks t
        LEFT JOIN teams tm ON t.assigned_team_id = tm.team_id
        ORDER BY t.created_at DESC;
      `;
    } else if (user.role === 'CSR') {
      query = `
        SELECT t.*, tm.team_name
        FROM tasks t
        LEFT JOIN teams tm ON t.assigned_team_id = tm.team_id
        WHERE t.created_by_id = $1
        ORDER BY t.created_at DESC;
      `;
      params = [user.userId];
    } else if (user.role === 'TECHNICIAN' || user.role === 'OSP') {
      const techIdentifier = user.techId || user.userId;
      query = `
        SELECT t.*, tm.team_name
        FROM tasks t
        JOIN team_members tmem ON t.assigned_team_id = tmem.team_id
        JOIN teams tm ON t.assigned_team_id = tm.team_id
        WHERE tmem.tech_id = $1
          AND t.status IN ('ASSIGNED', 'IN_PROGRESS', 'DELAYED', 'ON_HOLD', 'REASSIGNMENT_REQUESTED')
        ORDER BY t.created_at DESC;
      `;
      params = [techIdentifier];
    }

    const res = await pool.query(query, params);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create a new field task
export async function POST(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || !['CSR', 'DISPATCHER', 'MASTER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized. CSR/Admin access required.' }, { status: 403 });
  }

  const client = await pool.connect();

  try {
    const body = await request.json();
    const {
      task_type,
      account_number,
      client_password,
      client_id,
      client_name,
      contact_number,
      address,
      issue,
      landmark,
      is_unverified = false,
      install_details = null,
    } = body;

    if (!task_type || !client_name || !address) {
      return NextResponse.json({ error: 'Task Type, Client Name, and Address are required.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Generate atomic YYYYMMDD-### Task ID
    const taskId = await generateDailyTaskId(client);

    const insertTaskQuery = `
      INSERT INTO tasks (
        task_id,
        task_type,
        status,
        account_number,
        client_password,
        client_id,
        client_name,
        contact_number,
        address,
        issue,
        landmark,
        is_unverified,
        created_by_id,
        created_by_role,
        install_details
      ) VALUES ($1, $2, 'NEW', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const taskRes = await client.query(insertTaskQuery, [
      taskId,
      task_type,
      account_number || null,
      client_password || null,
      client_id || null,
      client_name.trim(),
      contact_number ? contact_number.trim() : null,
      address.trim(),
      issue ? issue.trim() : null,
      landmark ? landmark.trim() : null,
      Boolean(is_unverified),
      user.userId,
      user.role,
      install_details ? JSON.stringify(install_details) : null,
    ]);

    const newTask = taskRes.rows[0];

    // Record initial creation in audit history
    await client.query(`
      INSERT INTO task_history (task_id, actor_id, actor_role, action, from_status, to_status, remarks)
      VALUES ($1, $2, $3, 'CREATED', NULL, 'NEW', 'Task submitted via CSR Console');
    `, [taskId, user.userId, user.role]);

    await client.query('COMMIT');
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Task creation error:', error);
    return NextResponse.json({ error: error.message || 'Database error occurred' }, { status: 500 });
  } finally {
    client.release();
  }
}