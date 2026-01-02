import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/announcements/unread-count
 *
 * Returns the count of unread announcements for the authenticated user.
 * Announcements are considered unread if they don't exist in user_announcement_reads table.
 *
 * Features:
 * - Filters announcements by target_audience (patients, all)
 * - Only counts active announcements
 * - Excludes announcements already marked as read by the user
 *
 * @returns {Object} { success: true, unreadCount: number, totalCount: number }
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

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine target audience based on role
    let targetAudience: string;
    switch (profile.role) {
      case 'patient':
        targetAudience = 'patients';
        break;
      case 'healthcare_admin':
        targetAudience = 'healthcare_admin';
        break;
      case 'super_admin':
        targetAudience = 'super_admin';
        break;
      case 'staff':
        targetAudience = 'staff';
        break;
      default:
        targetAudience = 'all';
    }

    // Get all active announcements targeted to this user's role or 'all'
    const { data: allAnnouncements, error: announcementsError } = await supabase
      .from('announcements')
      .select('id')
      .eq('is_active', true)
      .or(`target_audience.eq.all,target_audience.eq.${targetAudience}`)
      .order('created_at', { ascending: false });

    if (announcementsError) {
      console.error('Error fetching announcements:', announcementsError);
      return NextResponse.json(
        { error: 'Failed to fetch announcements' },
        { status: 500 }
      );
    }

    const totalCount = allAnnouncements?.length || 0;

    // If no announcements, return early
    if (totalCount === 0) {
      return NextResponse.json({
        success: true,
        unreadCount: 0,
        totalCount: 0,
      });
    }

    // Get announcements that the user has already read
    const { data: readAnnouncements, error: readsError } = await supabase
      .from('user_announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id);

    if (readsError) {
      console.error('Error fetching read announcements:', readsError);
      // If we can't fetch reads, assume all are unread (fail-safe)
      return NextResponse.json({
        success: true,
        unreadCount: totalCount,
        totalCount,
      });
    }

    // Create a Set of read announcement IDs for fast lookup
    const readAnnouncementIds = new Set(
      readAnnouncements?.map((read) => read.announcement_id) || []
    );

    // Count unread announcements (those not in the read set)
    const unreadCount = allAnnouncements.filter(
      (announcement) => !readAnnouncementIds.has(announcement.id)
    ).length;

    // Count NEW announcements (posted within 48 hours)
    const now = new Date();
    const NEW_THRESHOLD_HOURS = 48;
    const newCutoff = new Date(now.getTime() - NEW_THRESHOLD_HOURS * 60 * 60 * 1000);

    const recentCount = allAnnouncements.filter(
      (announcement) => new Date(announcement.created_at) >= newCutoff
    ).length;

    // Badge count = unread + recent (deduplicated)
    // If announcement is both recent AND unread, count it once
    const badgeCount = allAnnouncements.filter(
      (announcement) => {
        const isNew = new Date(announcement.created_at) >= newCutoff;
        const isUnread = !readAnnouncementIds.has(announcement.id);
        return isNew || isUnread;
      }
    ).length;

    return NextResponse.json({
      success: true,
      unreadCount, // Personalized unread count
      recentCount, // Time-based recent count
      badgeCount, // Combined count for sidebar badge
      totalCount,
    });
  } catch (error) {
    console.error('Error in unread-count API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
