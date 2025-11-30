import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/by-barangay
 * Aggregate disease counts by barangay for heatmap visualization
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

    // Build aggregation query
    let query = `
      SELECT
        b.id as barangay_id,
        b.name as barangay_name,
        b.coordinates,
        d.disease_type,
        COUNT(d.id) as total_cases,
        COUNT(CASE WHEN d.status = 'active' THEN 1 END) as active_cases,
        COUNT(CASE WHEN d.status = 'recovered' THEN 1 END) as recovered_cases,
        COUNT(CASE WHEN d.severity = 'critical' THEN 1 END) as critical_cases,
        COUNT(CASE WHEN d.severity = 'severe' THEN 1 END) as severe_cases,
        MAX(d.diagnosis_date) as latest_case_date
      FROM barangays b
      LEFT JOIN diseases d ON b.id = d.barangay_id
    `;

    const conditions = [];
    if (diseaseType) {
      conditions.push(`d.disease_type = '${diseaseType}'`);
    }
    if (startDate) {
      conditions.push(`d.diagnosis_date >= '${startDate}'`);
    }
    if (endDate) {
      conditions.push(`d.diagnosis_date <= '${endDate}'`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY b.id, b.name, b.coordinates, d.disease_type
      ORDER BY total_cases DESC
    `;

    const { data, error } = await supabase.rpc('execute_sql', { query });

    if (error) {
      console.error('Error executing aggregation query:', error);

      // Fallback: Use client-side aggregation
      const { data: diseases } = await supabase
        .from('diseases')
        .select('*, barangays(id, name, coordinates)');

      const { data: allBarangays } = await supabase
        .from('barangays')
        .select('*');

      // Aggregate manually
      const aggregated = allBarangays?.map(barangay => {
        const barangayDiseases = diseases?.filter(d =>
          d.barangays?.id === barangay.id &&
          (!diseaseType || d.disease_type === diseaseType) &&
          (!startDate || d.diagnosis_date >= startDate) &&
          (!endDate || d.diagnosis_date <= endDate)
        ) || [];

        return {
          barangay_id: barangay.id,
          barangay_name: barangay.name,
          coordinates: barangay.coordinates,
          total_cases: barangayDiseases.length,
          active_cases: barangayDiseases.filter(d => d.status === 'active').length,
          recovered_cases: barangayDiseases.filter(d => d.status === 'recovered').length,
          critical_cases: barangayDiseases.filter(d => d.severity === 'critical').length,
          severe_cases: barangayDiseases.filter(d => d.severity === 'severe').length,
          latest_case_date: barangayDiseases.length > 0
            ? Math.max(...barangayDiseases.map(d => new Date(d.diagnosis_date).getTime()))
            : null,
        };
      }).filter(b => b.total_cases > 0) || [];

      return NextResponse.json({
        success: true,
        data: aggregated,
        count: aggregated.length,
      });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });

  } catch (error: any) {
    console.error('Error in by-barangay API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
