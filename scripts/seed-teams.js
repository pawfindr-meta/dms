import pool from '../lib/db.js';

async function setupTeams() {
  try {
    // 1. Insert default teams without status column
    await pool.query(`
      INSERT INTO teams (team_id, team_name)
      VALUES 
        (1, 'Team Alpha - Valenzuela'),
        (2, 'Team Bravo - Malinta'),
        (3, 'Team Charlie - Marulas')
      ON CONFLICT (team_id) DO NOTHING;
    `);

    // 2. Link T-0001 to Team Alpha (team_id: 1)
    await pool.query(`
      INSERT INTO team_members (team_id, tech_id)
      VALUES (1, 'T-0001')
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Teams and Tech T-0001 linked successfully!');
  } catch (err) {
    console.error('❌ Error linking teams:', err);
  } finally {
    process.exit(0);
  }
}

setupTeams();