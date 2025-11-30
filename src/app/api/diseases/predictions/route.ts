import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/predictions
 * SARIMA predictions with historical data for visualization
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
    const daysBack = parseInt(searchParams.get('days_back') || '30');
    const daysForecast = parseInt(searchParams.get('days_forecast') || '30');

    // Fetch historical disease data
    const historicalStartDate = new Date();
    historicalStartDate.setDate(historicalStartDate.getDate() - daysBack);

    let historicalQuery = supabase
      .from('diseases')
      .select('diagnosis_date, disease_type, barangay_id')
      .gte('diagnosis_date', historicalStartDate.toISOString().split('T')[0])
      .order('diagnosis_date', { ascending: true });

    if (diseaseType) {
      historicalQuery = historicalQuery.eq('disease_type', diseaseType);
    }
    if (barangayId) {
      historicalQuery = historicalQuery.eq('barangay_id', parseInt(barangayId));
    }

    const { data: historicalData, error: historicalError } = await historicalQuery;

    if (historicalError) {
      throw historicalError;
    }

    // Group historical data by date
    const historicalGrouped: Record<string, number> = {};
    historicalData?.forEach(disease => {
      const date = disease.diagnosis_date;
      historicalGrouped[date] = (historicalGrouped[date] || 0) + 1;
    });

    // Fill in missing dates with 0
    const historical = [];
    for (let i = daysBack; i > 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      historical.push({
        date: dateStr,
        actual_cases: historicalGrouped[dateStr] || 0,
      });
    }

    // Fetch predictions
    const forecastStartDate = new Date();
    forecastStartDate.setDate(forecastStartDate.getDate() + 1);
    const forecastEndDate = new Date();
    forecastEndDate.setDate(forecastEndDate.getDate() + daysForecast);

    let predictionsQuery = supabase
      .from('disease_predictions')
      .select('*')
      .gte('prediction_date', forecastStartDate.toISOString().split('T')[0])
      .lte('prediction_date', forecastEndDate.toISOString().split('T')[0])
      .order('prediction_date', { ascending: true });

    if (diseaseType) {
      predictionsQuery = predictionsQuery.eq('disease_type', diseaseType);
    }
    if (barangayId) {
      predictionsQuery = predictionsQuery.eq('barangay_id', parseInt(barangayId));
    }

    const { data: predictionsData, error: predictionsError } = await predictionsQuery;

    if (predictionsError) {
      throw predictionsError;
    }

    // Group predictions by date (sum across barangays if no barangay filter)
    const predictionsGrouped: Record<string, any> = {};
    predictionsData?.forEach(pred => {
      const date = pred.prediction_date;
      if (!predictionsGrouped[date]) {
        predictionsGrouped[date] = {
          predicted_cases: 0,
          confidence_lower: 0,
          confidence_upper: 0,
          count: 0,
        };
      }
      predictionsGrouped[date].predicted_cases += pred.predicted_cases;
      predictionsGrouped[date].confidence_lower += pred.confidence_lower;
      predictionsGrouped[date].confidence_upper += pred.confidence_upper;
      predictionsGrouped[date].count++;
    });

    // Average the predictions if multiple barangays
    const predictions = [];
    for (let i = 1; i <= daysForecast; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      if (predictionsGrouped[dateStr]) {
        const grouped = predictionsGrouped[dateStr];
        predictions.push({
          date: dateStr,
          predicted_cases: Math.round(grouped.predicted_cases / grouped.count),
          confidence_lower: Math.round(grouped.confidence_lower / grouped.count),
          confidence_upper: Math.round(grouped.confidence_upper / grouped.count),
        });
      } else {
        predictions.push({
          date: dateStr,
          predicted_cases: 0,
          confidence_lower: 0,
          confidence_upper: 0,
        });
      }
    }

    // Calculate metadata
    const totalActual = historical.reduce((sum, d) => sum + d.actual_cases, 0);
    const totalPredicted = predictions.reduce((sum, d) => sum + d.predicted_cases, 0);
    const avgConfidence = predictionsData && predictionsData.length > 0
      ? predictionsData.reduce((sum, p) => sum + p.confidence_level, 0) / predictionsData.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        historical,
        predictions,
      },
      metadata: {
        disease_type: diseaseType || 'all',
        barangay_id: barangayId,
        days_back: daysBack,
        days_forecast: daysForecast,
        total_actual_cases: totalActual,
        total_predicted_cases: totalPredicted,
        average_confidence: Math.round(avgConfidence * 100) / 100,
        model_version: 'SARIMA_v1.0',
      },
    });

  } catch (error: any) {
    console.error('Error in predictions API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
