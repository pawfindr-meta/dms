import { google } from 'googleapis';
import path from 'path';

function getGoogleAuth() {
  // 1. Production / Vercel: Decode Base64 environment variable
  if (process.env.GOOGLE_SERVICE_ACCOUNT_BASE64) {
    const rawJson = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_BASE64.trim(),
      'base64'
    ).toString('utf-8');
    const credentials = JSON.parse(rawJson);

    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  // 2. Local Fallback: Direct service-account.json file
  return new google.auth.GoogleAuth({
    keyFile: path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export async function searchClientMasterList(queryStr) {
  if (!queryStr || queryStr.trim().length < 3) return [];

  const q = queryStr.toLowerCase().trim();

  try {
    const auth = getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_MASTER_SHEET_ID;
    
    // Tab range explicitly mapped to your 'GENT' tab across Columns A to G
    const range = "'GENT'!A2:G";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];

    // Search across Account Number (Col A), Account ID (Col C), and Account Name (Col D) simultaneously
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