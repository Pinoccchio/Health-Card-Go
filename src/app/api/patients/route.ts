import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/patients
 * Search and retrieve patients for medical record creation
 * Supports filtering by name, patient_number, barangay_id, and status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

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

    // Only healthcare admins and super admins can search patients
    if (!['super_admin', 'healthcare_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Extract search parameters
    const search = searchParams.get('search') || '';
    const barangayId = searchParams.get('barangay_id');
    const status = searchParams.get('status') || 'active'; // Default to active patients
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
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
          status,
          date_of_birth,
          gender,
          barangay_id,
          barangays(
            id,
            name
          )
        )
      `, { count: 'exact' });

    // Filter by status (from profiles)
    if (status) {
      query = query.eq('profiles.status', status);
    }

    // Filter by barangay
    if (barangayId) {
      query = query.eq('profiles.barangay_id', parseInt(barangayId));
    }

    // Search by patient number or name
    if (search.trim()) {
      // Check if search looks like a patient number (starts with P)
      if (search.toUpperCase().startsWith('P')) {
        query = query.ilike('patient_number', `%${search}%`);
      } else {
        // Search in names using profiles relationship
        query = query.or(
          `profiles.first_name.ilike.%${search}%,profiles.last_name.ilike.%${search}%`
        );
      }
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: patients, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching patients:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    // Calculate age for each patient
    const patientsWithAge = patients?.map(patient => {
      let age = 0;

      // Only calculate age if date_of_birth exists
      if (patient.profiles.date_of_birth) {
        const birthDate = new Date(patient.profiles.date_of_birth);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      return {
        ...patient,
        age,
      };
    });

    return NextResponse.json({
      success: true,
      data: patientsWithAge || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Patient search error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
