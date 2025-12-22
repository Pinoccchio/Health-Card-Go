import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/profile
 * Fetch the authenticated user's profile
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        admin_category,
        status,
        contact_number,
        date_of_birth,
        gender,
        specialization,
        license_number,
        barangay_id,
        emergency_contact,
        approved_at,
        approved_by,
        rejection_reason,
        created_at,
        updated_at
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // If user is a patient, get additional patient data
    if (profile.role === 'patient') {
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('patient_number, blood_type, philhealth_number, medical_history, allergies, current_medications, accessibility_requirements')
        .eq('user_id', user.id)
        .single();

      if (!patientError && patientData) {
        return NextResponse.json({
          success: true,
          data: {
            ...profile,
            patient_number: patientData.patient_number,
            blood_type: patientData.blood_type,
            philhealth_number: patientData.philhealth_number,
            medical_history: patientData.medical_history,
            allergies: patientData.allergies,
            current_medications: patientData.current_medications,
            accessibility_requirements: patientData.accessibility_requirements,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile
 * Update the authenticated user's profile
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current profile to verify role
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();

    // Build profile update object (only allow specific fields)
    const profileUpdate: any = {};

    // Personal information
    if (body.first_name !== undefined) profileUpdate.first_name = body.first_name.trim();
    if (body.last_name !== undefined) profileUpdate.last_name = body.last_name.trim();
    if (body.contact_number !== undefined) profileUpdate.contact_number = body.contact_number.trim();
    if (body.date_of_birth !== undefined) profileUpdate.date_of_birth = body.date_of_birth;
    if (body.gender !== undefined) profileUpdate.gender = body.gender;
    if (body.barangay_id !== undefined) profileUpdate.barangay_id = body.barangay_id;

    // Emergency contact (JSONB field)
    if (body.emergency_contact !== undefined) {
      profileUpdate.emergency_contact = {
        name: body.emergency_contact.name?.trim() || '',
        phone: body.emergency_contact.phone?.trim() || '',
        email: body.emergency_contact.email?.trim() || '',
      };
    }

    profileUpdate.updated_at = new Date().toISOString();

    // Update profiles table
    const { data: updatedProfile, error: updateProfileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)
      .select()
      .single();

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError);
      return NextResponse.json(
        { error: 'Failed to update profile', details: updateProfileError.message },
        { status: 500 }
      );
    }

    // If user is a patient, update patient-specific data
    if (currentProfile.role === 'patient') {
      const patientUpdate: any = {};

      if (body.blood_type !== undefined) {
        patientUpdate.blood_type = body.blood_type || null;
      }

      if (body.philhealth_number !== undefined) {
        patientUpdate.philhealth_number = body.philhealth_number?.trim() || null;
      }

      if (body.medical_history !== undefined) {
        patientUpdate.medical_history = body.medical_history;
      }

      if (body.allergies !== undefined) {
        patientUpdate.allergies = body.allergies;
      }

      if (body.current_medications !== undefined) {
        patientUpdate.current_medications = body.current_medications;
      }

      if (body.accessibility_requirements !== undefined) {
        patientUpdate.accessibility_requirements = body.accessibility_requirements?.trim() || null;
      }

      if (Object.keys(patientUpdate).length > 0) {
        patientUpdate.updated_at = new Date().toISOString();

        const { error: updatePatientError } = await supabase
          .from('patients')
          .update(patientUpdate)
          .eq('user_id', user.id);

        if (updatePatientError) {
          console.error('Error updating patient data:', updatePatientError);
          // Don't fail the entire request if patient update fails
          // Profile was already updated successfully
        }
      }

      // Fetch complete updated data
      const { data: patientData } = await supabase
        .from('patients')
        .select('patient_number, blood_type, philhealth_number, medical_history, allergies, current_medications, accessibility_requirements')
        .eq('user_id', user.id)
        .single();

      return NextResponse.json({
        success: true,
        data: {
          ...updatedProfile,
          patient_number: patientData?.patient_number,
          blood_type: patientData?.blood_type,
          philhealth_number: patientData?.philhealth_number,
          medical_history: patientData?.medical_history,
          allergies: patientData?.allergies,
          current_medications: patientData?.current_medications,
          accessibility_requirements: patientData?.accessibility_requirements,
        },
        message: 'Profile updated successfully',
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error in profile update:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
