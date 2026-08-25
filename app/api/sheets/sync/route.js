import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sql = neon(process.env.DATABASE_URL);

export async function POST() {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_MASTER_SHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'GOOGLE_SHEETS_SPREADSHEET_ID missing in environment variables' },
        { status: 500 }
      );
    }

    let auth;
    const keyPath = path.resolve(process.cwd(), 'service-account.json');

    // 1. Vercel Production (Base64 Secret)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64) {
      const decodedJson = Buffer.from(
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64,
        'base64'
      ).toString('utf-8');
      const credentials = JSON.parse(decodedJson);

      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    } 
    // 2. Local Development (File fallback)
    else if (fs.existsSync(keyPath)) {
      auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
    } else {
      return NextResponse.json(
        { error: 'No Google Service Account credentials found on server' },
        { status: 500 }
      );
    }

    const sheets = google.sheets({ version: 'v4', auth });
    const range = "'GENT'!A2:G";
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = response.data.values || [];

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
    console.error('Google Sheets Sync Error:', err);
    return NextResponse.json({ error: err.message || 'Sheets sync failed' }, { status: 500 });
  }
}