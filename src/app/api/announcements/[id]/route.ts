import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logAuditAction, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/utils/auditLog';

/**
 * GET /api/announcements/[id]
 * Fetch a specific announcement by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { data: announcement, error } = await supabase
      .from('announcements')
      .select(`
        *,
        profiles!announcements_created_by_fkey(first_name, last_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Announcement not found' },
          { status: 404 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: announcement,
    });

  } catch (error: any) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/announcements/[id]
 * Update an existing announcement
 * Only the creator or Super Admin can update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin' && profile?.role !== 'education_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Super Admins and Education Admins (HEPA) can update announcements' },
        { status: 403 }
      );
    }

    // Get existing announcement to verify ownership
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('created_by')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Announcement not found' },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    // Only creator or Super Admin can update
    // Education Admin can only update their own announcements
    if (existingAnnouncement.created_by !== user.id && profile?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only update your own announcements' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, target_audience, is_active } = body;

    // Validate target_audience if provided
    if (target_audience) {
      const validAudiences = ['all', 'patients', 'healthcare_admin', 'staff', 'super_admin', 'education_admin'];
      if (!validAudiences.includes(target_audience)) {
        return NextResponse.json(
          { success: false, error: 'Invalid target_audience' },
          { status: 400 }
        );
      }
    }

    // Build update object (only include provided fields)
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (target_audience !== undefined) updateData.target_audience = target_audience;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        profiles!announcements_created_by_fkey(first_name, last_name)
      `)
      .single();

    if (error) {
      throw error;
    }

    // Log audit trail
    await logAuditAction({
      supabase,
      userId: user.id,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_UPDATED,
      entityType: AUDIT_ENTITIES.ANNOUNCEMENT,
      entityId: id,
      changes: {
        before: existingAnnouncement,
        after: updateData,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      data: announcement,
      message: 'Announcement updated successfully',
    });

  } catch (error: any) {
    console.error('Error updating announcement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/announcements/[id]
 * Delete an announcement
 * Only the creator or Super Admin can delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // CRITICAL: Only Super Admin can delete announcements
    // Education Admin (HEPA) cannot delete announcements
    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Super Admins can delete announcements' },
        { status: 403 }
      );
    }

    // Get existing announcement for audit log
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Announcement not found' },
          { status: 404 }
        );
      }
      throw fetchError;
    }

    // Super Admin can delete any announcement (no ownership check needed)

    // Delete announcement
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Log audit trail
    await logAuditAction({
      supabase,
      userId: user.id,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_DELETED,
      entityType: AUDIT_ENTITIES.ANNOUNCEMENT,
      entityId: id,
      changes: {
        before: {
          title: existingAnnouncement.title,
          target_audience: existingAnnouncement.target_audience,
          is_active: existingAnnouncement.is_active,
        },
        after: null,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
