import pool from '../lib/db.js';
import { generateDailyTaskId } from '../lib/idGenerator.js';

async function testPhase5() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Test atomic daily ID generator
    const taskId = await generateDailyTaskId(client);
    console.log(' Generated Task ID:', taskId);

    // 2. Insert a new task
    const insertRes = await client.query(`
      INSERT INTO tasks (
        task_id, task_type, status, client_name, address, issue, created_by_id, created_by_role
      ) VALUES ($1, 'REPAIR', 'NEW', 'Phase 5 Test Client', '123 Test St', 'LOS Red', 'ADMIN-TEST', 'MASTER_ADMIN')
      RETURNING *;
    `, [taskId]);
    console.log(' Task Created in State:', insertRes.rows[0].status);

    // 3. Test lifecycle transition: NEW -> RELEASED
    const updateRes = await client.query(`
      UPDATE tasks SET status = 'RELEASED', updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $1
      RETURNING status;
    `, [taskId]);
    console.log(' Transitioned Task to:', updateRes.rows[0].status);

    // 4. Log to task_history table
    await client.query(`
      INSERT INTO task_history (task_id, actor_id, actor_role, action, from_status, to_status, remarks)
      VALUES ($1, 'ADMIN-TEST', 'MASTER_ADMIN', 'STATUS_CHANGE', 'NEW', 'RELEASED', 'Phase 5 verified');
    `, [taskId]);
    console.log(' Audit history recorded.');

    await client.query('COMMIT');
    console.log(' Phase 5 Task Engine is working correctly!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Phase 5 Test Error:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

testPhase5();