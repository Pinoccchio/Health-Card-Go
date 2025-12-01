import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware - JobSync Pattern
 *
 * Simple session refresh middleware that:
 * 1. Validates and refreshes Supabase auth session
 * 2. Sets session cookies properly for server components
 * 3. Does NOT block or redirect - route protection happens in layouts
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session - this validates the session and updates cookies
  // Use getUser() for server-side validation (secure)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Optional: Basic auth redirect (uncomment if needed)
  // const { pathname } = request.nextUrl;
  // const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  // const isProtectedRoute = pathname.startsWith('/admin') ||
  //                         pathname.startsWith('/healthcare-admin') ||
  //                         pathname.startsWith('/doctor') ||
  //                         pathname.startsWith('/patient');

  // if (!user && isProtectedRoute) {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
