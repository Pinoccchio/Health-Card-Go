import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/healthcards/available-years
 *
 * Fetches distinct years from BOTH appointments and healthcard_statistics tables
 * to provide complete year range for SARIMA chart filters.
 *
 * Data sources:
 * - appointments table: Completed appointments (current system data)
 * - healthcard_statistics table: Historical Excel imports (2021-2025)
 *
 * NOTE: Uses admin client to bypass RLS restrictions for statistics aggregation.
 * Healthcare admins need to see all available years system-wide, not just their assigned service.
 */
export async function GET() {
  try {
    // First, verify user is authenticated
    const supabase = await createClient();
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

    // Use admin client for read-only statistics query (bypasses RLS)
    // This is necessary because healthcare_admins have service-based RLS
    // but need to see system-wide year availability for dashboard filters
    const adminClient = createAdminClient();

    // Query 1: Fetch years from completed appointments
    const { data: appointmentData, error: appointmentError } = await adminClient
      .from('appointments')
      .select('appointment_date')
      .eq('status', 'completed')
      .not('appointment_date', 'is', null);

    if (appointmentError) {
      console.error('[Available Years API] Appointment query error:', appointmentError);
    }

    // Query 2: Fetch years from historical healthcard statistics (Excel imports)
    const { data: statisticsData, error: statisticsError } = await adminClient
      .from('healthcard_statistics')
      .select('record_date')
      .not('record_date', 'is', null);

    if (statisticsError) {
      console.error('[Available Years API] Statistics query error:', statisticsError);
    }

    // Check if both queries failed
    if (appointmentError && statisticsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch years from both data sources' },
        { status: 500 }
      );
    }

    // Extract unique years with counts from BOTH sources
    const yearCounts: Record<number, number> = {};

    // Add appointment years
    if (appointmentData) {
      appointmentData.forEach((row) => {
        const year = new Date(row.appointment_date).getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      });
    }

    // Add historical statistics years
    if (statisticsData) {
      statisticsData.forEach((row) => {
        const year = new Date(row.record_date).getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      });
    }

    // Convert to sorted array with counts
    const yearsWithCounts = Object.keys(yearCounts)
      .map(Number)
      .sort((a, b) => a - b)
      .map((year) => ({
        year,
        count: yearCounts[year],
      }));

    console.log('[Available Years API] Found years:', yearsWithCounts);

    return NextResponse.json({
      success: true,
      years: yearsWithCounts.map(y => y.year), // For backward compatibility
      yearsWithCounts, // Enhanced data with counts
      dataSources: {
        appointments: appointmentData?.length || 0,
        statistics: statisticsData?.length || 0,
      },
    });
  } catch (error) {
    console.error('[Available Years API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
