import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Middleware for Route Protection and Authentication
 *
 * Uses Supabase Auth for session management and role-based access control.
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
  super_admin: '/admin/dashboard',
  healthcare_admin: '/healthcare-admin/dashboard',
  doctor: '/doctor/dashboard',
  patient: '/patient/dashboard',
} as const;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Update session and get user
  const { supabaseResponse, user } = await updateSession(request);

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    // If authenticated and trying to access auth routes, redirect to dashboard
    if (user && AUTH_ROUTES.includes(pathname)) {
      // Fetch user's profile to get role
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role,status`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        }
      );

      if (response.ok) {
        const profiles = await response.json();
        if (profiles.length > 0) {
          const profile = profiles[0];

          // Don't allow pending patients to access any dashboard
          if (profile.status === 'pending') {
            const pendingUrl = new URL('/verify-email', request.url);
            pendingUrl.searchParams.set(
              'message',
              'Your account is pending approval. You will be notified once approved.'
            );
            return NextResponse.redirect(pendingUrl);
          }

          const dashboardUrl = ROLE_DASHBOARDS[profile.role as keyof typeof ROLE_DASHBOARDS];
          if (dashboardUrl) {
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
          }
        }
      }

      // Fallback to home if we can't determine role
      return NextResponse.redirect(new URL('/', request.url));
    }

    return supabaseResponse;
  }

  // Protected routes - require authentication
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch user's profile for role-based access control
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role,status,admin_category`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    }
  );

  if (!response.ok) {
    // If we can't fetch profile, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const profiles = await response.json();
  if (profiles.length === 0) {
    // No profile found, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const profile = profiles[0];

  // Check if user is pending approval (patients only)
  if (profile.status === 'pending') {
    const pendingUrl = new URL('/verify-email', request.url);
    pendingUrl.searchParams.set(
      'message',
      'Your account is pending approval. You will be notified once approved.'
    );
    return NextResponse.redirect(pendingUrl);
  }

  // Check if user is inactive or rejected
  if (profile.status === 'inactive' || profile.status === 'rejected') {
    const errorUrl = new URL('/login', request.url);
    errorUrl.searchParams.set(
      'error',
      profile.status === 'rejected'
        ? 'Your account has been rejected. Please contact support.'
        : 'Your account is inactive. Please contact support.'
    );
    return NextResponse.redirect(errorUrl);
  }

  // Role-based route protection
  const userRole = profile.role;

  // Super Admin has access to all routes
  if (userRole === 'super_admin') {
    return supabaseResponse;
  }

  // Healthcare Admin access
  if (userRole === 'healthcare_admin') {
    // Healthcare admins can access their own dashboard and patient-related routes
    if (
      pathname.startsWith('/healthcare-admin') ||
      pathname.startsWith('/admin') // Some shared admin functionality
    ) {
      return supabaseResponse;
    }
  }

  // Doctor access
  if (userRole === 'doctor') {
    // Doctors can access their own dashboard and appointment-related routes
    if (pathname.startsWith('/doctor')) {
      return supabaseResponse;
    }
  }

  // Patient access
  if (userRole === 'patient') {
    // Patients can only access their own dashboard
    if (pathname.startsWith('/patient')) {
      return supabaseResponse;
    }
  }

  // If user is trying to access a route they don't have permission for,
  // redirect to their appropriate dashboard
  const dashboardUrl = ROLE_DASHBOARDS[userRole as keyof typeof ROLE_DASHBOARDS];
  if (dashboardUrl && !pathname.startsWith(dashboardUrl)) {
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // Allow the request to continue
  return supabaseResponse;
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
