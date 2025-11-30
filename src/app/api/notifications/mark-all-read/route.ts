import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * PUT /api/notifications/mark-all-read
 * Mark all user's notifications as read
 */
export async function PUT() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mark all unread notifications as read
    const { data, error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)
      .select();

    if (updateError) {
      console.error('Error marking all notifications as read:', updateError);
      return NextResponse.json(
        { error: 'Failed to update notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      message: `${data?.length || 0} notification(s) marked as read`,
    });
  } catch (error) {
    console.error('Error in mark all notifications as read API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
