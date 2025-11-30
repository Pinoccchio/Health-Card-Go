import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/patients
 *
 * Fetches all patients (all statuses) for admin management.
 * Accessible by Super Admin and Healthcare Admins only.
 */
export async function GET(request: Request) {
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

    // Only super_admin and healthcare_admin can access this endpoint
    if (profile.role !== 'super_admin' && profile.role !== 'healthcare_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can access this resource' },
        { status: 403 }
      );
    }

    // Fetch ALL patients with barangay and patient information
    const { data: allPatients, error: fetchError } = await supabase
      .from('profiles')
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
      .eq('role', 'patient')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching patients:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: allPatients || [],
      count: allPatients?.length || 0,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/patients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
