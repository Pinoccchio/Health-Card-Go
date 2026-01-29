/**
 * Service Historical Data Summary API
 *
 * GET /api/services/historical?service_id=16
 *
 * Returns a summary of data sources for a given service:
 * - from_appointments: completed appointments from the booking system
 * - from_historical: imported records from service_appointment_statistics
 * - combined: total of both sources (used for SARIMA)
 * - date_range: earliest and latest dates across both sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
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

    const searchParams = request.nextUrl.searchParams;
    const serviceIdParam = searchParams.get('service_id');

    if (!serviceIdParam) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: service_id' },
        { status: 400 }
      );
    }

    const serviceId = parseInt(serviceIdParam);
    const adminClient = createAdminClient();

    // 1. Fetch appointment counts from the booking system
    const { data: allAppointments, error: apptError } = await adminClient
      .from('appointments')
      .select('id, status')
      .eq('service_id', serviceId);

    if (apptError) {
      console.error('[Service Historical API] Appointment query error:', apptError);
    }

    const appointments = allAppointments || [];
    const completedCount = appointments.filter(a => a.status === 'completed').length;
    const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;
    const totalAppointments = appointments.length;

    // 2. Fetch imported historical records from service_appointment_statistics
    const { data: importedStats, error: statsError } = await adminClient
      .from('service_appointment_statistics')
      .select('id, appointments_completed, record_date')
      .eq('service_id', serviceId);

    if (statsError) {
      console.error('[Service Historical API] Statistics query error:', statsError);
    }

    const stats = importedStats || [];
    const historicalTotal = stats.reduce((sum, r) => sum + (r.appointments_completed || 0), 0);
    const recordCount = stats.length;

    // 3. Calculate date ranges separately for each source
    const historicalDates: number[] = [];
    const appointmentDates: number[] = [];

    if (stats.length > 0) {
      historicalDates.push(...stats.map(r => new Date(r.record_date).getTime()));
    }

    if (appointments.length > 0) {
      const { data: apptDateRows } = await adminClient
        .from('appointments')
        .select('appointment_date')
        .eq('service_id', serviceId)
        .order('appointment_date', { ascending: true });

      if (apptDateRows && apptDateRows.length > 0) {
        appointmentDates.push(...apptDateRows.map(a => new Date(a.appointment_date).getTime()));
      }
    }

    // Historical imports date range (only from service_appointment_statistics)
    let historicalEarliest: string | null = null;
    let historicalLatest: string | null = null;
    if (historicalDates.length > 0) {
      historicalEarliest = new Date(Math.min(...historicalDates)).toISOString();
      historicalLatest = new Date(Math.max(...historicalDates)).toISOString();
    }

    // Appointments date range (only from appointments table)
    let appointmentsEarliest: string | null = null;
    let appointmentsLatest: string | null = null;
    if (appointmentDates.length > 0) {
      appointmentsEarliest = new Date(Math.min(...appointmentDates)).toISOString();
      appointmentsLatest = new Date(Math.max(...appointmentDates)).toISOString();
    }

    // Combined date range across both sources (for backwards compatibility)
    const allDates = [...historicalDates, ...appointmentDates];
    let earliest: string | null = null;
    let latest: string | null = null;
    if (allDates.length > 0) {
      earliest = new Date(Math.min(...allDates)).toISOString();
      latest = new Date(Math.max(...allDates)).toISOString();
    }

    // 4. Build response
    const summary = {
      from_appointments: {
        total: totalAppointments,
        completed: completedCount,
        cancelled: cancelledCount,
      },
      from_historical: {
        total_appointments: historicalTotal,
        record_count: recordCount,
      },
      combined: {
        total: completedCount + historicalTotal,
      },
      date_range: {
        earliest,
        latest,
      },
      historical_date_range: {
        earliest: historicalEarliest,
        latest: historicalLatest,
      },
      appointments_date_range: {
        earliest: appointmentsEarliest,
        latest: appointmentsLatest,
      },
    };

    return NextResponse.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    console.error('[Service Historical API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
