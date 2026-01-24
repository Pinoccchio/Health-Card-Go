import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logAuditAction, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/utils/auditLog';

/**
 * GET /api/announcements
 * Fetch active announcements for a specific audience
 * Note: Public access allowed - uses admin client to fetch data, then filters for public announcements
 */
export async function GET(request: NextRequest) {
  // Use admin client to bypass RLS and fetch announcements with profile joins
  const supabase = createAdminClient();

  try {
    const searchParams = request.nextUrl.searchParams;
    const targetAudience = searchParams.get('target_audience') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    // Fetch announcements with admin client (bypasses RLS)
    let query = supabase
      .from('announcements')
      .select(`
        *,
        profiles!announcements_created_by_fkey(first_name, last_name, role)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Only filter by is_active when NOT including inactive announcements
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    // Filter by target audience (all, patients, healthcare_admin, super_admin, education_admin, staff)
    // Show announcements for 'all' OR the specific target audience
    if (targetAudience === 'patients') {
      query = query.or('target_audience.eq.all,target_audience.eq.patients');
    } else if (targetAudience === 'healthcare_admin') {
      query = query.or('target_audience.eq.all,target_audience.eq.healthcare_admin');
    } else if (targetAudience === 'super_admin') {
      query = query.or('target_audience.eq.all,target_audience.eq.super_admin');
    } else if (targetAudience === 'education_admin') {
      query = query.or('target_audience.eq.all,target_audience.eq.education_admin');
    } else if (targetAudience === 'staff') {
      query = query.or('target_audience.eq.all,target_audience.eq.staff');
    }
    // If targetAudience is 'all', don't add any filter (show everything)

    const { data: announcements, error } = await query;

    if (error) {
      throw error;
    }

    // Add time-based "is_new" flag (posted within 48 hours)
    const now = new Date();
    const NEW_THRESHOLD_HOURS = 48;
    const newCutoff = new Date(now.getTime() - NEW_THRESHOLD_HOURS * 60 * 60 * 1000);

    // Sanitize profile data - only include first_name, last_name, and role (for transparency)
    const announcementsWithNewFlag = (announcements || []).map((announcement) => ({
      ...announcement,
      profiles: announcement.profiles ? {
        first_name: announcement.profiles.first_name,
        last_name: announcement.profiles.last_name,
        role: announcement.profiles.role,
      } : null,
      is_new: new Date(announcement.created_at) >= newCutoff,
    }));

    return NextResponse.json({
      success: true,
      data: announcementsWithNewFlag,
      count: announcementsWithNewFlag.length,
    });

  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/announcements
 * Create a new announcement (Super Admin and Healthcare Admin)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Check if user is Super Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'education_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Education Admins (HEPA) can create announcements' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, target_audience = 'all' } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'title and content are required' },
        { status: 400 }
      );
    }

    // Validate target_audience
    const validAudiences = ['all', 'patients', 'healthcare_admin', 'staff', 'super_admin', 'education_admin'];
    if (!validAudiences.includes(target_audience)) {
      return NextResponse.json(
        { success: false, error: 'Invalid target_audience' },
        { status: 400 }
      );
    }

    // Create announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        target_audience,
        created_by: user.id,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log audit trail
    await logAuditAction({
      supabase,
      userId: user.id,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_CREATED,
      entityType: AUDIT_ENTITIES.ANNOUNCEMENT,
      entityId: announcement.id,
      changes: {
        before: null,
        after: {
          title: announcement.title,
          target_audience: announcement.target_audience,
          is_active: announcement.is_active,
        },
      },
      request,
    });

    return NextResponse.json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully',
    });

  } catch (error: any) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
