import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);

  // Log incoming request
  console.log(`[${requestId}] 🦠 Admin Reports - Diseases API Request:`, {
    endpoint: '/api/admin/reports/diseases',
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
    const diseaseType = searchParams.get('disease_type');
    const severity = searchParams.get('severity');

    // Build query for disease_statistics (aggregated disease data)
    // Note: The system uses disease_statistics table for disease tracking, not a 'diseases' table
    let query = supabase
      .from('disease_statistics')
      .select(`
        id,
        disease_type,
        custom_disease_name,
        record_date,
        case_count,
        severity,
        notes,
        source,
        created_at,
        barangay_id,
        barangays (
          id,
          name
        )
      `);

    // Apply filters
    if (startDate) {
      query = query.gte('record_date', startDate);
    }
    if (endDate) {
      query = query.lte('record_date', endDate);
    }
    if (barangayId) {
      query = query.eq('barangay_id', parseInt(barangayId));
    }
    if (diseaseType) {
      query = query.eq('disease_type', diseaseType);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }

    // Execute query
    const { data: diseaseStats, error: queryError } = await query.order('record_date', { ascending: false });

    if (queryError) {
      console.error('Error fetching disease statistics:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch diseases data' },
        { status: 500 }
      );
    }

    const filteredStats = diseaseStats || [];

    // Calculate summary statistics based on disease_statistics (aggregated data)
    const totalCases = filteredStats.reduce((sum: number, stat: any) => sum + (stat.case_count || 0), 0);
    const highRiskCases = filteredStats
      .filter((s: any) => s.severity === 'high_risk')
      .reduce((sum: number, stat: any) => sum + (stat.case_count || 0), 0);
    const mediumRiskCases = filteredStats
      .filter((s: any) => s.severity === 'medium_risk')
      .reduce((sum: number, stat: any) => sum + (stat.case_count || 0), 0);
    const lowRiskCases = filteredStats
      .filter((s: any) => s.severity === 'low_risk')
      .reduce((sum: number, stat: any) => sum + (stat.case_count || 0), 0);

    const summary = {
      total_cases: totalCases,
      total_records: filteredStats.length,
      high_risk: highRiskCases,
      medium_risk: mediumRiskCases,
      low_risk: lowRiskCases,
      // Legacy fields for compatibility
      active: totalCases, // All stats cases considered "active" for visualization
      recovered: 0, // Not tracked in statistics table
      deceased: 0, // Not tracked in statistics table
      ongoing_treatment: 0, // Not tracked in statistics table
    };

    // Disease type breakdown
    const diseaseBreakdown = filteredStats.reduce((acc: any, stat: any) => {
      const type = stat.disease_type || 'other';
      const displayName = (stat.disease_type === 'other' || stat.disease_type === 'custom_disease') && stat.custom_disease_name
        ? stat.custom_disease_name
        : type;

      if (!acc[displayName]) {
        acc[displayName] = { disease_type: displayName, count: 0, high_risk: 0, medium_risk: 0, low_risk: 0 };
      }
      acc[displayName].count += stat.case_count || 0;
      if (stat.severity === 'high_risk') acc[displayName].high_risk += stat.case_count || 0;
      if (stat.severity === 'medium_risk') acc[displayName].medium_risk += stat.case_count || 0;
      if (stat.severity === 'low_risk') acc[displayName].low_risk += stat.case_count || 0;
      return acc;
    }, {});


    // Barangay breakdown
    const barangayBreakdown = filteredStats.reduce((acc: any, stat: any) => {
      const barangayName = stat.barangays?.name || 'Unknown';
      if (!acc[barangayName]) {
        acc[barangayName] = { barangay: barangayName, count: 0 };
      }
      acc[barangayName].count += stat.case_count || 0;
      return acc;
    }, {});

    // Trend data (cases per day)
    const trendData = filteredStats.reduce((acc: any, stat: any) => {
      const date = stat.record_date;
      if (!date) return acc;
      if (!acc[date]) {
        acc[date] = { date, count: 0 };
      }
      acc[date].count += stat.case_count || 0;
      return acc;
    }, {});

    const trendArray = Object.values(trendData).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    // Transform disease statistics for table display
    const tableData = filteredStats.map((stat: any) => {
      const diseaseDisplayName = (stat.disease_type === 'other' || stat.disease_type === 'custom_disease') && stat.custom_disease_name
        ? stat.custom_disease_name
        : stat.disease_type;

      return {
        id: stat.id,
        disease_type: stat.disease_type,
        disease_display_name: diseaseDisplayName,
        custom_disease_name: stat.custom_disease_name,
        record_date: stat.record_date,
        case_count: stat.case_count,
        severity: stat.severity,
        notes: stat.notes,
        source: stat.source,
        barangay_name: stat.barangays?.name || 'Unknown',
        created_at: stat.created_at,
      };
    });

    const duration = Date.now() - startTime;
    const responseData = {
      summary,
      disease_breakdown: Object.values(diseaseBreakdown).sort((a: any, b: any) => b.count - a.count),
      barangay_breakdown: Object.values(barangayBreakdown).sort((a: any, b: any) => b.count - a.count).slice(0, 15),
      trend_data: trendArray,
      table_data: tableData,
    };

    console.log(`[${requestId}] ✅ Diseases API Success:`, {
      duration: `${duration}ms`,
      records: {
        statistics: filteredStats.length,
        diseaseTypes: Object.values(diseaseBreakdown).length,
        barangays: Object.values(barangayBreakdown).length,
        trendPoints: trendArray.length,
        tableRows: tableData.length,
      },
      summary,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Diseases API Error (${duration}ms):`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
