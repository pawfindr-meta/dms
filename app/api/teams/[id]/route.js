import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PUT: Update Team Name and Member Roster
export async function PUT(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || !['MASTER_ADMIN', 'DISPATCHER'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized. Dispatcher or Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    return NextResponse.json({ error: 'Invalid Team ID.' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    const { team_name, member_ids = [] } = await request.json();

    if (!team_name?.trim()) {
      return NextResponse.json({ error: 'Team name cannot be empty.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Update Team Name
    const teamRes = await client.query(
      'UPDATE teams SET team_name = $1 WHERE team_id = $2 RETURNING team_id, team_name;',
      [team_name.trim(), teamId]
    );

    if (teamRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    // 2. Clear previous members of this team
    await client.query('DELETE FROM team_members WHERE team_id = $1;', [teamId]);

    // 3. Re-assign selected members (ensure no duplicate tech across teams)
    for (const techId of member_ids) {
      await client.query('DELETE FROM team_members WHERE tech_id = $1;', [techId]);
      await client.query('INSERT INTO team_members (team_id, tech_id) VALUES ($1, $2);', [
        teamId,
        techId,
      ]);
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, team: teamRes.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE: Decommission Team and Return Active Tasks to Unassigned/NEW
export async function DELETE(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || !['MASTER_ADMIN', 'DISPATCHER'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized. Dispatcher or Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    return NextResponse.json({ error: 'Invalid Team ID.' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Reset all active/in-flight tasks for this team back to 'NEW' / unassigned
    const resetTasksRes = await client.query(
      `UPDATE tasks 
       SET assigned_team_id = NULL, 
           status = 'NEW', 
           updated_at = NOW() 
       WHERE assigned_team_id = $1 
         AND status NOT IN ('COMPLETED', 'ACKNOWLEDGED', 'CANCELLED')
       RETURNING task_id;`,
      [teamId]
    );

    // 2. Clear foreign key reference on completed/cancelled history rows to avoid FK constraint violations
    await client.query(
      `UPDATE tasks 
       SET assigned_team_id = NULL 
       WHERE assigned_team_id = $1;`,
      [teamId]
    );

    // 3. Remove team member associations
    await client.query('DELETE FROM team_members WHERE team_id = $1;', [teamId]);

    // 4. Delete the team record
    const deleteRes = await client.query(
      'DELETE FROM teams WHERE team_id = $1 RETURNING team_id, team_name;',
      [teamId]
    );

    if (deleteRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json({
      success: true,
      message: `Team decommissioned successfully. ${resetTasksRes.rowCount} active task(s) returned to unassigned queue.`,
      team: deleteRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}