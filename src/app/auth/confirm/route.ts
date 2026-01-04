import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth Confirm Route
 *
 * Handles PKCE flow token verification for:
 * - Password reset (type=recovery)
 * - Email confirmation (type=email)
 *
 * Flow:
 * 1. User clicks link in email with token_hash
 * 2. This route verifies the token using supabase.auth.verifyOtp()
 * 3. Session is established in cookies
 * 4. Redirects to 'next' parameter (e.g., /reset-password)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/';

  console.log('Auth confirm - params:', {
    hasTokenHash: !!token_hash,
    type,
    next
  });

  if (token_hash && type) {
    const supabase = await createClient();

    try {
      // Verify OTP token and establish session
      const { error } = await supabase.auth.verifyOtp({
        type: type as 'recovery' | 'email' | 'signup',
        token_hash,
      });

      if (error) {
        console.error('OTP verification error:', error);

        // Redirect with error
        return NextResponse.redirect(
          new URL(`${next}?error=invalid_link`, request.url)
        );
      }

      console.log('OTP verified successfully, session established');

      // Success - redirect to next page with session
      return NextResponse.redirect(new URL(next, request.url));
    } catch (err) {
      console.error('Unexpected error during OTP verification:', err);

      return NextResponse.redirect(
        new URL(`${next}?error=verification_failed`, request.url)
      );
    }
  }

  // Missing parameters - redirect with error
  console.error('Missing token_hash or type parameters');

  return NextResponse.redirect(
    new URL('/reset-password?error=missing_params', request.url)
  );
}
