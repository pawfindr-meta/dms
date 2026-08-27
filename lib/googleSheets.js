import { google } from 'googleapis';
import path from 'path';

function getGoogleAuth() {
  const base64Key =
    process.env.GOOGLE_SERVICE_ACCOUNT_BASE64 ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;

  // 1. Vercel Production (Base64 Secret)
  if (base64Key) {
    const rawJson = Buffer.from(base64Key.trim(), 'base64').toString('utf-8');
    const credentials = JSON.parse(rawJson);

    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  // 2. Local Development Fallback
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(
      process.cwd(),
      process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json'
    ),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export async function searchClientMasterList(queryStr) {
  if (!queryStr || queryStr.trim().length < 3) return [];

  const q = queryStr.toLowerCase().trim();

  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId =
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_MASTER_SHEET_ID;

    const range = "'GENT'!A2:G";
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];

    return rows
      .filter((row) => {
        const accNo = row[0] || '';
        const clientId = row[2] || '';
        const clientName = row[3] || '';
        return (
          accNo.toLowerCase().includes(q) ||
          clientId.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q)
        );
      })
      .map((row) => ({
        accountNumber: row[0] || '',
        password: row[1] || '',
        clientId: row[2] || '',
        clientName: row[3] || '',
        contactNumber: row[4] || '',
        address: row[5] || '',
        landmark: row[6] || '',
      }));
  } catch (error) {
    console.error('Google Sheets Live Query Error:', error.message);
    throw error;
  }
}