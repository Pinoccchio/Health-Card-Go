import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/staff
 *
 * Fetches all Staff members (disease surveillance).
 * Accessible by Super Admin only.
 *
 * Query params:
 * - search: search by name or email
 * - status: filter by status (active, inactive)
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

    // Only super_admin can access this endpoint
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can access this resource' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const statusFilter = searchParams.get('status');

    // Build query
    let query = supabase
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
      .eq('role', 'staff')
      .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Apply search filter
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    const { data: staff, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching Staff:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch Staff members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: staff || [],
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/staff:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
