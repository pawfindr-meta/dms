export async function generateDailyTaskId(client) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  const query = `
    SELECT task_id FROM tasks 
    WHERE task_id LIKE $1 
    ORDER BY task_id DESC 
    LIMIT 1 
    FOR UPDATE;
  `;
  const res = await client.query(query, [`${datePrefix}-%`]);

  let sequence = 1;
  if (res.rows.length > 0) {
    const lastId = res.rows[0].task_id;
    const parts = lastId.split('-');
    if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
      sequence = parseInt(parts[1], 10) + 1;
    }
  }

  // Generates YYYYMMDD-### (e.g., 20260824-001)
  return `${datePrefix}-${String(sequence).padStart(3, '0')}`;
}