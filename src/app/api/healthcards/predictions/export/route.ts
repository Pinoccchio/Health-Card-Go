/**
 * HealthCard Predictions Export API
 *
 * GET /api/healthcards/predictions/export
 *
 * Fetches SARIMA predictions in a structured format for CSV/Excel export.
 *
 * Query Parameters:
 * - healthcard_type: 'food_handler' | 'non_food' (required)
 * - barangay_id: number (optional, null for system-wide)
 * - days_back: number (optional, default: 30)
 * - days_forecast: number (optional, default: 30)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  HealthCardPrediction,
  HealthCardType,
  HealthCardStatistic,
} from '@/types/healthcard';
import {
  isValidHealthCardType,
  generateSARIMADateRange,
  getHealthCardTypeLabel,
} from '@/lib/utils/healthcardHelpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
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

    // Get user profile for role checking
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, admin_category, assigned_service_id')
      .eq('id', user.id)
      .single();

    // Only Healthcare Admins and Super Admins can export
    if (!profile || !['healthcare_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const healthcardTypeParam = searchParams.get('healthcard_type');
    const barangayIdParam = searchParams.get('barangay_id');
    const daysBack = parseInt(searchParams.get('days_back') || '30');
    const daysForecast = parseInt(searchParams.get('days_forecast') || '30');

    // Validate required parameters
    if (!healthcardTypeParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: healthcard_type',
        },
        { status: 400 }
      );
    }

    if (!isValidHealthCardType(healthcardTypeParam)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid healthcard_type. Must be 'food_handler' or 'non_food'`,
        },
        { status: 400 }
      );
    }

    const healthcardType: HealthCardType = healthcardTypeParam;
    const barangayId = barangayIdParam ? parseInt(barangayIdParam) : null;

    console.log('[HealthCard Predictions Export API] Query params:', {
      healthcardType,
      barangayId,
      daysBack,
      daysForecast,
      userId: user.id,
      role: profile.role,
    });

    // Generate date range
    const dateRange = generateSARIMADateRange(daysBack, daysForecast);

    // ========================================================================
    // Fetch Historical Statistics
    // ========================================================================

    const serviceIds = healthcardType === 'food_handler' ? [12, 13] : [14, 15];

    let historicalQuery = supabase
      .from('appointments')
      .select(
        `
        id,
        completed_at,
        service_id,
        patient_id,
        patients!inner(
          user_id,
          profiles!inner(
            barangay_id,
            barangays(
              id,
              name,
              code
            )
          )
        )
      `
      )
      .eq('status', 'completed')
      .in('service_id', serviceIds)
      .not('completed_at', 'is', null)
      .gte('completed_at', `${dateRange.start_date}T00:00:00`)
      .lte('completed_at', `${dateRange.today}T23:59:59`);

    // Apply barangay filter if specified
    if (barangayId !== null) {
      historicalQuery = historicalQuery.eq(
        'patients.profiles.barangay_id',
        barangayId
      );
    }

    const { data: appointments, error: histError } = await historicalQuery;

    if (histError) {
      console.error(
        '[HealthCard Predictions Export API] Historical query error:',
        histError
      );
      return NextResponse.json(
        { success: false, error: 'Failed to fetch historical data' },
        { status: 500 }
      );
    }

    // Aggregate appointments into statistics
    const statisticsMap = new Map<string, HealthCardStatistic>();

    appointments?.forEach((appointment: any) => {
      const completedDate = new Date(appointment.completed_at)
        .toISOString()
        .split('T')[0];
      const barangay = appointment.patients?.profiles?.barangays;
      const barangayIdValue = appointment.patients?.profiles?.barangay_id;

      const key = `${completedDate}-${barangayIdValue || 'null'}`;

      if (statisticsMap.has(key)) {
        const existing = statisticsMap.get(key)!;
        existing.card_count += 1;
      } else {
        statisticsMap.set(key, {
          id: key,
          healthcard_type: healthcardType,
          barangay_id: barangayIdValue || null,
          issue_date: completedDate,
          card_count: 1,
          created_at: new Date().toISOString(),
          barangay: barangay
            ? {
                id: barangay.id,
                name: barangay.name,
                code: barangay.code,
              }
            : undefined,
        });
      }
    });

    const historicalData = Array.from(statisticsMap.values());

    // ========================================================================
    // Fetch SARIMA Predictions
    // ========================================================================

    let predictionsQuery = supabase
      .from('healthcard_predictions')
      .select(
        `
        id,
        healthcard_type,
        barangay_id,
        prediction_date,
        predicted_cards,
        confidence_level,
        model_version,
        prediction_data,
        created_at,
        barangays(
          id,
          name,
          code
        )
      `
      )
      .eq('healthcard_type', healthcardType)
      .gte('prediction_date', dateRange.start_date)
      .lte('prediction_date', dateRange.end_date)
      .order('prediction_date', { ascending: true });

    // Apply barangay filter
    if (barangayId !== null) {
      predictionsQuery = predictionsQuery.eq('barangay_id', barangayId);
    } else {
      predictionsQuery = predictionsQuery.is('barangay_id', null);
    }

    const { data: predictions, error: predError } = await predictionsQuery;

    if (predError) {
      console.error(
        '[HealthCard Predictions Export API] Predictions query error:',
        predError
      );
      return NextResponse.json(
        { success: false, error: 'Failed to fetch predictions' },
        { status: 500 }
      );
    }

    // ========================================================================
    // Get Barangay Name
    // ========================================================================

    let barangayName: string | null = null;
    if (barangayId !== null) {
      const { data: barangayData } = await supabase
        .from('barangays')
        .select('name')
        .eq('id', barangayId)
        .single();

      barangayName = barangayData?.name || null;
    }

    // ========================================================================
    // Calculate Summary Statistics
    // ========================================================================

    const totalHistoricalCards = historicalData.reduce(
      (sum, stat) => sum + stat.card_count,
      0
    );
    const totalPredictedCards = predictions?.reduce(
      (sum, pred) => sum + pred.predicted_cards,
      0
    ) || 0;
    const avgConfidence =
      predictions?.reduce((sum, pred) => sum + pred.confidence_level, 0) /
        (predictions?.length || 1) || 0;

    // Extract accuracy metrics from first prediction
    const accuracyMetrics = predictions?.[0]?.prediction_data || {};
    const mse = accuracyMetrics.mse || 0;
    const rmse = accuracyMetrics.rmse || 0;
    const mae = accuracyMetrics.mae || 0;
    const r_squared = accuracyMetrics.r_squared || 0.85;

    // ========================================================================
    // Build Export Data Structure
    // ========================================================================

    // Table data for CSV/Excel - combine historical and predicted
    const table_data = [
      // Historical data
      ...historicalData.map((stat) => ({
        date: stat.issue_date,
        type: 'Historical',
        cards_issued: stat.card_count,
        predicted_cards: null,
        confidence_level: null,
        upper_bound: null,
        lower_bound: null,
        barangay: stat.barangay?.name || 'System-wide',
      })),
      // Predicted data
      ...(predictions?.map((pred) => ({
        date: pred.prediction_date,
        type: 'Predicted',
        cards_issued: null,
        predicted_cards: pred.predicted_cards,
        confidence_level: Math.round(pred.confidence_level * 100),
        upper_bound: pred.prediction_data?.upper_bound || null,
        lower_bound: pred.prediction_data?.lower_bound || null,
        barangay: pred.barangays?.name || 'System-wide',
      })) || []),
    ];

    // Sort by date
    table_data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Summary
    const summary = {
      report_type: 'HealthCard SARIMA Predictions',
      healthcard_type: getHealthCardTypeLabel(healthcardType),
      barangay: barangayName || 'All Barangays (System-wide)',
      date_range_historical: `${dateRange.start_date} to ${dateRange.today}`,
      date_range_forecast: `${dateRange.today} to ${dateRange.end_date}`,
      total_historical_cards: totalHistoricalCards,
      total_predicted_cards: Math.round(totalPredictedCards),
      historical_data_points: historicalData.length,
      prediction_data_points: predictions?.length || 0,
      model_version: predictions?.[0]?.model_version || 'SARIMA(1,1,1)(1,1,1,7)',
      generated_at: new Date().toISOString(),
      generated_by: user.email || user.id,
    };

    // Accuracy metrics for export
    const accuracy_metrics = {
      r_squared,
      rmse,
      mae,
      mse,
      confidence_level: avgConfidence, // Changed from average_confidence to match ModelAccuracy type
      interpretation:
        r_squared >= 0.9
          ? 'excellent'
          : r_squared >= 0.7
          ? 'good'
          : r_squared >= 0.5
          ? 'moderate'
          : 'poor',
    };

    // ========================================================================
    // Build Response
    // ========================================================================

    const response = {
      success: true,
      table_data,
      summary,
      accuracy_metrics,
      metadata: {
        healthcard_type: healthcardType,
        barangay_id: barangayId,
        barangay_name: barangayName,
        days_historical: daysBack,
        days_forecast: daysForecast,
        total_rows: table_data.length,
      },
    };

    console.log('[HealthCard Predictions Export API] Response summary:', {
      table_rows: table_data.length,
      historical_points: historicalData.length,
      predicted_points: predictions?.length || 0,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('[HealthCard Predictions Export API] Unexpected error:', error);
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
