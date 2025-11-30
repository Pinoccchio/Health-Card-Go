import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/notifications
 * Fetch all notifications for the authenticated user
 * Query params:
 *  - type: filter by notification type
 *  - unread: boolean - only show unread notifications
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const typeFilter = searchParams.get('type');
    const unreadOnly = searchParams.get('unread') === 'true';

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Calculate unread count
    const { count: unreadCount, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null);

    return NextResponse.json({
      success: true,
      data: notifications || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Error in notifications API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
