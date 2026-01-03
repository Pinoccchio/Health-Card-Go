import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { logAuditAction, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/utils/auditLog';

/**
 * GET /api/admin/staff/[id]
 *
 * Get a single Staff member by ID for editing.
 * Only accessible by Super Admin.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization - only super_admin can view
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can view Staff members' },
        { status: 403 }
      );
    }

    // Fetch the Staff member
    const { data: staff, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, contact_number, status, created_at, updated_at')
      .eq('id', id)
      .eq('role', 'staff')
      .single();

    if (fetchError || !staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: staff,
    });

  } catch (error: any) {
    console.error('Error fetching Staff member:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/staff/[id]
 *
 * Update a Staff member's details.
 * Only accessible by Super Admin.
 *
 * Request body (all optional except at least one field):
 * - first_name: string
 * - last_name: string
 * - email: string (must be unique)
 * - contact_number: string
 * - status: string (active, inactive)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only super_admin can update Staff
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can update Staff members' },
        { status: 403 }
      );
    }

    // Check if Staff member exists
    const { data: existingStaff, error: fetchError } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', id)
      .eq('role', 'staff')
      .single();

    if (fetchError || !existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      contact_number,
      status,
    } = body;

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    // Validate and add fields to update
    if (first_name !== undefined) {
      if (!first_name?.trim()) {
        return NextResponse.json(
          { error: 'First name cannot be empty' },
          { status: 400 }
        );
      }
      updates.first_name = first_name.trim();
    }

    if (last_name !== undefined) {
      if (!last_name?.trim()) {
        return NextResponse.json(
          { error: 'Last name cannot be empty' },
          { status: 400 }
        );
      }
      updates.last_name = last_name.trim();
    }

    if (email !== undefined) {
      if (!email?.trim()) {
        return NextResponse.json(
          { error: 'Email cannot be empty' },
          { status: 400 }
        );
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check if email is already in use by another user
      if (email.toLowerCase() !== existingStaff.email.toLowerCase()) {
        const { data: emailCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .neq('id', id)
          .single();

        if (emailCheck) {
          return NextResponse.json(
            { error: 'Email already in use' },
            { status: 409 }
          );
        }

        updates.email = email.toLowerCase();

        // Update auth email
        const supabaseAdmin = createAdminClient();
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          { email: email.toLowerCase() }
        );

        if (authUpdateError) {
          console.error('Error updating auth email:', authUpdateError);
          return NextResponse.json(
            { error: 'Failed to update email' },
            { status: 500 }
          );
        }
      }
    }

    if (contact_number !== undefined) {
      updates.contact_number = contact_number?.trim() || null;
    }

    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be active or inactive' },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    // Check if there are any fields to update
    if (Object.keys(updates).length === 1) { // Only updated_at
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS (authorization already checked above)
    const supabaseAdmin = createAdminClient();

    // Update profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating Staff member:', updateError);
      return NextResponse.json(
        { error: 'Failed to update Staff member' },
        { status: 500 }
      );
    }

    // Fetch updated Staff member
    const { data: updatedStaff, error: fetchUpdatedError } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        contact_number,
        role,
        status,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (fetchUpdatedError || !updatedStaff) {
      return NextResponse.json(
        { error: 'Staff member updated but failed to fetch details' },
        { status: 500 }
      );
    }

    console.log(`✅ Staff member updated: ${updatedStaff.email}`);

    // Log audit action
    await logAuditAction({
      supabase,
      userId: user.id,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: AUDIT_ENTITIES.STAFF,
      entityId: id,
      changes: {
        before: existingStaff,
        after: updatedStaff,
      },
      request,
    });

    // Revalidate the users page cache
    revalidatePath('/admin/users');

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully',
      data: updatedStaff,
    });

  } catch (error: any) {
    console.error('Unexpected error in PATCH /api/admin/staff/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/staff/[id]
 *
 * Delete a Staff account.
 * Only accessible by Super Admin.
 *
 * This will delete:
 * - Auth user
 * - Profile record
 * - Related records (cascading delete via foreign keys)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only super_admin can delete Staff
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can delete Staff members' },
        { status: 403 }
      );
    }

    // Check if Staff member exists
    const { data: existingStaff, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .eq('id', id)
      .eq('role', 'staff')
      .single();

    if (fetchError || !existingStaff) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    // Use admin client to delete user
    const supabaseAdmin = createAdminClient();

    // Delete auth user (this will cascade to profile via trigger or foreign key)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return NextResponse.json(
        { error: 'Failed to delete Staff member' },
        { status: 500 }
      );
    }

    // Delete profile record (in case cascade didn't work)
    await supabase.from('profiles').delete().eq('id', id);

    console.log(`✅ Staff member deleted: ${existingStaff.email}`);

    // Log audit action
    await logAuditAction({
      supabase,
      userId: user.id,
      action: AUDIT_ACTIONS.USER_DELETED,
      entityType: AUDIT_ENTITIES.STAFF,
      entityId: id,
      changes: {
        before: existingStaff,
        after: null,
      },
      request,
    });

    // Revalidate the users page cache
    revalidatePath('/admin/users');

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully',
      data: {
        id: existingStaff.id,
        email: existingStaff.email,
        name: `${existingStaff.first_name} ${existingStaff.last_name}`,
      },
    });

  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/admin/staff/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
