import { searchClientMasterList } from '../lib/googleSheets.js';

async function testSearch() {
  try {
    console.log('--- Testing Search with "Constancia" ---');
    const resName = await searchClientMasterList('Constancia');
    console.log('Result for "Constancia":', resName);

    console.log('\n--- Testing Search with Account ID "1156" ---');
    const resId = await searchClientMasterList('1156');
    console.log('Result for "1156":', resId);
  } catch (err) {
    console.error('Test execution failed:', err.message);
  } finally {
    process.exit(0);
  }
}

testSearch();