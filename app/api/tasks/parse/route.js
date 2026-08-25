import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyUserToken } from '@/lib/auth';
import { parseWithRegex } from '@/lib/pasteParser';

export async function POST(request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('dms_session')?.value;
  const user = verifyUserToken(token);

  if (!user || !['CSR', 'DISPATCHER', 'MASTER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { raw_text } = await request.json();

    if (!raw_text || raw_text.trim().length === 0) {
      return NextResponse.json({ error: 'No report text provided.' }, { status: 400 });
    }

    const parsedData = parseWithRegex(raw_text);

    if (!parsedData) {
      return NextResponse.json({
        parsed: false,
        message: 'Could not auto-extract fields. Please fill manually.'
      });
    }

    return NextResponse.json({
      parsed: true,
      data: parsedData
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}