import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';
import { verifyUserToken } from '@/lib/auth';

// GET: Fetch all teams with member rosters and active workloads
export async function GET() {
  try {
    const teamsRes = await pool.query(`
      SELECT 
        t.team_id,
        t.team_name,
        COALESCE(
          json_agg(
            json_build_object('tech_id', tech.tech_id, 'full_name', tech.full_name, 'personnel_type', tech.personnel_type)
          ) FILTER (WHERE tech.tech_id IS NOT NULL),
          '[]'
        ) AS members,
        COUNT(DISTINCT task.task_id) FILTER (WHERE task.status IN ('ASSIGNED', 'IN_PROGRESS', 'DELAYED', 'ON_HOLD', 'REASSIGNMENT_REQUESTED'))::int AS active_workload
      FROM teams t
      LEFT JOIN team_members tm ON t.team_id = tm.team_id
      LEFT JOIN technicians_osp tech ON tm.tech_id = tech.tech_id
      LEFT JOIN tasks task ON t.team_id = task.assigned_team_id
      GROUP BY t.team_id, t.team_name
      ORDER BY t.team_id ASC;
    `);

    return NextResponse.json(teamsRes.rows);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new team with optional initial members
export async function POST(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || user.role !== 'MASTER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const { team_name, member_ids = [] } = await request.json();

    if (!team_name?.trim()) {
      return NextResponse.json({ error: 'Team name is required.' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Insert Team
    const teamRes = await client.query(
      'INSERT INTO teams (team_name) VALUES ($1) RETURNING team_id, team_name;',
      [team_name.trim()]
    );
    const newTeam = teamRes.rows[0];

    // Assign Techs to new team
    for (const techId of member_ids) {
      // Remove any existing team mapping for the technician first (1 tech = 1 team)
      await client.query('DELETE FROM team_members WHERE tech_id = $1;', [techId]);
      await client.query('INSERT INTO team_members (team_id, tech_id) VALUES ($1, $2);', [
        newTeam.team_id,
        techId,
      ]);
    }

    await client.query('COMMIT');
    return NextResponse.json(newTeam, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}