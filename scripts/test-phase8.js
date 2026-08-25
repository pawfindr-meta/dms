import pool from '../lib/db.js';

async function testPhase8() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create a Team Alpha
    const teamRes = await client.query(`
      INSERT INTO teams (team_name) VALUES ('Team Alpha - Valenzuela')
      RETURNING team_id, team_name;
    `);
    const team = teamRes.rows[0];
    console.log('✅ Created Team:', team);

    // 2. Add T-0001 to this Team
    await client.query(`
      INSERT INTO team_members (team_id, tech_id)
      VALUES ($1, 'T-0001')
      ON CONFLICT DO NOTHING;
    `, [team.team_id]);
    console.log('✅ Added T-0001 to Team Alpha');

    // 3. Assign the latest task to this team
    const latestTask = await client.query('SELECT task_id FROM tasks ORDER BY created_at DESC LIMIT 1;');
    if (latestTask.rows.length > 0) {
      const taskId = latestTask.rows[0].task_id;
      await client.query(`
        UPDATE tasks SET status = 'ASSIGNED', assigned_team_id = $1 WHERE task_id = $2;
      `, [team.team_id, taskId]);
      console.log(`✅ Assigned Task ${taskId} to Team Alpha`);
    }

    // 4. Query live active workload
    const workloadRes = await client.query(`
      SELECT 
        t.team_name,
        COUNT(tsk.task_id)::int AS active_workload
      FROM teams t
      LEFT JOIN tasks tsk ON t.team_id = tsk.assigned_team_id 
        AND tsk.status IN ('ASSIGNED', 'IN_PROGRESS', 'DELAYED', 'ON_HOLD', 'REASSIGNMENT_REQUESTED')
      WHERE t.team_id = $1
      GROUP BY t.team_name;
    `, [team.team_id]);

    console.log('📊 Active Team Workload Summary:', workloadRes.rows[0]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Phase 8 test error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

testPhase8();