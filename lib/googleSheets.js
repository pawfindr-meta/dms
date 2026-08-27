export async function searchClientMasterList(queryStr) {
  if (!queryStr || queryStr.trim().length < 3) return [];

  const q = queryStr.toLowerCase().trim();
  const spreadsheetId =
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID || process.env.GOOGLE_MASTER_SHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_MASTER_SHEET_ID missing in environment variables');
  }

  // Google Sheets public CSV export URL (Tab: GENT)
  const url = `https://docs.google.com/spreadsheets/d/1XcT0BTH0f9FyEd8nHDW3ijK7uKIKSU_QRpNlDx-lI7g/gviz/tq?tqx=out:csv&sheet=GENT`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch Google Sheet data: HTTP ${res.status}`);
  }

  const csvText = await res.text();
  const rows = parseCSV(csvText);

  // Skip header row (row index 0)
  const dataRows = rows.slice(1);

  return dataRows
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
}

// Lightweight CSV parser handling quoted entries with commas
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