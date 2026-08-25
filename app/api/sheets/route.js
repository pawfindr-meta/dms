import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { google } from 'googleapis';

const sql = neon(process.env.DATABASE_URL);

export async function POST() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const range = process.env.GOOGLE_SHEETS_RANGE || 'Sheet1!A2:Z';

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'GOOGLE_SHEETS_SPREADSHEET_ID is not configured in .env' },
        { status: 500 }
      );
    }

    // Google Service Account Authentication
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    let importedCount = 0;

    // Process and upsert rows into database
    for (const row of rows) {
      // Expected column mappings: [AccountNo, ClientID, ClientName, Contact, Address, Landmark, Issue]
      const [accountNumber, clientId, clientName, contactNumber, address, landmark, issue] = row;

      if (!clientName && !accountNumber) continue;

      await sql`
        INSERT INTO clients (account_number, client_id, client_name, contact_number, address, landmark, issue)
        VALUES (
          ${accountNumber || null},
          ${clientId || null},
          ${clientName || ''},
          ${contactNumber || null},
          ${address || ''},
          ${landmark || null},
          ${issue || null}
        )
        ON CONFLICT (account_number) 
        DO UPDATE SET
          client_name = EXCLUDED.client_name,
          contact_number = EXCLUDED.contact_number,
          address = EXCLUDED.address,
          landmark = EXCLUDED.landmark,
          issue = EXCLUDED.issue,
          updated_at = NOW();
      `;
      importedCount++;
    }

    return NextResponse.json({ success: true, importedCount });
  } catch (err) {
    console.error('Google Sheets Sync API Error:', err);
    return NextResponse.json({ error: err.message || 'Sheets sync failed' }, { status: 500 });
  }
}