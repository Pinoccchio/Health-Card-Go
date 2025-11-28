import { NextRequest, NextResponse } from 'next/server';

/**
 * Mock Middleware for Route Protection
 *
 * NOTE: This is a simplified mock implementation.
 * In production with Supabase, use @supabase/auth-helpers-nextjs middleware.
 */

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

// Auth routes (redirect to dashboard if already logged in)
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

// Role-based dashboard routes
const ROLE_DASHBOARDS = {
  1: '/admin/dashboard',           // Super Admin
  2: '/healthcare-admin/dashboard', // Healthcare Admin
  3: '/doctor/dashboard',           // Doctor
  4: '/patient/dashboard',          // Patient
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get mock session from cookie or create a mock check
  const sessionCookie = request.cookies.get('healthcard_mock_session');
  const isAuthenticated = !!sessionCookie?.value;

  // For mock implementation, we'll check localStorage via a different approach
  // Since middleware runs on Edge, we can't access localStorage directly
  // We'll use a simple cookie-based approach

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // If not authenticated and trying to access protected route
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and trying to access auth routes, redirect to dashboard
  if (isAuthenticated && AUTH_ROUTES.includes(pathname)) {
    // In a real implementation, we'd get the role from the session
    // For now, redirect to home
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow the request to continue
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.svg$).*)',
  ],
};
