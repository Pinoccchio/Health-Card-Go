import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);

  // Log incoming request
  console.log(`[${requestId}] 📊 Admin Reports - Appointments API Request:`, {
    endpoint: '/api/admin/reports/appointments',
    params: Object.fromEntries(request.nextUrl.searchParams),
    timestamp: new Date().toISOString(),
  });

  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log(`[${requestId}] ❌ Authentication failed:`, authError?.message || 'No user');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] ✅ User authenticated:`, user.id);

    // Verify Super Admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      console.log(`[${requestId}] ❌ Authorization failed:`, {
        role: profile?.role,
        error: profileError?.message,
      });
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      );
    }

    console.log(`[${requestId}] ✅ Super Admin authorized`);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const serviceId = searchParams.get('service_id');
    const barangayId = searchParams.get('barangay_id');
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_number,
        appointment_date,
        appointment_time,
        time_block,
        status,
        reason,
        completed_at,
        cancelled_at,
        service_id,
        services!inner (
          id,
          name,
          category
        ),
        patients!inner (
          patient_number,
          profiles!inner (
            first_name,
            last_name,
            barangay_id,
            barangays (
              name
            )
          )
        ),
        completed_by:completed_by_id (
          first_name,
          last_name
        )
      `);

    // Apply filters
    if (startDate) {
      query = query.gte('appointment_date', startDate);
    }
    if (endDate) {
      query = query.lte('appointment_date', endDate);
    }
    if (serviceId) {
      query = query.eq('service_id', parseInt(serviceId));
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Execute query
    const { data: appointments, error: queryError } = await query
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (queryError) {
      console.error('Error fetching appointments:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments data' },
        { status: 500 }
      );
    }

    // Filter by barangay if specified (nested filter)
    let filteredAppointments = appointments || [];
    if (barangayId) {
      filteredAppointments = filteredAppointments.filter((appt: any) => {
        const profile = appt.patients?.profiles;
        return profile?.barangay_id === parseInt(barangayId);
      });
    }

    // Calculate summary statistics
    const summary = {
      total: filteredAppointments.length,
      completed: filteredAppointments.filter((a: any) => a.status === 'completed').length,
      scheduled: filteredAppointments.filter((a: any) => a.status === 'scheduled').length,
      cancelled: filteredAppointments.filter((a: any) => a.status === 'cancelled').length,
      no_show: filteredAppointments.filter((a: any) => a.status === 'no_show').length,
      checked_in: filteredAppointments.filter((a: any) => a.status === 'checked_in').length,
      in_progress: filteredAppointments.filter((a: any) => a.status === 'in_progress').length,
    };

    // Calculate completion rate
    const completionRate = summary.total > 0
      ? ((summary.completed / summary.total) * 100).toFixed(1)
      : '0.0';

    // Status breakdown for charts
    const statusBreakdown = [
      { status: 'completed', count: summary.completed },
      { status: 'scheduled', count: summary.scheduled },
      { status: 'cancelled', count: summary.cancelled },
      { status: 'no_show', count: summary.no_show },
      { status: 'checked_in', count: summary.checked_in },
      { status: 'in_progress', count: summary.in_progress },
    ].filter(item => item.count > 0);

    // Service breakdown for charts
    const serviceBreakdown = filteredAppointments.reduce((acc: any, appt: any) => {
      const serviceName = appt.services?.name || 'Unknown';
      if (!acc[serviceName]) {
        acc[serviceName] = { service: serviceName, total: 0, completed: 0, cancelled: 0, no_show: 0 };
      }
      acc[serviceName].total++;
      if (appt.status === 'completed') acc[serviceName].completed++;
      if (appt.status === 'cancelled') acc[serviceName].cancelled++;
      if (appt.status === 'no_show') acc[serviceName].no_show++;
      return acc;
    }, {});

    // Trend data (appointments per day)
    const trendData = filteredAppointments.reduce((acc: any, appt: any) => {
      const date = appt.appointment_date;
      if (!acc[date]) {
        acc[date] = { date, count: 0, completed: 0, cancelled: 0 };
      }
      acc[date].count++;
      if (appt.status === 'completed') acc[date].completed++;
      if (appt.status === 'cancelled') acc[date].cancelled++;
      return acc;
    }, {});

    const trendArray = Object.values(trendData).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    // Transform appointments for table display
    const tableData = filteredAppointments.map((appt: any) => ({
      id: appt.id,
      appointment_number: appt.appointment_number,
      appointment_date: appt.appointment_date,
      appointment_time: appt.appointment_time,
      time_block: appt.time_block,
      status: appt.status,
      reason: appt.reason,
      completed_at: appt.completed_at,
      cancelled_at: appt.cancelled_at,
      service_name: appt.services?.name || 'Unknown',
      service_category: appt.services?.category || 'Unknown',
      patient_number: appt.patients?.patient_number || 'N/A',
      patient_name: appt.patients?.profiles
        ? `${appt.patients.profiles.first_name} ${appt.patients.profiles.last_name}`
        : 'N/A',
      barangay_name: appt.patients?.profiles?.barangays?.name || 'N/A',
      completed_by_name: appt.completed_by
        ? `${appt.completed_by.first_name} ${appt.completed_by.last_name}`
        : null,
    }));

    const duration = Date.now() - startTime;
    const responseData = {
      summary,
      completion_rate: completionRate,
      status_breakdown: statusBreakdown,
      service_breakdown: Object.values(serviceBreakdown),
      trend_data: trendArray,
      table_data: tableData,
    };

    console.log(`[${requestId}] ✅ Appointments API Success:`, {
      duration: `${duration}ms`,
      records: {
        appointments: filteredAppointments.length,
        statusBreakdown: statusBreakdown.length,
        services: Object.values(serviceBreakdown).length,
        trendPoints: trendArray.length,
        tableRows: tableData.length,
      },
      summary,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Appointments API Error (${duration}ms):`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
