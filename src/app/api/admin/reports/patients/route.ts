import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);

  // Log incoming request
  console.log(`[${requestId}] 👥 Admin Reports - Patients API Request:`, {
    endpoint: '/api/admin/reports/patients',
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
    const barangayId = searchParams.get('barangay_id');
    const statusFilter = searchParams.get('status');

    // Build query for patients
    let query = supabase
      .from('patients')
      .select(`
        id,
        patient_number,
        registration_date,
        no_show_count,
        suspended_until,
        last_no_show_at,
        booking_count,
        created_at,
        profiles:user_id (
          id,
          first_name,
          last_name,
          email,
          contact_number,
          status,
          barangay_id,
          gender,
          date_of_birth,
          barangays (
            id,
            name
          )
        )
      `);

    // Execute query
    const { data: patients, error: queryError } = await query.order('created_at', { ascending: false });

    if (queryError) {
      console.error('Error fetching patients:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch patients data' },
        { status: 500 }
      );
    }

    // Filter by date range (registration_date or created_at)
    let filteredPatients = patients || [];
    if (startDate || endDate || barangayId || statusFilter) {
      filteredPatients = filteredPatients.filter((patient: any) => {
        const regDate = patient.registration_date || patient.created_at?.split('T')[0];
        const profile = patient.profiles;

        // Date filter
        if (startDate && regDate < startDate) return false;
        if (endDate && regDate > endDate) return false;

        // Barangay filter
        if (barangayId && profile?.barangay_id !== parseInt(barangayId)) return false;

        // Status filter
        if (statusFilter && profile?.status !== statusFilter) return false;

        return true;
      });
    }

    // Get total appointment counts for each patient
    const patientIds = filteredPatients.map((p: any) => p.id);
    const { data: appointmentCounts } = await supabase
      .from('appointments')
      .select('patient_id, status')
      .in('patient_id', patientIds);

    // Create appointment count map
    const appointmentMap = (appointmentCounts || []).reduce((acc: any, appt: any) => {
      if (!acc[appt.patient_id]) {
        acc[appt.patient_id] = { total: 0, completed: 0, cancelled: 0, no_show: 0 };
      }
      acc[appt.patient_id].total++;
      if (appt.status === 'completed') acc[appt.patient_id].completed++;
      if (appt.status === 'cancelled') acc[appt.patient_id].cancelled++;
      if (appt.status === 'no_show') acc[appt.patient_id].no_show++;
      return acc;
    }, {});

    // Calculate summary statistics
    const summary = {
      total_patients: filteredPatients.length,
      active: filteredPatients.filter((p: any) => p.profiles?.status === 'active').length,
      inactive: filteredPatients.filter((p: any) => p.profiles?.status === 'inactive').length,
      suspended: filteredPatients.filter((p: any) => p.profiles?.status === 'suspended').length,
      pending: filteredPatients.filter((p: any) => p.profiles?.status === 'pending').length,
    };

    // Status breakdown for charts
    const statusBreakdown = [
      { status: 'active', count: summary.active },
      { status: 'inactive', count: summary.inactive },
      { status: 'suspended', count: summary.suspended },
      { status: 'pending', count: summary.pending },
    ].filter(item => item.count > 0);

    // Barangay distribution
    const barangayBreakdown = filteredPatients.reduce((acc: any, patient: any) => {
      const barangayName = patient.profiles?.barangays?.name || 'Unknown';
      if (!acc[barangayName]) {
        acc[barangayName] = { barangay: barangayName, count: 0 };
      }
      acc[barangayName].count++;
      return acc;
    }, {});

    // Registration trends (patients per day)
    const trendData = filteredPatients.reduce((acc: any, patient: any) => {
      const date = patient.registration_date || patient.created_at?.split('T')[0];
      if (!date) return acc;
      if (!acc[date]) {
        acc[date] = { date, count: 0 };
      }
      acc[date].count++;
      return acc;
    }, {});

    const trendArray = Object.values(trendData).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    // Transform patients for table display
    const tableData = filteredPatients.map((patient: any) => {
      const profile = patient.profiles;
      const apptStats = appointmentMap[patient.id] || { total: 0, completed: 0, cancelled: 0, no_show: 0 };

      return {
        id: patient.id,
        patient_number: patient.patient_number,
        name: profile ? `${profile.first_name} ${profile.last_name}` : 'N/A',
        email: profile?.email || 'N/A',
        contact_number: profile?.contact_number || 'N/A',
        gender: profile?.gender || 'N/A',
        date_of_birth: profile?.date_of_birth || 'N/A',
        barangay_name: profile?.barangays?.name || 'N/A',
        status: profile?.status || 'unknown',
        registration_date: patient.registration_date || patient.created_at?.split('T')[0] || 'N/A',
        total_appointments: apptStats.total,
        completed_appointments: apptStats.completed,
        cancelled_appointments: apptStats.cancelled,
        no_show_count: patient.no_show_count || 0,
        suspended_until: patient.suspended_until,
        last_no_show_at: patient.last_no_show_at,
        booking_count: patient.booking_count || 0,
      };
    });

    const duration = Date.now() - startTime;
    const responseData = {
      summary,
      status_breakdown: statusBreakdown,
      barangay_breakdown: Object.values(barangayBreakdown).sort((a: any, b: any) => b.count - a.count).slice(0, 15),
      trend_data: trendArray,
      table_data: tableData,
    };

    console.log(`[${requestId}] ✅ Patients API Success:`, {
      duration: `${duration}ms`,
      records: {
        patients: filteredPatients.length,
        statusBreakdown: statusBreakdown.length,
        barangays: Object.values(barangayBreakdown).length,
        trendPoints: trendArray.length,
        tableRows: tableData.length,
      },
      summary,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Patients API Error (${duration}ms):`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
