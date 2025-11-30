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
    const diseaseType = searchParams.get('type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Fetch barangays with coordinates
    const { data: barangays, error: barangayError } = await supabase
      .from('barangays')
      .select('*');

    if (barangayError) {
      throw barangayError;
    }

    // Fetch diseases with filters
    let diseaseQuery = supabase
      .from('diseases')
      .select('barangay_id, disease_type, severity, status, diagnosis_date');

    if (diseaseType) {
      diseaseQuery = diseaseQuery.eq('disease_type', diseaseType);
    }
    if (startDate) {
      diseaseQuery = diseaseQuery.gte('diagnosis_date', startDate);
    }
    if (endDate) {
      diseaseQuery = diseaseQuery.lte('diagnosis_date', endDate);
    }

    const { data: diseases, error: diseaseError } = await diseaseQuery;

    if (diseaseError) {
      throw diseaseError;
    }

    // Aggregate by barangay
    const heatmapData = barangays?.map(barangay => {
      const barangayDiseases = diseases?.filter(d => d.barangay_id === barangay.id) || [];

      const totalCases = barangayDiseases.length;
      const activeCases = barangayDiseases.filter(d => d.status === 'active').length;
      const criticalCases = barangayDiseases.filter(d => d.severity === 'critical').length;
      const severeCases = barangayDiseases.filter(d => d.severity === 'severe').length;

      // Calculate intensity (0-1 scale for heatmap coloring)
      // More weight to active and severe cases
      const intensity = totalCases > 0
        ? Math.min(1, (activeCases * 2 + criticalCases * 3 + severeCases * 2) / (totalCases * 3))
        : 0;

      // Calculate risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (activeCases >= 10 || criticalCases >= 3) {
        riskLevel = 'critical';
      } else if (activeCases >= 5 || criticalCases >= 1) {
        riskLevel = 'high';
      } else if (activeCases >= 2) {
        riskLevel = 'medium';
      }

      return {
        barangay_id: barangay.id,
        barangay_name: barangay.name,
        coordinates: barangay.coordinates, // GeoJSON
        statistics: {
          total_cases: totalCases,
          active_cases: activeCases,
          critical_cases: criticalCases,
          severe_cases: severeCases,
          recovered_cases: barangayDiseases.filter(d => d.status === 'recovered').length,
        },
        intensity, // For heatmap color gradient
        risk_level: riskLevel,
        last_updated: diseases && diseases.length > 0
          ? diseases.reduce((latest, d) =>
            new Date(d.diagnosis_date) > new Date(latest) ? d.diagnosis_date : latest,
            diseases[0].diagnosis_date
          )
          : null,
      };
    }).filter(b => b.statistics.total_cases > 0) || [];

    // Sort by total cases descending
    heatmapData.sort((a, b) => b.statistics.total_cases - a.statistics.total_cases);

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
