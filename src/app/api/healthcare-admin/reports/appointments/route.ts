import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/healthcare-admin/reports/appointments
 *
 * Fetch appointment statistics for healthcare admin's assigned service
 *
 * Access: Pattern 1 & 2 only (requires_appointment = true)
 *
 * Query Parameters:
 * - start_date: YYYY-MM-DD (required)
 * - end_date: YYYY-MM-DD (required)
 * - barangay_id: number (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role and assigned service
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        assigned_service_id,
        services:assigned_service_id (
          id,
          name,
          requires_appointment,
          requires_medical_record
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only healthcare_admin can access
    if (profile.role !== 'healthcare_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Healthcare Admin access required' },
        { status: 403 }
      );
    }

    // Check if admin has an assigned service
    if (!profile.assigned_service_id) {
      return NextResponse.json(
        { error: 'No service assigned to your account' },
        { status: 403 }
      );
    }

    const service = profile.services as any;

    console.log('[HEALTHCARE ADMIN REPORTS - APPOINTMENTS] User authenticated:', {
      user_id: user.id,
      email: user.email,
      role: profile.role,
      assigned_service_id: profile.assigned_service_id,
      service_name: service?.name,
    });

    // Check if service requires appointments (Pattern 1 & 2)
    if (!service?.requires_appointment) {
      console.log('[HEALTHCARE ADMIN REPORTS - APPOINTMENTS] Service does not require appointments:', service?.name);
      return NextResponse.json(
        { error: 'Your assigned service does not handle appointments. This report is only for appointment-based services.' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const barangayId = searchParams.get('barangay_id');

    console.log('[HEALTHCARE ADMIN REPORTS - APPOINTMENTS] Query parameters:', {
      start_date: startDate,
      end_date: endDate,
      barangay_id: barangayId,
      service_id: profile.assigned_service_id,
    });

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Pre-filter patient IDs by barangay if needed
    let patientIdsToFilter: string[] | null = null;

    if (barangayId) {
      // Get patient IDs from the selected barangay
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('barangay_id', parseInt(barangayId))
        .eq('role', 'patient');

      const userIds = profiles?.map(p => p.id) || [];

      // Convert user_ids to patient_ids
      const { data: patientRecords } = await supabase
        .from('patients')
        .select('id')
        .in('user_id', userIds);

      patientIdsToFilter = patientRecords?.map(p => p.id) || [];

      console.log('[HEALTHCARE ADMIN REPORTS - APPOINTMENTS] Barangay filter applied:', {
        barangay_id: barangayId,
        profiles_found: userIds.length,
        patient_ids_found: patientIdsToFilter.length
      });
    }

    // Build query for summary statistics
    let summaryQuery = supabase
      .from('appointments')
      .select('id, status, appointment_date', { count: 'exact' })
      .eq('service_id', profile.assigned_service_id)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate);

    // Add barangay filter by patient IDs if provided
    if (patientIdsToFilter && patientIdsToFilter.length > 0) {
      summaryQuery = summaryQuery.in('patient_id', patientIdsToFilter);
    } else if (patientIdsToFilter && patientIdsToFilter.length === 0) {
      // If barangay filter is applied but no patients found, return empty results
      return NextResponse.json({
        success: true,
        data: {
          service: {
            id: service.id,
            name: service.name,
          },
          summary: {
            total: 0,
            completed: 0,
            scheduled: 0,
            cancelled: 0,
            no_show: 0,
            in_progress: 0,
            checked_in: 0,
          },
          completion_rate: '0.00',
          status_breakdown: [
            { status: 'Completed', count: 0 },
            { status: 'Scheduled', count: 0 },
            { status: 'Cancelled', count: 0 },
            { status: 'No Show', count: 0 },
            { status: 'In Progress', count: 0 },
            { status: 'Checked In', count: 0 },
          ],
          trend_data: [],
          filters_applied: {
            start_date: startDate,
            end_date: endDate,
            barangay_id: barangayId || null,
          },
        },
      });
    }

    const { data: appointments, error: appointmentsError, count } = await summaryQuery;

    if (appointmentsError) {
      console.error('[HEALTHCARE ADMIN REPORTS - APPOINTMENTS] Error fetching appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch appointment statistics' },
        { status: 500 }
      );
    }

    console.log('[HEALTHCARE ADMIN REPORTS - APPOINTMENTS] Query executed successfully:', {
      total_count: count,
      rows_returned: appointments?.length || 0,
      date_range: `${startDate} to ${endDate}`,
    });

    // Calculate summary statistics
    const summaryStats = {
      total: count || 0,
      completed: appointments?.filter(a => a.status === 'completed').length || 0,
      scheduled: appointments?.filter(a => a.status === 'scheduled').length || 0,
      cancelled: appointments?.filter(a => a.status === 'cancelled').length || 0,
      no_show: appointments?.filter(a => a.status === 'no_show').length || 0,
      in_progress: appointments?.filter(a => a.status === 'in_progress').length || 0,
      checked_in: appointments?.filter(a => a.status === 'checked_in').length || 0,
    };

    // Calculate status breakdown for bar chart
    const statusBreakdown = [
      { status: 'Completed', count: summaryStats.completed },
      { status: 'Scheduled', count: summaryStats.scheduled },
      { status: 'Cancelled', count: summaryStats.cancelled },
      { status: 'No Show', count: summaryStats.no_show },
      { status: 'In Progress', count: summaryStats.in_progress },
      { status: 'Checked In', count: summaryStats.checked_in },
    ];

    // Calculate daily trend for line chart
    const dailyTrend: { [key: string]: number } = {};
    appointments?.forEach(appt => {
      const date = appt.appointment_date;
      dailyTrend[date] = (dailyTrend[date] || 0) + 1;
    });

    const trendData = Object.entries(dailyTrend)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get completion rate
    const completionRate = summaryStats.total > 0
      ? ((summaryStats.completed / summaryStats.total) * 100).toFixed(2)
      : '0.00';

    console.log('[HEALTHCARE ADMIN REPORTS - APPOINTMENTS] Sending response:', {
      summary_stats: summaryStats,
      completion_rate: completionRate,
      trend_data_points: trendData.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        service: {
          id: service.id,
          name: service.name,
        },
        summary: summaryStats,
        completion_rate: completionRate,
        status_breakdown: statusBreakdown,
        trend_data: trendData,
        filters_applied: {
          start_date: startDate,
          end_date: endDate,
          barangay_id: barangayId || null,
        },
      },
    });

  } catch (error) {
    console.error('[HEALTHCARE ADMIN REPORTS] Unexpected error in GET /api/healthcare-admin/reports/appointments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
