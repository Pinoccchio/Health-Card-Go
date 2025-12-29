import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * GET /api/admin/super-admins/[id]
 *
 * Get a single Super Admin by ID for editing.
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
        { error: 'Forbidden: Only Super Admin can view Super Admins' },
        { status: 403 }
      );
    }

    // Fetch the Super Admin
    const { data: admin, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, contact_number, status, created_at, updated_at')
      .eq('id', id)
      .eq('role', 'super_admin')
      .single();

    if (fetchError || !admin) {
      return NextResponse.json({ error: 'Super Admin not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: admin,
    });

  } catch (error: any) {
    console.error('Error fetching Super Admin:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can update Super Admins' },
        { status: 403 }
      );
    }

    const { data: existingAdmin, error: fetchError } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', id)
      .eq('role', 'super_admin')
      .single();

    if (fetchError || !existingAdmin) {
      return NextResponse.json({ error: 'Super Admin not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      contact_number,
      status,
    } = body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (first_name !== undefined) {
      if (!first_name?.trim()) {
        return NextResponse.json({ error: 'First name cannot be empty' }, { status: 400 });
      }
      updates.first_name = first_name.trim();
    }

    if (last_name !== undefined) {
      if (!last_name?.trim()) {
        return NextResponse.json({ error: 'Last name cannot be empty' }, { status: 400 });
      }
      updates.last_name = last_name.trim();
    }

    if (email !== undefined) {
      if (!email?.trim()) {
        return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      if (email.toLowerCase() !== existingAdmin.email.toLowerCase()) {
        const { data: emailCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.toLowerCase())
          .neq('id', id)
          .single();

        if (emailCheck) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
        }

        updates.email = email.toLowerCase();

        const supabaseAdmin = createAdminClient();
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          { email: email.toLowerCase() }
        );

        if (authUpdateError) {
          console.error('Error updating auth email:', authUpdateError);
          return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
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

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Use admin client to bypass RLS (authorization already checked above)
    const supabaseAdmin = createAdminClient();

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating Super Admin:', updateError);
      return NextResponse.json({ error: 'Failed to update Super Admin' }, { status: 500 });
    }

    const { data: updatedAdmin, error: fetchUpdatedError } = await supabaseAdmin
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

    if (fetchUpdatedError || !updatedAdmin) {
      return NextResponse.json(
        { error: 'Super Admin updated but failed to fetch details' },
        { status: 500 }
      );
    }

    console.log(`✅ Super Admin updated: ${updatedAdmin.email}`);

    // Revalidate the users page cache
    revalidatePath('/admin/users');

    return NextResponse.json({
      success: true,
      message: 'Super Admin updated successfully',
      data: updatedAdmin,
    });

  } catch (error: any) {
    console.error('Unexpected error in PATCH /api/admin/super-admins/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can delete Super Admins' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (user.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own Super Admin account' },
        { status: 400 }
      );
    }

    const { data: existingAdmin, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .eq('id', id)
      .eq('role', 'super_admin')
      .single();

    if (fetchError || !existingAdmin) {
      return NextResponse.json({ error: 'Super Admin not found' }, { status: 404 });
    }

    const supabaseAdmin = createAdminClient();
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return NextResponse.json({ error: 'Failed to delete Super Admin' }, { status: 500 });
    }

    await supabase.from('profiles').delete().eq('id', id);

    console.log(`✅ Super Admin deleted: ${existingAdmin.email}`);

    // Revalidate the users page cache
    revalidatePath('/admin/users');

    return NextResponse.json({
      success: true,
      message: 'Super Admin deleted successfully',
      data: {
        id: existingAdmin.id,
        email: existingAdmin.email,
        name: `${existingAdmin.first_name} ${existingAdmin.last_name}`,
      },
    });

  } catch (error: any) {
    console.error('Unexpected error in DELETE /api/admin/super-admins/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
