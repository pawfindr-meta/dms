import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL);

export async function POST() {
  try {
    const spreadsheetId =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_MASTER_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'GOOGLE_MASTER_SHEET_ID missing in environment variables' },
        { status: 500 }
      );
    }

    const url = `https://docs.google.com/spreadsheets/d/1XcT0BTH0f9FyEd8nHDW3ijK7uKIKSU_QRpNlDx-lI7g/gviz/tq?tqx=out:csv&sheet=GENT`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Google Sheets fetch returned status ${res.status}` },
        { status: 500 }
      );
    }

    const csvText = await res.text();
    const rows = parseCSV(csvText).slice(1);

    const clientMap = new Map();

    for (const row of rows) {
      const accountNumber = row[0] ? String(row[0]).trim() : null;
      const clientId = row[2] ? String(row[2]).trim() : null;
      const clientName = row[3] ? String(row[3]).trim() : '';
      const contactNumber = row[4] ? String(row[4]).trim() : null;
      const address = row[5] ? String(row[5]).trim() : '';
      const landmark = row[6] ? String(row[6]).trim() : null;

      if (!accountNumber || !clientName) continue;

      clientMap.set(accountNumber, {
        accountNumber,
        clientId,
        clientName,
        contactNumber,
        address,
        landmark,
      });
    }

    if (clientMap.size === 0) {
      return NextResponse.json({ success: true, importedCount: 0 });
    }

    const accountNumbers = [];
    const clientIds = [];
    const clientNames = [];
    const contactNumbers = [];
    const addresses = [];
    const landmarks = [];
    const issues = [];

    for (const client of clientMap.values()) {
      accountNumbers.push(client.accountNumber);
      clientIds.push(client.clientId);
      clientNames.push(client.clientName);
      contactNumbers.push(client.contactNumber);
      addresses.push(client.address);
      landmarks.push(client.landmark);
      issues.push(null);
    }

    await sql`
      INSERT INTO clients (account_number, client_id, client_name, contact_number, address, landmark, issue)
      SELECT * FROM UNNEST(
        ${accountNumbers}::text[],
        ${clientIds}::text[],
        ${clientNames}::text[],
        ${contactNumbers}::text[],
        ${addresses}::text[],
        ${landmarks}::text[],
        ${issues}::text[]
      )
      ON CONFLICT (account_number) 
      DO UPDATE SET
        client_name = EXCLUDED.client_name,
        client_id = EXCLUDED.client_id,
        contact_number = EXCLUDED.contact_number,
        address = EXCLUDED.address,
        landmark = EXCLUDED.landmark,
        updated_at = NOW();
    `;

    return NextResponse.json({ success: true, importedCount: clientMap.size });
  } catch (err) {
    console.error('Sheets Sync Error:', err);
    return NextResponse.json({ error: err.message || 'Sheets sync failed' }, { status: 500 });
  }
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  return lines.map((line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return result;
  });
}