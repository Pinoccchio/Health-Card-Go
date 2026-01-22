import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/healthcards/available-years
 *
 * Fetches distinct years from appointments table where status='completed'
 * Used to dynamically populate year filter dropdown in SARIMA charts
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

    // Query distinct years from completed appointments
    const { data, error } = await adminClient
      .rpc('get_distinct_appointment_years');

    if (error) {
      console.error('[Available Years API] RPC Error:', error);

      // Fallback: Use raw SQL query if RPC function doesn't exist
      const { data: rawData, error: rawError } = await adminClient
        .from('appointments')
        .select('appointment_date')
        .eq('status', 'completed')
        .not('appointment_date', 'is', null);

      if (rawError) {
        console.error('[Available Years API] SQL Error:', rawError);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch years' },
          { status: 500 }
        );
      }

      // Extract unique years with counts
      const yearCounts: Record<number, number> = {};
      rawData.forEach((row) => {
        const year = new Date(row.appointment_date).getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      });

      const yearsWithCounts = Object.keys(yearCounts)
        .map(Number)
        .sort((a, b) => a - b)
        .map((year) => ({
          year,
          count: yearCounts[year],
        }));

      return NextResponse.json({
        success: true,
        years: yearsWithCounts.map(y => y.year), // For backward compatibility
        yearsWithCounts, // Enhanced data with counts
      });
    }

    return NextResponse.json({
      success: true,
      years: data || [],
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
