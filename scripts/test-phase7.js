import pool from '../lib/db.js';

async function testPhase7() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch the most recent task
    const taskRes = await client.query('SELECT task_id, status FROM tasks ORDER BY created_at DESC LIMIT 1;');
    if (taskRes.rows.length === 0) {
      console.log('No tasks found to test. Run test-phase5.js first.');
      return;
    }

    const taskId = taskRes.rows[0].task_id;
    console.log('Testing Task Completion on Task:', taskId);

    // Test completion with resolution note
    const resolutionNote = 'Replaced damaged patch cord at subscriber modem. Signal restored to -18.2 dBm.';
    const updateRes = await client.query(`
      UPDATE tasks 
      SET status = 'COMPLETED',
          completed_by_tech_id = 'T-0001',
          resolution_note = $1,
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE task_id = $2
      RETURNING task_id, status, resolution_note, completed_by_tech_id;
    `, [resolutionNote, taskId]);

    console.log('✅ Task Successfully Completed:', updateRes.rows[0]);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during Phase 7 test:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

testPhase7();