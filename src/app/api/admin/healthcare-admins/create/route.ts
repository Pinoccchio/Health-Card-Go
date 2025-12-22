import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/healthcare-admins/create
 *
 * Create a new Healthcare Admin account with required service assignment.
 * Only accessible by Super Admin.
 */
export async function POST(request: Request) {
  try {
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
        { error: 'Forbidden: Only Super Admin can create Healthcare Admins' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      password,
      contact_number,
      assigned_service_id,
      admin_category,
    } = body;

    const errors: Record<string, string> = {};

    if (!first_name?.trim()) errors.first_name = 'First name is required';
    if (!last_name?.trim()) errors.last_name = 'Last name is required';
    if (!email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    // Service assignment is now optional - only validate if provided
    if (assigned_service_id) {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('id, name')
        .eq('id', assigned_service_id)
        .single();

      if (serviceError || !service) {
        errors.assigned_service_id = 'Invalid service assignment';
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', errors }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser.users.find((u) => u.email === email.toLowerCase());

    if (emailExists) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (createAuthError || !authUser.user) {
      console.error('Error creating auth user:', createAuthError);
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    // Update the auto-created profile (created by Supabase trigger on auth.users insert)
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .update({
        email: email.toLowerCase(),
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        contact_number: contact_number?.trim() || null,
        role: 'healthcare_admin',
        assigned_service_id,
        admin_category: admin_category || null,
        status: 'active',
        barangay_id: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.user.id);

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: 'Failed to create Healthcare Admin profile' }, { status: 500 });
    }

    const { data: createdAdmin, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        contact_number,
        role,
        status,
        assigned_service_id,
        services:assigned_service_id (
          id,
          name
        ),
        created_at
      `)
      .eq('id', authUser.user.id)
      .single();

    if (fetchError || !createdAdmin) {
      console.error('Error fetching created admin:', fetchError);
      return NextResponse.json(
        { error: 'Healthcare Admin created but failed to fetch details' },
        { status: 500 }
      );
    }

    const serviceName = createdAdmin.services?.name || 'No service assigned';
    console.log(`✅ Healthcare Admin created: ${email} (Service: ${serviceName})`);

    return NextResponse.json({
      success: true,
      message: 'Healthcare Admin created successfully',
      data: createdAdmin,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error in POST /api/admin/healthcare-admins/create:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
