import { NextResponse } from 'next/server';

// Lightweight edge-compatible JWT payload decoder
function parseJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request) {
  const token = request.cookies.get('dms_session')?.value;
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and auth API endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Unauthenticated API protection
  if (!token && pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
  }

  // 3. Unauthenticated Page Protection (redirect to login)
  const isAuthPage = pathname === '/login';
  const isProtectedPage =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dispatcher') ||
    pathname.startsWith('/csr') ||
    pathname.startsWith('/field');

  if (!token && isProtectedPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Token verification and Role-Based Access Control
  if (token) {
    const payload = parseJwtPayload(token);
    const role = payload?.role;

    // Invalidate malformed or expired tokens
    if (!payload || !role) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('dms_session');
      return response;
    }

    // Redirect authenticated users trying to visit /login
    if (isAuthPage) {
      if (role === 'MASTER_ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
      if (role === 'DISPATCHER') return NextResponse.redirect(new URL('/dispatcher', request.url));
      if (role === 'CSR') return NextResponse.redirect(new URL('/csr', request.url));
      if (role === 'TECHNICIAN' || role === 'OSP') return NextResponse.redirect(new URL('/field', request.url));
      return NextResponse.redirect(new URL('/csr', request.url));
    }

    // Enforce Route-to-Role Boundaries
    if (pathname.startsWith('/admin') && role !== 'MASTER_ADMIN') {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url));
    }

    if (pathname.startsWith('/dispatcher') && !['MASTER_ADMIN', 'DISPATCHER'].includes(role)) {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url));
    }

    if (pathname.startsWith('/csr') && !['MASTER_ADMIN', 'CSR'].includes(role)) {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url));
    }

    if (pathname.startsWith('/field') && !['MASTER_ADMIN', 'TECHNICIAN', 'OSP'].includes(role)) {
      return NextResponse.redirect(new URL(getDefaultRouteForRole(role), request.url));
    }
  }

  return NextResponse.next();
}

function getDefaultRouteForRole(role) {
  switch (role) {
    case 'MASTER_ADMIN':
      return '/admin';
    case 'DISPATCHER':
      return '/dispatcher';
    case 'CSR':
      return '/csr';
    case 'TECHNICIAN':
    case 'OSP':
      return '/field';
    default:
      return '/login';
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};