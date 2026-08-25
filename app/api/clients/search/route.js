import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length < 2) {
      return NextResponse.json([]);
    }

    const term = `%${q.trim()}%`;
    const results = await sql`
      SELECT account_number, client_id, client_name, contact_number, address, landmark, issue
      FROM clients
      WHERE client_name ILIKE ${term}
         OR account_number ILIKE ${term}
         OR client_id ILIKE ${term}
      ORDER BY client_name ASC
      LIMIT 10;
    `;

    return NextResponse.json(results);
  } catch (err) {
    console.error('Client search error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}