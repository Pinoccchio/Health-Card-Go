import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/doctors
 * Get list of doctors for appointment assignment
 *
 * Query params:
 * - available: filter by availability (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only admins and doctors can view doctor list
    if (!['healthcare_admin', 'super_admin', 'doctor'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Unauthorized to view doctors list' },
        { status: 403 }
      );
    }

    // Use admin client to bypass RLS for nested profile queries
    // We've already verified authentication and authorization above
    const adminClient = createAdminClient();

    // Fetch doctors with their profiles
    const { data: doctors, error: fetchError } = await adminClient
      .from('doctors')
      .select(`
        id,
        user_id,
        schedule,
        max_patients_per_day,
        profiles!inner(
          id,
          first_name,
          last_name,
          specialization,
          license_number,
          status
        )
      `)
      .eq('profiles.status', 'active')
      .order('last_name', { foreignTable: 'profiles', ascending: true });

    if (fetchError) {
      console.error('Error fetching doctors:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch doctors' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: doctors || [],
    });

  } catch (error) {
    console.error('Doctors fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
