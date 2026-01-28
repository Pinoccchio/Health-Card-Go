/**
 * HealthCard Predictions API
 *
 * GET /api/healthcards/predictions
 *
 * Fetches historical statistics and SARIMA predictions for health card issuance.
 * Returns Chart.js-compatible data for visualization.
 *
 * Query Parameters:
 * - healthcard_type: 'food_handler' | 'non_food' | 'pink' (required)
 * - barangay_id: number (optional, null for system-wide)
 * - days_back: number (optional, default: 30)
 * - days_forecast: number (optional, default: 30)
 * - include_confidence: boolean (optional, default: true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  HealthCardPredictionsResponse,
  HealthCardStatistic,
  HealthCardPrediction,
  HealthCardType,
} from '@/types/healthcard';
import {
  isValidHealthCardType,
  generateSARIMADateRange,
  generateSARIMADateRangeMonthly,
  getHealthCardTypeLabel,
} from '@/lib/utils/healthcardHelpers';
import { transformHealthCardSARIMAData } from '@/lib/utils/healthcardChartTransformers';

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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const healthcardTypeParam = searchParams.get('healthcard_type');
    const barangayIdParam = searchParams.get('barangay_id');

    // MONTHLY GRANULARITY SUPPORT: Accept both legacy and new parameters
    const granularity = searchParams.get('granularity') || 'monthly'; // Default to monthly

    // Support explicit start_date/end_date OR relative months_back/months_forecast
    const startDateParam = searchParams.get('start_date'); // Format: YYYY-MM-DD
    const endDateParam = searchParams.get('end_date'); // Format: YYYY-MM-DD

    const periodsBack = parseInt(searchParams.get('months_back') || searchParams.get('days_back') || '12');
    const periodsForecast = parseInt(searchParams.get('months_forecast') || searchParams.get('days_forecast') || '12');
    const includeConfidence = searchParams.get('include_confidence') !== 'false';

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
          error: `Invalid healthcard_type. Must be 'food_handler', 'non_food', or 'pink'`,
        },
        { status: 400 }
      );
    }

    const healthcardType: HealthCardType = healthcardTypeParam;
    const barangayId = barangayIdParam ? parseInt(barangayIdParam) : null;

    console.log('[HealthCard Predictions API] Query params:', {
      healthcardType,
      barangayId,
      periodsBack,
      periodsForecast,
      granularity,
      includeConfidence,
      userId: user.id,
    });

    // Generate date range based on explicit dates OR relative periods
    let dateRange;
    if (startDateParam && endDateParam) {
      // Use explicit date range
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date(endDateParam);
      endDate.setMonth(endDate.getMonth() + periodsForecast);
      const forecastEndDate = endDate.toISOString().split('T')[0];

      dateRange = {
        start_date: startDateParam,
        end_date: forecastEndDate,
        today: today,
      };
    } else {
      // Use relative periods (legacy behavior)
      dateRange = granularity === 'monthly'
        ? generateSARIMADateRangeMonthly(periodsBack, periodsForecast)
        : generateSARIMADateRange(periodsBack, periodsForecast);
    }

    // ========================================================================
    // Fetch Historical Statistics
    // ========================================================================

    // Use admin client to bypass RLS for fetching system-wide appointment data
    // (authentication already verified above)
    const adminClient = createAdminClient();

    // Determine service IDs based on healthcard type
    let serviceIds: number[];
    if (healthcardType === 'food_handler') {
      serviceIds = [12, 13];
    } else if (healthcardType === 'non_food') {
      serviceIds = [14, 15];
    } else {
      // Pink Card uses Service 12 with card_type='pink'
      serviceIds = [12];
    }

    let historicalQuery = adminClient
      .from('appointments')
      .select(
        `
        id,
        completed_at,
        service_id,
        card_type,
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
      .not('completed_at', 'is', null);

    // For Pink Card, filter by card_type
    if (healthcardType === 'pink') {
      historicalQuery = historicalQuery.eq('card_type', 'pink');
    }

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
        '[HealthCard Predictions API] Historical query error:',
        histError
      );
      return NextResponse.json(
        { success: false, error: 'Failed to fetch historical data' },
        { status: 500 }
      );
    }

    console.log(
      '[HealthCard Predictions API] Found historical appointments:',
      appointments?.length || 0
    );

    // ========================================================================
    // Fetch Excel-Imported Historical Statistics
    // ========================================================================

    let statisticsQuery = adminClient
      .from('healthcard_statistics')
      .select('*')
      .eq('healthcard_type', healthcardType);

    // Apply barangay filter if specified
    if (barangayId !== null) {
      statisticsQuery = statisticsQuery.eq('barangay_id', barangayId);
    }

    const { data: importedStats, error: statsError } = await statisticsQuery;

    if (statsError) {
      console.error(
        '[HealthCard Predictions API] Statistics query error:',
        statsError
      );
      // Don't fail - just log and continue with appointment data only
      console.warn('[HealthCard Predictions API] Continuing without imported statistics');
    }

    console.log(
      '[HealthCard Predictions API] Found imported statistics:',
      importedStats?.length || 0
    );

    // ========================================================================
    // Merge Both Data Sources
    // ========================================================================

    // Aggregate appointments into statistics
    const statisticsMap = new Map<string, HealthCardStatistic>();

    // First, add Excel-imported statistics
    importedStats?.forEach((stat: any) => {
      const key = `${stat.record_date}-${stat.barangay_id || 'null'}`;

      if (statisticsMap.has(key)) {
        // If already exists from another source, add to count
        const existing = statisticsMap.get(key)!;
        existing.card_count += stat.cards_issued;
      } else {
        statisticsMap.set(key, {
          id: key,
          healthcard_type: healthcardType,
          barangay_id: stat.barangay_id || null,
          issue_date: stat.record_date,
          card_count: stat.cards_issued,
          barangay_name: null, // Will be populated if needed
        });
      }
    });

    console.log(
      '[HealthCard Predictions API] Statistics map after imported data:',
      statisticsMap.size
    );

    // Then, add real appointment data
    appointments?.forEach((appointment: any) => {
      // Skip if card_type mismatch for pink
      if (healthcardType === 'pink' && appointment.card_type !== 'pink') {
        return;
      }

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

    // All historical data (for data quality assessment — needs full history)
    const allHistoricalData = Array.from(statisticsMap.values());

    // Filtered historical data (for chart display — only the requested date range)
    const historicalData = allHistoricalData.filter(stat => {
      const date = stat.issue_date;
      return date >= dateRange.start_date && date <= dateRange.today;
    });

    console.log(
      '[HealthCard Predictions API] Statistics map size:',
      statisticsMap.size
    );
    console.log(
      '[HealthCard Predictions API] All historical data (for quality):',
      allHistoricalData.length
    );
    console.log(
      '[HealthCard Predictions API] Filtered historical data (for chart):',
      historicalData.length
    );
    console.log(
      '[HealthCard Predictions API] Total cards in historical data:',
      allHistoricalData.reduce((sum, stat) => sum + stat.card_count, 0)
    );

    // ========================================================================
    // Fetch SARIMA Predictions
    // ========================================================================

    let predictionsQuery = adminClient
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
        granularity,
        created_at,
        barangays(
          id,
          name,
          code
        )
      `
      )
      .eq('healthcard_type', healthcardType)
      .eq('granularity', granularity) // Filter by granularity
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
        '[HealthCard Predictions API] Predictions query error:',
        predError
      );
      return NextResponse.json(
        { success: false, error: 'Failed to fetch predictions' },
        { status: 500 }
      );
    }

    console.log(
      '[HealthCard Predictions API] Found predictions:',
      predictions?.length || 0
    );

    // ========================================================================
    // Get Barangay Name
    // ========================================================================

    let barangayName: string | null = null;
    if (barangayId !== null) {
      const { data: barangayData } = await adminClient
        .from('barangays')
        .select('name')
        .eq('id', barangayId)
        .single();

      barangayName = barangayData?.name || null;
    }

    // ========================================================================
    // Transform Data for Chart
    // ========================================================================

    const transformedData = transformHealthCardSARIMAData(
      historicalData,
      (predictions as HealthCardPrediction[]) || [],
      healthcardType,
      barangayId,
      barangayName
    );

    // ========================================================================
    // Calculate Data Quality Metrics
    // ========================================================================

    // Count ALL historical data points for quality assessment (not just filtered range)
    const dataPointsCount = allHistoricalData.length;

    // Determine data quality based on data points count
    let dataQuality: 'high' | 'moderate' | 'insufficient';
    if (dataPointsCount >= 50) {
      dataQuality = 'high';
    } else if (dataPointsCount >= 30) {
      dataQuality = 'moderate';
    } else {
      dataQuality = 'insufficient';
    }

    // Check if predictions show variance (not all the same value)
    let varianceDetected = false;
    if (predictions && predictions.length > 1) {
      const predictionValues = predictions.map((p) => p.predicted_cards);
      const uniqueValues = new Set(predictionValues);
      varianceDetected = uniqueValues.size > 1;
    }

    // Determine if there's sufficient data
    const hasSufficientData = dataPointsCount >= 30;

    // ========================================================================
    // Build Response
    // ========================================================================

    const response: HealthCardPredictionsResponse = {
      success: true,
      data: transformedData,
      metadata: {
        healthcard_type: healthcardType,
        barangay_id: barangayId,
        barangay_name: barangayName,
        days_historical: periodsBack,
        days_forecast: periodsForecast,
        total_data_points: transformedData.dates.length,
        model_version: predictions?.[0]?.model_version || 'SARIMA(1,1,1)(1,1,1,7)',
        // Data quality indicators
        data_points_count: dataPointsCount,
        data_quality: dataQuality,
        variance_detected: varianceDetected,
        has_sufficient_data: hasSufficientData,
      },
    };

    console.log('[HealthCard Predictions API] Response metadata:', response.metadata);

    return NextResponse.json(response);
  } catch (error) {
    console.error('[HealthCard Predictions API] Unexpected error:', error);
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
