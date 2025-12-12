import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/patients/[id]
 * Fetch a specific patient by ID for medical record creation
 * Used when healthcare admins create medical records directly (not from appointments)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only healthcare admins and super admins can fetch patient details
    if (!['super_admin', 'healthcare_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch patient with profile data
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select(`
        id,
        patient_number,
        user_id,
        allergies,
        current_medications,
        medical_history,
        accessibility_requirements,
        profiles!inner(
          first_name,
          last_name,
          email,
          contact_number,
          date_of_birth,
          gender,
          barangay_id,
          status,
          barangays(
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching patient:', fetchError);

      // Check if it's a not found error
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch patient' },
        { status: 500 }
      );
    }

    // Verify patient is active
    if (patient.profiles.status !== 'active') {
      return NextResponse.json(
        { error: 'Patient is not active' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: patient,
    });

  } catch (error) {
    console.error('Patient fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
