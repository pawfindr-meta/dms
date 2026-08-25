import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

// PUT / PATCH: Update Team Name and Member Roster
export async function PUT(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

// Change authorization check:
    if (!user || !['MASTER_ADMIN', 'DISPATCHER'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized. Dispatcher or Admin access required.' }, { status: 403 });
    }

  const { id } = await params;
  const teamId = parseInt(id, 10);
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

// DELETE: Delete Team
export async function DELETE(request, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  // Change authorization check at top of PUT and DELETE:
    if (!user || !['MASTER_ADMIN', 'DISPATCHER'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized. Dispatcher or Admin access required.' }, { status: 403 });
    }

  const { id } = await params;
  const teamId = parseInt(id, 10);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check for active tasks
    const activeTasks = await client.query(
      "SELECT task_id FROM tasks WHERE assigned_team_id = $1 AND status NOT IN ('COMPLETED', 'ACKNOWLEDGED', 'CANCELLED');",
      [teamId]
    );

    if (activeTasks.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        error: `Cannot delete team with ${activeTasks.rows.length} active tasks. Please reassign them first.`
      }, { status: 400 });
    }

    // 2. Unassign any completed history tasks so foreign key constraint doesn't fail
    await client.query('UPDATE tasks SET assigned_team_id = NULL WHERE assigned_team_id = $1;', [teamId]);

    // 3. Remove team members
    await client.query('DELETE FROM team_members WHERE team_id = $1;', [teamId]);

    // 4. Delete the team record
    await client.query('DELETE FROM teams WHERE team_id = $1;', [teamId]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Team removed successfully.' });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}