import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/heatmap-data
 * Formatted data specifically for Leaflet heatmap visualization
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const diseaseType = searchParams.get('disease_type');
    const barangayId = searchParams.get('barangay_id'); // NEW: Support barangay filtering
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Fetch barangays with coordinates (filter by barangay_id if provided)
    let barangayQuery = supabase.from('barangays').select('*');
    if (barangayId) {
      barangayQuery = barangayQuery.eq('id', parseInt(barangayId));
    }
    const { data: barangays, error: barangayError } = await barangayQuery;

    if (barangayError) {
      throw barangayError;
    }

    // Fetch disease_statistics (aggregated disease data)
    let statisticsQuery = supabase
      .from('disease_statistics')
      .select('barangay_id, disease_type, custom_disease_name, record_date, case_count, severity');

    if (diseaseType) {
      statisticsQuery = statisticsQuery.eq('disease_type', diseaseType);
    }
    if (barangayId) {
      statisticsQuery = statisticsQuery.eq('barangay_id', parseInt(barangayId));
    }
    if (startDate) {
      statisticsQuery = statisticsQuery.gte('record_date', startDate);
    }
    if (endDate) {
      statisticsQuery = statisticsQuery.lte('record_date', endDate);
    }

    const { data: statistics, error: statisticsError } = await statisticsQuery;

    if (statisticsError) {
      throw statisticsError;
    }

    console.log(`📊 Heatmap data sources: ${statistics?.length || 0} disease statistics records`);

    // Aggregate by barangay
    const heatmapData = barangays?.map(barangay => {
      // Disease statistics for this barangay
      const barangayStatistics = statistics?.filter(s => s.barangay_id === barangay.id) || [];

      // Calculate totals
      const totalCases = barangayStatistics.reduce((sum, stat) => sum + (stat.case_count || 0), 0);
      const activeCases = totalCases; // All statistics cases considered "active" for visualization
      const highRiskCases = barangayStatistics
        .filter(s => s.severity === 'high_risk')
        .reduce((sum, stat) => sum + (stat.case_count || 0), 0);
      const mediumRiskCases = barangayStatistics
        .filter(s => s.severity === 'medium_risk')
        .reduce((sum, stat) => sum + (stat.case_count || 0), 0);

      // Calculate intensity (0-1 scale for heatmap coloring)
      // More weight to high risk and medium risk cases
      const intensity = totalCases > 0
        ? Math.min(1, (activeCases * 2 + highRiskCases * 3 + mediumRiskCases * 2) / (totalCases * 3))
        : 0;

      // Calculate risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (activeCases >= 10 || highRiskCases >= 3) {
        riskLevel = 'critical';
      } else if (activeCases >= 5 || highRiskCases >= 1) {
        riskLevel = 'high';
      } else if (activeCases >= 2) {
        riskLevel = 'medium';
      }

      // Group diseases by type and custom name for breakdown
      const diseaseBreakdownMap = new Map<string, {
        disease_type: string;
        custom_disease_name: string | null;
        total_count: number;
        active_count: number;
        high_risk_count: number;
      }>();

      // Add statistics to breakdown
      barangayStatistics.forEach(stat => {
        const key = `${stat.disease_type}|${stat.custom_disease_name || ''}`;

        const existing = diseaseBreakdownMap.get(key) || {
          disease_type: stat.disease_type,
          custom_disease_name: stat.custom_disease_name || null,
          total_count: 0,
          active_count: 0,
          high_risk_count: 0,
        };

        existing.total_count += stat.case_count;
        existing.active_count += stat.case_count; // All cases considered "active" for visualization
        if (stat.severity === 'high_risk') {
          existing.high_risk_count += stat.case_count;
        }

        diseaseBreakdownMap.set(key, existing);
      });

      // Convert map to sorted array (highest count first)
      const diseaseBreakdown = Array.from(diseaseBreakdownMap.values())
        .sort((a, b) => b.total_count - a.total_count);

      return {
        barangay_id: barangay.id,
        barangay_name: barangay.name,
        coordinates: barangay.coordinates, // GeoJSON
        population: barangay.population, // Population for percentage-based risk calculation
        statistics: {
          total_cases: totalCases,
          active_cases: activeCases,
          high_risk_cases: highRiskCases,
          medium_risk_cases: mediumRiskCases,
          recovered_cases: 0, // Not tracked in statistics
        },
        diseases: diseaseBreakdown, // Disease breakdown by type
        intensity, // For heatmap color gradient
        risk_level: riskLevel,
        last_updated: (() => {
          const statisticDates = barangayStatistics.map(s => s.record_date);
          if (statisticDates.length === 0) return null;
          return statisticDates.reduce((latest, date) =>
            new Date(date) > new Date(latest) ? date : latest
          );
        })(),
      };
    }).filter(b => b.statistics.total_cases > 0) || [];

    // Sort by total cases descending
    heatmapData.sort((a, b) => b.statistics.total_cases - a.statistics.total_cases);

    // Calculate additional metadata
    const mostAffectedBarangay = heatmapData.length > 0 ? heatmapData[0] : null;

    // Find latest case date
    const statisticDates = statistics?.map(s => s.record_date) || [];
    const latestCaseDate = statisticDates.length > 0
      ? statisticDates.reduce((latest, date) =>
          new Date(date) > new Date(latest) ? date : latest
        )
      : null;

    return NextResponse.json({
      success: true,
      data: heatmapData,
      metadata: {
        total_barangays_affected: heatmapData.length,
        total_cases: heatmapData.reduce((sum, b) => sum + b.statistics.total_cases, 0),
        total_active: heatmapData.reduce((sum, b) => sum + b.statistics.active_cases, 0),
        critical_barangays: heatmapData.filter(b => b.risk_level === 'critical').length,
        high_risk_barangays: heatmapData.filter(b => b.risk_level === 'high').length,
        disease_type: diseaseType || 'all',
        most_affected_barangay: mostAffectedBarangay?.barangay_name || null,
        highest_case_count: mostAffectedBarangay?.statistics.total_cases || 0,
        latest_case_date: latestCaseDate,
      },
    });

  } catch (error: any) {
    console.error('Error in heatmap-data API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
