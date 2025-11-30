import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * PUT /api/admin/patients/[id]
 *
 * Updates patient information.
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

    // Only super_admin can edit patients
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can edit patient information' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      contact_number,
      date_of_birth,
      gender,
      barangay_id,
      emergency_contact,
    } = body;

    // Update profiles table
    const profileUpdates: any = {};
    if (first_name !== undefined) profileUpdates.first_name = first_name;
    if (last_name !== undefined) profileUpdates.last_name = last_name;
    if (email !== undefined) profileUpdates.email = email;
    if (contact_number !== undefined) profileUpdates.contact_number = contact_number;
    if (date_of_birth !== undefined) profileUpdates.date_of_birth = date_of_birth;
    if (gender !== undefined) profileUpdates.gender = gender;
    if (barangay_id !== undefined) profileUpdates.barangay_id = barangay_id;
    if (emergency_contact !== undefined) profileUpdates.emergency_contact = emergency_contact;

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdates)
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
      console.error('[SUPER ADMIN PATIENTS] Error updating patient:', updateError);
      return NextResponse.json(
        { error: 'Failed to update patient information' },
        { status: 500 }
      );
    }

    console.log('[SUPER ADMIN PATIENTS] Patient updated successfully:', patientId);

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Patient information updated successfully',
    });
  } catch (error) {
    console.error('[SUPER ADMIN PATIENTS] Unexpected error in PUT /api/admin/patients/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
