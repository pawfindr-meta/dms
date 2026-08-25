export async function generateTechId(client, personnelType) {
  const prefix = personnelType === 'OSP' ? 'OSP' : 'T';
  
  // Find highest existing sequence for this type
  const query = `
    SELECT tech_id FROM technicians_osp 
    WHERE tech_id LIKE $1 
    ORDER BY tech_id DESC 
    LIMIT 1 
    FOR UPDATE;
  `;
  const res = await client.query(query, [`${prefix}-%`]);

  let sequence = 1;
  if (res.rows.length > 0) {
    const lastId = res.rows[0].tech_id;
    const parts = lastId.split('-');
    if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
      sequence = parseInt(parts[1], 10) + 1;
    }
  }

  // Format as T-0001 or OSP-0001
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}