import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/feedback/pending-count
 *
 * Returns the count of pending feedback (feedback without admin response).
 * Only accessible by Super Admins.
 *
 * @returns {Object} { success: true, pendingCount: number }
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is Super Admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can access pending feedback count' },
        { status: 403 }
      );
    }

    // Count feedback without admin response
    const { count, error: countError } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .is('admin_response', null);

    if (countError) {
      console.error('Error counting pending feedback:', countError);
      return NextResponse.json(
        { error: 'Failed to count pending feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pendingCount: count || 0,
    });
  } catch (error) {
    console.error('Error in pending-count API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
