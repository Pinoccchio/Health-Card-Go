/**
 * Service Predictions API
 *
 * GET /api/services/predictions
 *
 * Fetches historical appointment data and SARIMA predictions for any service.
 * Returns Chart.js-compatible data for visualization.
 *
 * Query Parameters:
 * - service_id: number (required) - Service ID (16 for HIV, 17 for Pregnancy, etc.)
 * - barangay_id: number (optional, null for system-wide)
 * - days_back: number (optional, default: 30)
 * - days_forecast: number (optional, default: 30)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { runLocalSARIMA } from '@/lib/sarima/localSARIMA';

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
    const serviceIdParam = searchParams.get('service_id');
    const barangayIdParam = searchParams.get('barangay_id');

    // MONTHLY GRANULARITY SUPPORT: Accept both legacy and new parameters
    const granularity = searchParams.get('granularity') || 'monthly'; // Default to monthly

    // Support explicit start_date/end_date OR relative months_back/months_forecast
    const startDateParam = searchParams.get('start_date'); // Format: YYYY-MM-DD
    const endDateParam = searchParams.get('end_date'); // Format: YYYY-MM-DD

    const periodsBack = parseInt(searchParams.get('months_back') || searchParams.get('days_back') || '12');
    const periodsForecast = parseInt(searchParams.get('months_forecast') || searchParams.get('days_forecast') || '12');

    // Validate required parameters
    if (!serviceIdParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: service_id',
        },
        { status: 400 }
      );
    }

    const serviceId = parseInt(serviceIdParam);
    const barangayId = barangayIdParam ? parseInt(barangayIdParam) : null;

    console.log('[Service Predictions API] Query params:', {
      serviceId,
      barangayId,
      periodsBack,
      periodsForecast,
      granularity,
      userId: user.id,
    });

    // Calculate date range based on explicit dates OR relative periods
    let startDate: Date;
    let endDate: Date;

    if (startDateParam && endDateParam) {
      // Use explicit date range
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      console.log('[Service Predictions API] Using explicit date range:', { startDateParam, endDateParam });
    } else {
      // Use relative periods (legacy behavior)
      endDate = new Date();
      startDate = new Date();
      if (granularity === 'monthly') {
        startDate.setMonth(startDate.getMonth() - periodsBack);
      } else {
        startDate.setDate(startDate.getDate() - periodsBack);
      }
    }

    // ========================================================================
    // Fetch Historical Appointment Data
    // ========================================================================

    // Use admin client to bypass RLS for fetching system-wide appointment data
    // (authentication already verified above)
    const adminClient = createAdminClient();

    // Use completed_at + completed status to match the generate-predictions endpoint.
    // This ensures on-the-fly fallback produces the same results as cached predictions.
    let appointmentsQuery = adminClient
      .from('appointments')
      .select('id, completed_at, service_id')
      .eq('service_id', serviceId)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true });

    if (barangayId !== null) {
      // Join with patients to filter by barangay
      appointmentsQuery = adminClient
        .from('appointments')
        .select(`
          id,
          completed_at,
          service_id,
          patients!inner (
            barangay_id
          )
        `)
        .eq('service_id', serviceId)
        .eq('patients.barangay_id', barangayId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true });
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery;

    if (appointmentsError) {
      console.error('[Service Predictions API] Error fetching appointments:', appointmentsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch appointment data',
        },
        { status: 500 }
      );
    }

    console.log(`[Service Predictions API] Found ${appointments?.length || 0} appointments`);

    // ========================================================================
    // Fetch Excel-Imported Historical Statistics
    // ========================================================================

    let statisticsQuery = adminClient
      .from('service_appointment_statistics')
      .select('*')
      .eq('service_id', serviceId)
      .order('record_date', { ascending: true });

    if (barangayId !== null) {
      statisticsQuery = statisticsQuery.eq('barangay_id', barangayId);
    }

    const { data: importedStats, error: statsError } = await statisticsQuery;

    if (statsError) {
      console.error('[Service Predictions API] Statistics query error:', statsError);
      // Don't fail - just log and continue with appointment data only
      console.warn('[Service Predictions API] Continuing without imported statistics');
    }

    console.log(`[Service Predictions API] Found ${importedStats?.length || 0} imported statistics records`);

    // ========================================================================
    // Merge Both Data Sources - Aggregate by Date
    // ========================================================================

    const appointmentsByDate = new Map<string, number>();

    // First, add Excel-imported statistics
    importedStats?.forEach((stat: any) => {
      const date = stat.record_date;
      appointmentsByDate.set(date, (appointmentsByDate.get(date) || 0) + stat.appointments_completed);
    });

    console.log(`[Service Predictions API] Appointments map after imported data: ${appointmentsByDate.size} dates`);

    // Then, add real appointment data (using completed_at to match generate endpoint)
    appointments?.forEach((appointment: any) => {
      const completedAt = appointment.completed_at;
      if (completedAt) {
        const date = completedAt.split('T')[0];
        appointmentsByDate.set(date, (appointmentsByDate.get(date) || 0) + 1);
      }
    });

    // All historical data — for data quality assessment (needs full history for SARIMA)
    const allHistoricalData = Array.from(appointmentsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        value: count,
      }));

    // Filtered for chart display — only requested date range
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const historicalData = allHistoricalData.filter(d =>
      d.date >= startDateStr && d.date <= endDateStr
    );

    console.log('[Service Predictions API] All historical data points:', allHistoricalData.length);
    console.log('[Service Predictions API] Filtered historical data points (chart):', historicalData.length);

    // Check data quality based on ALL historical data (not just filtered)
    let dataQuality: 'high' | 'moderate' | 'insufficient' = 'high';
    if (allHistoricalData.length < 7) {
      dataQuality = 'insufficient';
    } else if (allHistoricalData.length < 30) {
      dataQuality = 'moderate';
    }

    // ========================================================================
    // Check for Cached Predictions in Database (Priority #1)
    // ========================================================================

    // Fetch ALL cached predictions for this service/granularity combo.
    // No date range filter — the predictions table only stores the most recent
    // generation (old ones are deleted on regenerate), so filtering by date
    // caused cache misses due to date arithmetic bugs (e.g. Dec 31 + 1 month).
    let predictionsQuery = adminClient
      .from('service_predictions')
      .select('prediction_date, predicted_appointments, prediction_data, granularity')
      .eq('service_id', serviceId)
      .eq('granularity', granularity)
      .order('prediction_date', { ascending: true });

    if (barangayId !== null) {
      predictionsQuery = predictionsQuery.eq('barangay_id', barangayId);
    } else {
      predictionsQuery = predictionsQuery.is('barangay_id', null);
    }

    const { data: cachedPredictions, error: cacheError } = await predictionsQuery;

    let predictions: Array<{ date: string; predicted_value: number; lower_bound: number; upper_bound: number }> = [];
    let usedCache = false;
    let modelMetadata: any = null;

    // Use cached predictions if available
    if (!cacheError && cachedPredictions && cachedPredictions.length > 0) {
      console.log(`[Service Predictions API] Found ${cachedPredictions.length} cached predictions in database`);

      predictions = cachedPredictions.map((pred: any) => ({
        date: pred.prediction_date,
        predicted_value: pred.predicted_appointments,
        lower_bound: pred.prediction_data?.lower_bound || 0,
        upper_bound: pred.prediction_data?.upper_bound || pred.predicted_appointments * 2,
      }));

      // Extract model metadata from first prediction
      if (cachedPredictions[0]?.prediction_data) {
        const firstPred = cachedPredictions[0].prediction_data;
        modelMetadata = {
          r_squared: firstPred.r_squared || 0.75,
          rmse: firstPred.rmse || 0,
          mae: firstPred.mae || 0,
          mse: firstPred.mse || 0,
          trend: firstPred.trend || 'stable',
          seasonality_detected: firstPred.seasonality_detected || false,
          data_quality: firstPred.data_quality || dataQuality,
        };
        dataQuality = firstPred.data_quality || dataQuality;
      }

      usedCache = true;
    }
    // ========================================================================
    // Fallback: Run SARIMA Predictions On-Fly (if no cached predictions)
    // ========================================================================
    else if (allHistoricalData.length >= 7) {
      console.log(`[Service Predictions API] No cached predictions found, generating ${granularity} predictions on-fly...`);

      try {
        predictions = await runLocalSARIMA(allHistoricalData, periodsForecast, granularity as 'daily' | 'monthly');
        console.log(`[Service Predictions API] Generated ${predictions.length} ${granularity} predictions on-fly`);
        usedCache = false;
      } catch (sarimaError) {
        console.error('[Service Predictions API] SARIMA error:', sarimaError);
        // Continue without predictions - will show historical data only
      }
    } else {
      console.log('[Service Predictions API] Insufficient data for predictions (need at least 7 points)');
    }

    // ========================================================================
    // Transform Data for Chart.js
    // ========================================================================

    const today = new Date().toISOString().split('T')[0];

    // Combine historical and predicted dates
    const allDates: string[] = [];
    const actualValues: (number | null)[] = [];
    const predictedValues: (number | null)[] = [];
    const lowerBound: (number | null)[] = [];
    const upperBound: (number | null)[] = [];

    // Add historical data
    historicalData.forEach(({ date, value }) => {
      allDates.push(date);
      actualValues.push(value);
      predictedValues.push(null);
      lowerBound.push(null);
      upperBound.push(null);
    });

    // Add predictions
    predictions.forEach(({ date, predicted_value, lower_bound: lb, upper_bound: ub }) => {
      allDates.push(date);
      actualValues.push(null);
      predictedValues.push(predicted_value);
      lowerBound.push(lb);
      upperBound.push(ub);
    });

    // Get barangay name if filtered
    let barangayName: string | null = null;
    if (barangayId !== null) {
      const { data: barangay } = await adminClient
        .from('barangays')
        .select('name')
        .eq('id', barangayId)
        .single();
      barangayName = barangay?.name || null;
    }

    // ========================================================================
    // Return Response
    // ========================================================================

    return NextResponse.json({
      success: true,
      data: {
        dates: allDates,
        actualValues,
        predictedValues,
        lowerBound,
        upperBound,
        barangay_name: barangayName,
      },
      data_quality: dataQuality,
      metadata: {
        service_id: serviceId,
        barangay_id: barangayId,
        periods_back: periodsBack,
        periods_forecast: periodsForecast,
        granularity: granularity,
        historical_data_points: historicalData.length,
        prediction_points: predictions.length,
        total_appointments: historicalData.reduce((sum, { value }) => sum + value, 0),
        used_cache: usedCache,
        model_accuracy: modelMetadata, // Include accuracy metrics for display
      },
    });
  } catch (error) {
    console.error('[Service Predictions API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
