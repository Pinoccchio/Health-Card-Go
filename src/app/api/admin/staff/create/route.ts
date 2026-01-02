import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { logAuditAction, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/utils/auditLog';

/**
 * POST /api/admin/staff/create
 *
 * Create a new Staff account for disease surveillance.
 * Only accessible by Super Admin.
 *
 * Staff members:
 * - Can enter disease data for ALL diseases (Measles, Rabies, Malaria, Dengue, Other)
 * - Cannot handle appointments
 * - Cannot create medical records
 * - Can view analytics and generate reports
 *
 * Request body:
 * - first_name: string (required)
 * - last_name: string (required)
 * - email: string (required, unique)
 * - password: string (required, min 8 characters)
 * - contact_number: string (optional)
 */
export async function POST(request: Request) {
  try {
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

    // Only super_admin can create Staff
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can create Staff accounts' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      password,
      contact_number,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    if (!first_name?.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }
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

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400 }
      );
    }

    // Use admin client to create user
    const supabaseAdmin = createAdminClient();

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser.users.find((u) => u.email === email.toLowerCase());

    if (emailExists) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    // Create auth user
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (createAuthError) {
      console.error('Error creating auth user:', createAuthError);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    if (!authUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Update the auto-created profile (created by Supabase trigger on auth.users insert)
    // Note: assigned_service_id is NULL for Staff (they handle ALL diseases)
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .update({
        email: email.toLowerCase(),
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        contact_number: contact_number?.trim() || null,
        role: 'staff',
        assigned_service_id: null, // Staff not assigned to specific service
        status: 'active',
        barangay_id: 1, // Default barangay
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.user.id);

    if (profileInsertError) {
      console.error('Error creating profile:', profileInsertError);

      // Cleanup: Delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);

      return NextResponse.json(
        { error: 'Failed to create Staff profile' },
        { status: 500 }
      );
    }

    // Fetch the created Staff member
    const { data: createdStaff, error: fetchError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        contact_number,
        role,
        status,
        created_at
      `)
      .eq('id', authUser.user.id)
      .single();

    if (fetchError || !createdStaff) {
      console.error('Error fetching created staff:', fetchError);
      return NextResponse.json(
        { error: 'Staff created but failed to fetch details' },
        { status: 500 }
      );
    }

    console.log(`✅ Staff member created: ${email} (Disease Surveillance)`);

    // Log audit trail
    await logAuditAction({
      supabase,
      userId: user.id, // Super Admin who created the account
      action: AUDIT_ACTIONS.USER_CREATED,
      entityType: AUDIT_ENTITIES.STAFF,
      entityId: createdStaff.id,
      changes: {
        before: null,
        after: {
          email: createdStaff.email,
          first_name: createdStaff.first_name,
          last_name: createdStaff.last_name,
          role: createdStaff.role,
          status: createdStaff.status,
        },
      },
      request,
    });

    return NextResponse.json({
      success: true,
      message: 'Staff member created successfully',
      data: createdStaff,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Unexpected error in POST /api/admin/staff/create:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
