import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateSeverity } from '@/lib/utils/severityCalculator';

/**
 * GET /api/diseases/historical
 * Fetch historical disease statistics records with optional filtering
 * (Staff and Super Admin only)
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

    // Only Staff, Super Admin, and HIV/Pregnancy Healthcare Admins can view historical disease statistics
    const isStaff = profile.role === 'staff';
    const isSuperAdmin = profile.role === 'super_admin';
    const isHIVAdmin = profile.role === 'healthcare_admin' && profile.admin_category === 'hiv';
    const isPregnancyAdmin = profile.role === 'healthcare_admin' && profile.admin_category === 'pregnancy';

    if (!isStaff && !isSuperAdmin && !isHIVAdmin && !isPregnancyAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to view disease statistics' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const diseaseType = searchParams.get('disease_type');
    const barangayId = searchParams.get('barangay_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = supabase
      .from('disease_statistics')
      .select(`
        *,
        barangays(id, name, code),
        created_by:profiles!disease_statistics_created_by_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .order('record_date', { ascending: false });

    // Apply filters
    if (diseaseType && diseaseType !== 'all') {
      query = query.eq('disease_type', diseaseType);
    }
    if (barangayId && barangayId !== 'all') {
      query = query.eq('barangay_id', parseInt(barangayId));
    }
    if (startDate) {
      query = query.gte('record_date', startDate);
    }
    if (endDate) {
      query = query.lte('record_date', endDate);
    }

    const { data: statistics, error } = await query;

    if (error) {
      console.error('Error fetching historical disease statistics:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch historical disease statistics',
          details: error.message,
          hint: error.hint || '',
          code: error.code || ''
        },
        { status: 500 }
      );
    }

    // Handle empty results gracefully
    if (!statistics || statistics.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        summary: {
          totalRecords: 0,
          totalCases: 0,
          earliestDate: null,
          latestDate: null,
          mostCommonDisease: null,
          diseaseTypeCounts: {},
        },
      });
    }

    // Calculate summary statistics
    const totalRecords = statistics?.length || 0;
    const totalCases = statistics?.reduce((sum, stat) => sum + (stat.case_count || 0), 0) || 0;

    // Find date range
    let earliestDate = null;
    let latestDate = null;
    if (statistics && statistics.length > 0) {
      const dates = statistics.map(s => s.record_date).sort();
      earliestDate = dates[0];
      latestDate = dates[dates.length - 1];
    }

    // Count by disease type
    const diseaseTypeCounts: Record<string, number> = {};
    statistics?.forEach(stat => {
      const type = stat.disease_type;
      diseaseTypeCounts[type] = (diseaseTypeCounts[type] || 0) + 1;
    });

    const mostCommonDisease = Object.entries(diseaseTypeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return NextResponse.json({
      success: true,
      data: statistics,
      count: totalRecords,
      summary: {
        totalRecords,
        totalCases,
        earliestDate,
        latestDate,
        mostCommonDisease,
        diseaseTypeCounts,
      },
    });

  } catch (error: any) {
    console.error('Error in GET historical diseases API:', error);

    // Handle timeout errors specifically
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection timeout. Please try again.',
          details: error.message || 'Connection timed out after 30 seconds',
        },
        { status: 504 } // Gateway Timeout
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/diseases/historical
 * Create a new historical disease statistics record (Staff and Super Admin only)
 * Used for importing aggregate historical data (e.g., "150 dengue cases in Jan 2020")
 */
export async function POST(request: NextRequest) {
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

    // Only Staff, Super Admin, and HIV/Pregnancy Healthcare Admins can create historical disease statistics
    const isStaff = profile.role === 'staff';
    const isSuperAdmin = profile.role === 'super_admin';
    const isHIVAdmin = profile.role === 'healthcare_admin' && profile.admin_category === 'hiv';
    const isPregnancyAdmin = profile.role === 'healthcare_admin' && profile.admin_category === 'pregnancy';

    if (!isStaff && !isSuperAdmin && !isHIVAdmin && !isPregnancyAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to create disease statistics' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const {
      disease_type,
      custom_disease_name,
      record_date,
      case_count,
      barangay_id,
      source,
      notes,
    } = body;

    // Validate required fields
    if (!disease_type || !record_date || !case_count) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: disease_type, record_date, case_count' },
        { status: 400 }
      );
    }

    // Validate case_count is positive
    if (case_count <= 0) {
      return NextResponse.json(
        { success: false, error: 'Case count must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate custom_disease_name is provided when disease_type is 'other'
    if (disease_type === 'other') {
      if (!custom_disease_name || custom_disease_name.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Custom disease name is required when disease type is "Other"' },
          { status: 400 }
        );
      }
    } else {
      // Ensure custom_disease_name is null for non-other disease types
      if (custom_disease_name) {
        return NextResponse.json(
          { success: false, error: 'Custom disease name should only be provided when disease type is "Other"' },
          { status: 400 }
        );
      }
    }

    // Validate record_date is not in the future
    // Use server's local timezone to compare dates
    const today = new Date();
    const todayString = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    if (record_date > todayString) {
      return NextResponse.json(
        { success: false, error: 'Record date cannot be in the future' },
        { status: 400 }
      );
    }

    // Fetch barangay population for severity calculation
    let barangayPopulation: number | null = null;
    if (barangay_id) {
      const { data: barangay, error: barangayError } = await supabase
        .from('barangays')
        .select('id, population')
        .eq('id', parseInt(barangay_id))
        .single();

      if (barangayError) {
        console.error('Error fetching barangay for severity calculation:', barangayError);
        return NextResponse.json(
          { success: false, error: 'Invalid barangay ID' },
          { status: 400 }
        );
      }

      barangayPopulation = barangay?.population || null;
    }

    // Auto-calculate severity based on case count and barangay population
    // Formula: (Number of cases / Population) × 100
    // High risk (critical): ≥70%, Medium risk (severe): 50-69%, Low risk (moderate): <50%
    const calculatedSeverity = calculateSeverity(parseInt(case_count), barangayPopulation);

    // Create historical disease statistics record
    const { data: statistic, error: createError } = await supabase
      .from('disease_statistics')
      .insert({
        disease_type,
        custom_disease_name: disease_type === 'other' ? custom_disease_name.trim() : null,
        record_date,
        case_count: parseInt(case_count),
        severity: calculatedSeverity, // Auto-calculated from case count and population
        barangay_id: barangay_id ? parseInt(barangay_id) : null,
        source: source || null,
        notes: notes || null,
        created_by_id: profile.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating historical disease statistics:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create historical disease statistics', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: statistic,
      message: 'Historical disease statistics created successfully',
    });

  } catch (error: any) {
    console.error('Error in POST historical diseases API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
