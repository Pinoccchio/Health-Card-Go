import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/predictions
 * SARIMA predictions with historical data for visualization
 *
 * IMPORTANT: This endpoint is force-dynamic to prevent caching and ensure
 * the chart always shows the latest generated predictions in real-time.
 */
export const dynamic = 'force-dynamic';

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
    const diseaseType = searchParams.get('disease_type'); // FIX: Changed from 'type' to 'disease_type' to match SARIMAChart
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
    } else {
      // System-Wide: Only fetch predictions where barangay_id IS NULL
      predictionsQuery = predictionsQuery.is('barangay_id', null);
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

    // Get generation metadata from the MOST RECENTLY GENERATED prediction (not oldest by prediction_date)
    // Build a separate query to get the latest generated prediction
    let metadataQuery = supabase
      .from('disease_predictions')
      .select('generated_at, model_version, data_quality, data_points_count, accuracy_r_squared, accuracy_rmse, trend, seasonality_detected')
      .order('generated_at', { ascending: false })
      .limit(1);

    if (diseaseType) {
      metadataQuery = metadataQuery.eq('disease_type', diseaseType);
    }
    if (barangayId) {
      metadataQuery = metadataQuery.eq('barangay_id', parseInt(barangayId));
    } else {
      metadataQuery = metadataQuery.is('barangay_id', null);
    }

    const { data: latestPrediction } = await metadataQuery;

    const generationMetadata = latestPrediction && latestPrediction.length > 0
      ? {
          generated_at: latestPrediction[0].generated_at,
          model_version: latestPrediction[0].model_version || 'Local-SARIMA-v1.0',
          data_quality: latestPrediction[0].data_quality || 'unknown',
          data_points_count: latestPrediction[0].data_points_count || 0,
          accuracy_r_squared: latestPrediction[0].accuracy_r_squared || null,
          accuracy_rmse: latestPrediction[0].accuracy_rmse || null,
          trend: latestPrediction[0].trend || 'unknown',
          seasonality_detected: latestPrediction[0].seasonality_detected || false,
        }
      : null;

    // Determine if predictions exist
    const hasPredictions = predictionsData && predictionsData.length > 0;

    const response = NextResponse.json({
      success: true,
      has_predictions: hasPredictions,
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
        average_confidence: hasPredictions ? Math.round(avgConfidence * 100) / 100 : 0,
        ...generationMetadata,
      },
    });

    // Prevent all caching to ensure real-time updates
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;

  } catch (error: any) {
    console.error('Error in predictions API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
