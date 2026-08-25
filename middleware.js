import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('dms_session')?.value;
  const { pathname } = request.nextUrl;

  // Allow public static assets and auth login API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // If no session and trying to hit a protected API route, reject with 401
  if (!token && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};