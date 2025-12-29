import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * PUT /api/admin/patients/[id]/status
 *
 * Updates patient status (activate/deactivate).
 * Accessible by Super Admin only.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: patientId } = await params;

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

    // Only super_admin can change patient status
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can change patient status' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: active, inactive, suspended' },
        { status: 400 }
      );
    }

    // Update patient status
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', patientId)
      .eq('role', 'patient')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        status,
        contact_number,
        date_of_birth,
        gender,
        emergency_contact,
        created_at,
        approved_at,
        approved_by,
        rejection_reason,
        barangay_id,
        barangays (
          id,
          name,
          code
        ),
        patients (
          patient_number,
          allergies,
          medical_history,
          current_medications
        )
      `)
      .single();

    if (updateError) {
      console.error('[SUPER ADMIN PATIENTS] Error updating patient status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update patient status' },
        { status: 500 }
      );
    }

    console.log('[SUPER ADMIN PATIENTS] Patient status updated successfully:', patientId, 'New status:', status);

    // Revalidate the patients page cache
    revalidatePath('/admin/patients');

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: `Patient ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('[SUPER ADMIN PATIENTS] Unexpected error in PUT /api/admin/patients/[id]/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
