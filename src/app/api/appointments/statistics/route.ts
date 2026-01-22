import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/appointments/statistics
 *
 * Aggregates appointment data by month and status for SARIMA predictions
 *
 * Query Parameters:
 * - admin_category: 'healthcard' | 'hiv' | 'pregnancy' (required for healthcare admins)
 * - year: Optional year filter (e.g., 2024)
 * - month: Optional month filter (1-12)
 *
 * Returns:
 * - Monthly aggregation of appointments by status (completed, cancelled, no_show)
 * - Excludes 'pending', 'scheduled', 'checked_in', 'in_progress' (future/active appointments)
 * - Groups by year-month with status breakdown
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, admin_category, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const adminCategory = searchParams.get('admin_category');
    const yearFilter = searchParams.get('year');
    const monthFilter = searchParams.get('month');

    console.log('📊 [STATISTICS] Request params:', {
      role: profile.role,
      admin_category: profile.admin_category,
      requested_category: adminCategory,
      yearFilter,
      monthFilter,
    });

    // Determine which services to query based on role and category
    let serviceIds: number[] = [];
    let additionalFilters: any = {};

    if (profile.role === 'super_admin') {
      // Super admin can request any category
      if (!adminCategory) {
        return NextResponse.json(
          { success: false, error: 'admin_category parameter required for super admin' },
          { status: 400 }
        );
      }

      // Map category to service IDs
      if (adminCategory === 'healthcard') {
        serviceIds = [12, 13, 14, 15];
        // Exclude pink cards (handled by HIV admin)
        additionalFilters.card_type_filter = true;
      } else if (adminCategory === 'hiv') {
        serviceIds = [16];
      } else if (adminCategory === 'pregnancy') {
        serviceIds = [17];
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid admin_category' },
          { status: 400 }
        );
      }
    } else if (profile.role === 'healthcare_admin') {
      // Healthcare admin sees their own category only
      if (!profile.admin_category) {
        return NextResponse.json(
          { success: false, error: 'No service category assigned to your account' },
          { status: 403 }
        );
      }

      // Use admin's assigned category
      if (profile.admin_category === 'healthcard') {
        serviceIds = [12, 13, 14, 15];
        additionalFilters.card_type_filter = true;
      } else if (profile.admin_category === 'hiv') {
        serviceIds = [16];
      } else if (profile.admin_category === 'pregnancy') {
        serviceIds = [17];
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    console.log('✅ [STATISTICS] Querying services:', serviceIds);

    // Build base query for appointments
    let query = supabase
      .from('appointments')
      .select('appointment_date, status, card_type, service_id');

    // Filter by service IDs
    query = query.in('service_id', serviceIds);

    // Filter by historical statuses only (exclude active/future appointments)
    query = query.in('status', ['completed', 'cancelled', 'no_show']);

    // Apply pink card exclusion for healthcard category
    if (additionalFilters.card_type_filter) {
      query = query.or('card_type.is.null,card_type.neq.pink');
    }

    // Apply date filters if provided
    if (yearFilter) {
      const year = parseInt(yearFilter);
      if (monthFilter) {
        const month = parseInt(monthFilter);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0); // Last day of month
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

        query = query.gte('appointment_date', startDate).lte('appointment_date', endDateStr);
        console.log('📅 [STATISTICS] Filtering by month:', { startDate, endDateStr });
      } else {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte('appointment_date', startDate).lte('appointment_date', endDate);
        console.log('📅 [STATISTICS] Filtering by year:', { startDate, endDate });
      }
    }

    // Execute query
    const { data: appointments, error: queryError } = await query;

    if (queryError) {
      console.error('❌ [STATISTICS] Query error:', queryError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch appointment statistics' },
        { status: 500 }
      );
    }

    console.log('📊 [STATISTICS] Raw appointments fetched:', appointments?.length || 0);

    // Aggregate by month and status
    interface MonthlyStats {
      year: number;
      month: number;
      completed: number;
      cancelled: number;
      no_show: number;
      total: number;
    }

    const monthlyAggregation = new Map<string, MonthlyStats>();

    appointments?.forEach((apt) => {
      const date = new Date(apt.appointment_date);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12
      const key = `${year}-${String(month).padStart(2, '0')}`;

      if (!monthlyAggregation.has(key)) {
        monthlyAggregation.set(key, {
          year,
          month,
          completed: 0,
          cancelled: 0,
          no_show: 0,
          total: 0,
        });
      }

      const stats = monthlyAggregation.get(key)!;

      if (apt.status === 'completed') {
        stats.completed++;
      } else if (apt.status === 'cancelled') {
        stats.cancelled++;
      } else if (apt.status === 'no_show') {
        stats.no_show++;
      }

      stats.total++;
    });

    // Convert to sorted array
    const monthlyData = Array.from(monthlyAggregation.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

    console.log('✅ [STATISTICS] Aggregated data:', {
      months: monthlyData.length,
      totalAppointments: monthlyData.reduce((sum, m) => sum + m.total, 0),
    });

    // Calculate summary statistics
    const summary = {
      total_appointments: appointments?.length || 0,
      total_completed: monthlyData.reduce((sum, m) => sum + m.completed, 0),
      total_cancelled: monthlyData.reduce((sum, m) => sum + m.cancelled, 0),
      total_no_show: monthlyData.reduce((sum, m) => sum + m.no_show, 0),
      date_range: {
        earliest: monthlyData.length > 0 ? `${monthlyData[0].year}-${String(monthlyData[0].month).padStart(2, '0')}` : null,
        latest: monthlyData.length > 0 ? `${monthlyData[monthlyData.length - 1].year}-${String(monthlyData[monthlyData.length - 1].month).padStart(2, '0')}` : null,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        monthly: monthlyData,
        summary,
      },
    });

  } catch (error: any) {
    console.error('❌ [STATISTICS] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
