import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/patients/by-user/[user_id]
 * Fetch a patient by their user_id (profiles table id)
 * Used when scanning QR codes which contain user_id instead of patients table id
 * Only accessible by healthcare admins and super admins
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const supabase = await createClient();
    const { user_id } = await params;

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

    // Only healthcare admins and super admins can use this endpoint (for QR scanning)
    if (!['healthcare_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Only healthcare staff can access this endpoint' }, { status: 403 });
    }

    // Create admin client for bypassing RLS
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch patient by user_id (not patients.id)
    const { data: patient, error: fetchError } = await adminClient
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
          id,
          first_name,
          last_name,
          email,
          contact_number,
          date_of_birth,
          gender,
          barangay_id,
          emergency_contact,
          status,
          barangays(
            id,
            name,
            code
          )
        )
      `)
      .eq('user_id', user_id)
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

    // Fetch last visit (any completed appointment)
    const { data: lastVisit } = await adminClient
      .from('appointments')
      .select('appointment_date, appointment_time, status')
      .eq('patient_id', patient.id)
      .in('status', ['completed', 'in_progress'])
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        ...patient,
        last_visit: lastVisit ? {
          date: lastVisit.appointment_date,
          time: lastVisit.appointment_time,
          status: lastVisit.status,
        } : null,
      },
    });

  } catch (error) {
    console.error('Patient fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
