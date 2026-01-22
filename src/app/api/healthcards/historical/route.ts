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

    // Allow: Staff, Super Admin, and Healthcare Admins (healthcard, hiv, pregnancy categories)
    const isStaff = profile.role === 'staff';
    const isSuperAdmin = profile.role === 'super_admin';
    const isHealthcardAdmin = profile.role === 'healthcare_admin' && profile.admin_category === 'healthcard';
    const isHIVAdmin = profile.role === 'healthcare_admin' && profile.admin_category === 'hiv';
    const isPregnancyAdmin = profile.role === 'healthcare_admin' && profile.admin_category === 'pregnancy';

    if (!isStaff && !isSuperAdmin && !isHealthcardAdmin && !isHIVAdmin && !isPregnancyAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view healthcard statistics' },
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

    // Calculate summary statistics from BOTH healthcard_statistics (Excel) AND appointments tables
    const { data: summaryData } = await supabase
      .from('healthcard_statistics')
      .select('cards_issued, healthcard_type, record_date')
      .gte('record_date', startDate || '2000-01-01')
      .lte('record_date', endDate || '2099-12-31');

    // PINK CARDS: Use ONLY healthcard_statistics data (no appointment blending)
    // HIV admin tracks pink card issuances via Excel imports, not appointments
    // For yellow/green cards: blend appointments with Excel data
    let appointmentsData: any[] = [];
    let appointmentsByType = {
      food_handler: 0,
      non_food: 0,
      pink: 0,
    };

    // Only blend appointment data for yellow/green cards (healthcard admin)
    // Pink cards are tracked separately in healthcard_statistics table only
    if (healthcardType !== 'pink') {
      // Determine service IDs to query based on healthcard_type filter
      let appointmentServiceIds: number[] = [12, 13, 14, 15]; // All healthcard services by default
      if (healthcardType === 'food_handler') {
        appointmentServiceIds = [12, 13]; // Yellow Card
      } else if (healthcardType === 'non_food') {
        appointmentServiceIds = [14, 15]; // Green Card
      }

      // Query appointments table for completed appointments
      let appointmentsQuery = supabase
        .from('appointments')
        .select('id, completed_at, service_id')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .in('service_id', appointmentServiceIds);

      // Apply date filters if present
      if (startDate) {
        appointmentsQuery = appointmentsQuery.gte('completed_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        appointmentsQuery = appointmentsQuery.lte('completed_at', `${endDate}T23:59:59`);
      }

      const { data: fetchedAppointments } = await appointmentsQuery;
      appointmentsData = fetchedAppointments || [];

      // Count appointments by healthcard type based on service_id
      appointmentsByType = {
        food_handler: appointmentsData.filter(a => [12, 13].includes(a.service_id)).length,
        non_food: appointmentsData.filter(a => [14, 15].includes(a.service_id)).length,
        pink: 0, // Never blend pink cards with appointments
      };
    }

    // Calculate summary from Excel imports ONLY (no appointment blending for pink)
    const excelFoodHandler = summaryData?.filter(r => r.healthcard_type === 'food_handler').reduce((sum, r) => sum + r.cards_issued, 0) || 0;
    const excelNonFood = summaryData?.filter(r => r.healthcard_type === 'non_food').reduce((sum, r) => sum + r.cards_issued, 0) || 0;
    const excelPink = summaryData?.filter(r => r.healthcard_type === 'pink').reduce((sum, r) => sum + r.cards_issued, 0) || 0;
    const excelTotal = summaryData?.reduce((sum, r) => sum + r.cards_issued, 0) || 0;

    const summary = {
      total_records: count || 0,
      // Combined totals (for SARIMA)
      total_cards_issued: excelTotal + appointmentsData.length,
      food_handler_cards: excelFoodHandler + appointmentsByType.food_handler,
      non_food_cards: excelNonFood + appointmentsByType.non_food,
      pink_cards: excelPink, // Excel only, no appointments
      // Separated data sources
      from_historical: {
        total: excelTotal,
        food_handler: excelFoodHandler,
        non_food: excelNonFood,
        pink: excelPink,
      },
      from_appointments: {
        total: appointmentsData.length,
        food_handler: appointmentsByType.food_handler,
        non_food: appointmentsByType.non_food,
        pink: 0, // Never track pink via appointments
      },
      date_range: {
        earliest: null as any,
        latest: null as any,
      },
    };

    // Calculate date range from Excel data only (for pink) or both sources (for yellow/green)
    const allDates: number[] = [];
    if (summaryData && summaryData.length > 0) {
      allDates.push(...summaryData.map(r => new Date(r.record_date).getTime()));
    }
    // Only include appointment dates for non-pink cards
    if (healthcardType !== 'pink' && appointmentsData.length > 0) {
      allDates.push(...appointmentsData.map(a => new Date(a.completed_at!).getTime()));
    }

    if (allDates.length > 0) {
      summary.date_range.earliest = Math.min(...allDates);
      summary.date_range.latest = Math.max(...allDates);
    }

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
