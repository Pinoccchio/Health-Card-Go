import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/healthcards/historical
 * Retrieve healthcard statistics with optional filtering
 * (Staff and Super Admin only)
 *
 * Query params:
 * - healthcard_type (optional): 'food_handler' | 'non_food' | 'pink'
 * - barangay_id (optional): Filter by barangay
 * - start_date (optional): YYYY-MM-DD
 * - end_date (optional): YYYY-MM-DD
 * - limit (optional): Number of records to return (default: 100)
 * - offset (optional): Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get user profile and check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, admin_category')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Allow: Staff, Super Admin, and Healthcare Admin with healthcard category
    const isStaff = profile.role === 'staff';
    const isSuperAdmin = profile.role === 'super_admin';
    const isHealthcardAdmin = profile.role === 'healthcare_admin' && profile.admin_category === 'healthcard';

    if (!isStaff && !isSuperAdmin && !isHealthcardAdmin) {
      return NextResponse.json(
        { success: false, error: 'Only Staff, Super Admins, and HealthCard Admins can view healthcard statistics' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const healthcardType = searchParams.get('healthcard_type');
    const barangayId = searchParams.get('barangay_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('healthcard_statistics')
      .select(`
        *,
        barangays:barangay_id (
          id,
          name,
          code
        ),
        profiles:created_by_id (
          id,
          first_name,
          last_name,
          role
        )
      `, { count: 'exact' })
      .order('record_date', { ascending: false });

    // Apply filters
    if (healthcardType) {
      query = query.eq('healthcard_type', healthcardType);
    }

    if (barangayId) {
      query = query.eq('barangay_id', parseInt(barangayId));
    }

    if (startDate) {
      query = query.gte('record_date', startDate);
    }

    if (endDate) {
      query = query.lte('record_date', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: records, error: queryError, count } = await query;

    if (queryError) {
      console.error('Query error:', queryError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch healthcard statistics' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const { data: summaryData } = await supabase
      .from('healthcard_statistics')
      .select('cards_issued, healthcard_type, record_date')
      .gte('record_date', startDate || '2000-01-01')
      .lte('record_date', endDate || '2099-12-31');

    const summary = {
      total_records: count || 0,
      total_cards_issued: summaryData?.reduce((sum, r) => sum + r.cards_issued, 0) || 0,
      food_handler_cards: summaryData?.filter(r => r.healthcard_type === 'food_handler').reduce((sum, r) => sum + r.cards_issued, 0) || 0,
      non_food_cards: summaryData?.filter(r => r.healthcard_type === 'non_food').reduce((sum, r) => sum + r.cards_issued, 0) || 0,
      pink_cards: summaryData?.filter(r => r.healthcard_type === 'pink').reduce((sum, r) => sum + r.cards_issued, 0) || 0, // ADDED: Pink Card count
      date_range: {
        earliest: summaryData && summaryData.length > 0 ? Math.min(...summaryData.map(r => new Date(r.record_date).getTime())) : null,
        latest: summaryData && summaryData.length > 0 ? Math.max(...summaryData.map(r => new Date(r.record_date).getTime())) : null,
      },
    };

    // Convert timestamps back to date strings
    if (summary.date_range.earliest) {
      summary.date_range.earliest = new Date(summary.date_range.earliest).toISOString().split('T')[0] as any;
    }
    if (summary.date_range.latest) {
      summary.date_range.latest = new Date(summary.date_range.latest).toISOString().split('T')[0] as any;
    }

    return NextResponse.json({
      success: true,
      data: {
        records,
        summary,
        pagination: {
          total: count || 0,
          limit,
          offset,
          has_more: (count || 0) > offset + limit,
        },
        filters_applied: {
          healthcard_type: healthcardType,
          barangay_id: barangayId,
          start_date: startDate,
          end_date: endDate,
        },
      },
    });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
