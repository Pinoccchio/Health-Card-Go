import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/unread-count
 *
 * Returns the count of unread notifications for the authenticated user.
 * Notifications are considered unread if read_at is NULL.
 *
 * @returns {Object} { success: true, unreadCount: number }
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

    // Count unread notifications for this user
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (countError) {
      console.error('Error counting unread notifications:', countError);
      return NextResponse.json(
        { error: 'Failed to count unread notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      unreadCount: count || 0,
    });
  } catch (error) {
    console.error('Error in unread-count API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
