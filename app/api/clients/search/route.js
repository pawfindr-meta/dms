import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserToken } from '@/lib/auth';
import { searchClientMasterList } from '@/lib/googleSheets';

export async function GET(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
  }

  // Only CSR and Dispatcher are allowed to search and create tasks[cite: 1, 3]
  if (!['CSR', 'DISPATCHER', 'MASTER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden. Role cannot search client master.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';

  if (q.trim().length < 3) {
    return NextResponse.json([]); // Return empty if below threshold[cite: 1, 3]
  }

  try {
    const results = await searchClientMasterList(q);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}