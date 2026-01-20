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
import { createClient } from '@/lib/supabase/server';
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

    // Calculate date range based on granularity
    const endDate = new Date();
    const startDate = new Date();
    if (granularity === 'monthly') {
      startDate.setMonth(startDate.getMonth() - periodsBack);
    } else {
      startDate.setDate(startDate.getDate() - periodsBack);
    }

    // ========================================================================
    // Fetch Historical Appointment Data
    // ========================================================================

    let appointmentsQuery = supabase
      .from('appointments')
      .select('appointment_date, status')
      .eq('service_id', serviceId)
      .in('status', ['scheduled', 'checked_in', 'in_progress', 'completed'])
      .gte('appointment_date', startDate.toISOString().split('T')[0])
      .lte('appointment_date', endDate.toISOString().split('T')[0])
      .order('appointment_date', { ascending: true });

    if (barangayId !== null) {
      // Join with patients to filter by barangay
      appointmentsQuery = supabase
        .from('appointments')
        .select(`
          appointment_date,
          status,
          patients!inner (
            barangay_id
          )
        `)
        .eq('service_id', serviceId)
        .eq('patients.barangay_id', barangayId)
        .in('status', ['scheduled', 'checked_in', 'in_progress', 'completed'])
        .gte('appointment_date', startDate.toISOString().split('T')[0])
        .lte('appointment_date', endDate.toISOString().split('T')[0])
        .order('appointment_date', { ascending: true });
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
    // Aggregate Appointments by Date
    // ========================================================================

    const appointmentsByDate = new Map<string, number>();

    // Initialize all dates in range with 0
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      appointmentsByDate.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count appointments per date
    appointments?.forEach((appointment: any) => {
      const date = appointment.appointment_date;
      appointmentsByDate.set(date, (appointmentsByDate.get(date) || 0) + 1);
    });

    // Convert to array for SARIMA
    const historicalData = Array.from(appointmentsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        value: count,
      }));

    console.log('[Service Predictions API] Historical data points:', historicalData.length);

    // Check data quality
    let dataQuality: 'high' | 'moderate' | 'insufficient' = 'high';
    if (historicalData.length < 7) {
      dataQuality = 'insufficient';
    } else if (historicalData.length < 30) {
      dataQuality = 'moderate';
    }

    // ========================================================================
    // Check for Cached Predictions in Database (Priority #1)
    // ========================================================================

    const forecastStartDate = new Date(endDate);
    const forecastEndDate = new Date(endDate);
    if (granularity === 'monthly') {
      forecastStartDate.setMonth(forecastStartDate.getMonth() + 1);
      forecastEndDate.setMonth(forecastEndDate.getMonth() + periodsForecast);
    } else {
      forecastStartDate.setDate(forecastStartDate.getDate() + 1);
      forecastEndDate.setDate(forecastEndDate.getDate() + periodsForecast);
    }

    let predictionsQuery = supabase
      .from('service_predictions')
      .select('prediction_date, predicted_appointments, prediction_data, granularity')
      .eq('service_id', serviceId)
      .eq('granularity', granularity) // Filter by granularity
      .gte('prediction_date', forecastStartDate.toISOString().split('T')[0])
      .lte('prediction_date', forecastEndDate.toISOString().split('T')[0])
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
    else if (historicalData.length >= 7) {
      console.log(`[Service Predictions API] No cached predictions found, generating ${granularity} predictions on-fly...`);

      try {
        predictions = await runLocalSARIMA(historicalData, periodsForecast, granularity as 'daily' | 'monthly');
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
      const { data: barangay } = await supabase
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
