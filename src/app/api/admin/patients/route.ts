import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/patients
 *
 * Fetches all patients (all statuses) for admin management.
 * Accessible by Super Admin and Healthcare Admins only.
 *
 * Query params:
 * - page: page number (default: 1)
 * - limit: records per page (default: 20, max: 100)
 * - status: filter by status (pending, active, inactive, rejected)
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search')?.trim() || '';

    // Build query with pagination
    let query = supabase
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
      `, { count: 'exact' })
      .eq('role', 'patient');

    // Apply status filter
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Apply search filter
    if (search) {
      console.log('🔍 [PATIENTS SEARCH] Search query:', search);
      const searchWords = search.trim().split(/\s+/);

      if (searchWords.length > 1) {
        // Multi-word search: search each word separately
        console.log('🔍 [PATIENTS SEARCH] Multi-word search, words:', searchWords.length);
        const conditions = searchWords.map(word =>
          `email.ilike.%${word}%,first_name.ilike.%${word}%,last_name.ilike.%${word}%`
        ).join(',');
        query = query.or(conditions);
      } else {
        // Single-word search
        console.log('🔍 [PATIENTS SEARCH] Single-word search');
        query = query.or(
          `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
        );
      }
    }

    // Get total count
    const { count: totalCount } = await query;

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: allPatients, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching patients:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return NextResponse.json({
      success: true,
      data: allPatients || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/patients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
