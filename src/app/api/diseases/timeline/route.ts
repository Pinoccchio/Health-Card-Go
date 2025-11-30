import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/timeline
 * Time-series disease data for SARIMA modeling and trend analysis
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
    const barangayId = searchParams.get('barangay_id');
    const groupBy = searchParams.get('group_by') || 'day'; // day, week, month
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Fetch diseases with date filtering
    let query = supabase
      .from('diseases')
      .select('diagnosis_date, disease_type, barangay_id, severity, status')
      .order('diagnosis_date', { ascending: true });

    if (diseaseType) {
      query = query.eq('disease_type', diseaseType);
    }
    if (barangayId) {
      query = query.eq('barangay_id', parseInt(barangayId));
    }
    if (startDate) {
      query = query.gte('diagnosis_date', startDate);
    }
    if (endDate) {
      query = query.lte('diagnosis_date', endDate);
    }

    const { data: diseases, error } = await query;

    if (error) {
      console.error('Error fetching timeline data:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch timeline data' },
        { status: 500 }
      );
    }

    // Group by specified interval
    const grouped: Record<string, any> = {};

    diseases?.forEach(disease => {
      const date = new Date(disease.diagnosis_date);
      let key: string;

      switch (groupBy) {
        case 'week':
          // Get Monday of the week
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + 1);
          key = monday.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // day
          key = disease.diagnosis_date;
      }

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          total_cases: 0,
          by_disease: {},
          by_severity: {
            mild: 0,
            moderate: 0,
            severe: 0,
            critical: 0,
          },
          by_status: {
            active: 0,
            recovered: 0,
            deceased: 0,
            ongoing_treatment: 0,
          },
        };
      }

      grouped[key].total_cases++;

      // Count by disease type
      if (!grouped[key].by_disease[disease.disease_type]) {
        grouped[key].by_disease[disease.disease_type] = 0;
      }
      grouped[key].by_disease[disease.disease_type]++;

      // Count by severity
      if (disease.severity) {
        grouped[key].by_severity[disease.severity]++;
      }

      // Count by status
      if (disease.status) {
        grouped[key].by_status[disease.status]++;
      }
    });

    // Convert to array and sort by date
    const timeline = Object.values(grouped).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      success: true,
      data: timeline,
      count: timeline.length,
      metadata: {
        group_by: groupBy,
        disease_type: diseaseType,
        barangay_id: barangayId,
        date_range: {
          start: startDate,
          end: endDate,
        },
      },
    });

  } catch (error: any) {
    console.error('Error in timeline API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
