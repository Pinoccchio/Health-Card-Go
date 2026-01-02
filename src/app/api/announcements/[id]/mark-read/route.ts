import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/announcements/[id]/mark-read
 *
 * Marks a specific announcement as read for the authenticated user.
 * Creates a record in user_announcement_reads table.
 *
 * Features:
 * - Idempotent: Multiple calls for same announcement are safe (UNIQUE constraint)
 * - Validates announcement exists and is active
 * - Only allows users to mark announcements as read for themselves
 *
 * @param {Object} context - Route context with params
 * @param {string} context.params.id - Announcement ID
 * @returns {Object} { success: true, message: string }
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const announcementId = params.id;

    // Validate announcement exists and is active
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('id, is_active')
      .eq('id', announcementId)
      .single();

    if (announcementError || !announcement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      );
    }

    if (!announcement.is_active) {
      return NextResponse.json(
        { error: 'Cannot mark inactive announcement as read' },
        { status: 400 }
      );
    }

    // Check if already marked as read
    const { data: existingRead } = await supabase
      .from('user_announcement_reads')
      .select('id')
      .eq('user_id', user.id)
      .eq('announcement_id', announcementId)
      .maybeSingle();

    if (existingRead) {
      // Already marked as read - idempotent operation
      return NextResponse.json({
        success: true,
        message: 'Announcement already marked as read',
        alreadyRead: true,
      });
    }

    // Insert read record
    const { error: insertError } = await supabase
      .from('user_announcement_reads')
      .insert({
        user_id: user.id,
        announcement_id: announcementId,
        read_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error marking announcement as read:', insertError);

      // Check if error is due to duplicate entry (race condition)
      if (insertError.code === '23505') {
        // Unique constraint violation
        return NextResponse.json({
          success: true,
          message: 'Announcement already marked as read',
          alreadyRead: true,
        });
      }

      return NextResponse.json(
        { error: 'Failed to mark announcement as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement marked as read',
      alreadyRead: false,
    });
  } catch (error) {
    console.error('Error in mark-read API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
