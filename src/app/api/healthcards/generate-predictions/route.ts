/**
 * Local SARIMA HealthCard Predictions Generator API
 *
 * POST /api/healthcards/generate-predictions
 *
 * Uses local SARIMA model to analyze historical health card issuance data
 * and generate SARIMA predictions with confidence intervals.
 *
 * Body Parameters:
 * - healthcard_type: 'food_handler' | 'non_food' (required)
 * - barangay_id: number (optional, null for system-wide)
 * - days_forecast: number (optional, default: 30)
 * - auto_save: boolean (optional, default: true - save to database)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { HealthCardType } from '@/types/healthcard';
import { isValidHealthCardType } from '@/lib/utils/healthcardHelpers';
import { generateSARIMAPredictions, formatHistoricalData } from '@/lib/sarima/localSARIMA';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication (Super Admin only)
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

    // Get user profile with role and assigned service
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const healthcardTypeParam = body.healthcard_type;
    const barangayId = body.barangay_id || null;

    // MONTHLY GRANULARITY SUPPORT: Accept both legacy and new parameters
    const granularity = body.granularity || 'monthly'; // Default to monthly
    const forecastPeriods = body.months_forecast || body.days_forecast || 12; // Default 12 months
    const autoSave = body.auto_save !== false; // Default true

    // Validate healthcard type
    if (!healthcardTypeParam || !isValidHealthCardType(healthcardTypeParam)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid healthcard_type. Must be "food_handler" or "non_food"',
        },
        { status: 400 }
      );
    }

    const healthcardType: HealthCardType = healthcardTypeParam;
    const serviceIds = healthcardType === 'food_handler' ? [12, 13] : [14, 15];

    // ========================================================================
    // AUTHORIZATION CHECK
    // ========================================================================

    // Super Admins can generate for any healthcard type
    // Healthcare Admins with 'healthcard' category can generate for Yellow and Green (NOT pink)
    // Healthcare Admins with 'hiv' or 'pink_card' category can ONLY generate for Pink cards
    if (profile.role === 'healthcare_admin') {
      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('admin_category')
        .eq('id', user.id)
        .single();

      const adminCategory = fullProfile?.admin_category;

      // HealthCard admins can generate for Yellow and Green cards only
      if (adminCategory === 'healthcard') {
        if (healthcardType === 'pink') {
          return NextResponse.json(
            {
              success: false,
              error: 'Forbidden: HealthCard admins cannot generate predictions for Pink cards. Pink cards are managed by HIV admins.',
            },
            { status: 403 }
          );
        }
        // Allow food_handler and non_food
      }
      // HIV and Pink Card admins can ONLY generate for Pink cards
      else if (adminCategory === 'hiv' || adminCategory === 'pink_card') {
        if (healthcardType !== 'pink') {
          return NextResponse.json(
            {
              success: false,
              error: `Forbidden: ${adminCategory === 'hiv' ? 'HIV' : 'Pink Card'} admins can only generate predictions for Pink cards.`,
            },
            { status: 403 }
          );
        }
      }
      // Other admin categories cannot access this endpoint
      else {
        return NextResponse.json(
          {
            success: false,
            error: `Forbidden: Healthcare Admins with category '${adminCategory}' cannot generate healthcard predictions.`,
          },
          { status: 403 }
        );
      }
    } else if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin or Healthcare Admin access required' },
        { status: 403 }
      );
    }

    console.log('[Generate Predictions API] Parameters:', {
      healthcardType,
      barangayId,
      forecastPeriods,
      granularity,
      autoSave,
      serviceIds,
    });

    // ========================================================================
    // Fetch Historical Data
    // ========================================================================

    // Use admin client to bypass RLS for fetching system-wide appointment data
    // (authentication already verified above)
    const adminClient = createAdminClient();

    let query = adminClient
      .from('appointments')
      .select('id, completed_at, service_id, patient_id')
      .eq('status', 'completed')
      .in('service_id', serviceIds)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true });

    // Apply barangay filter if specified
    if (barangayId !== null) {
      // Join with patients and profiles to filter by barangay
      query = adminClient
        .from('appointments')
        .select(`
          id,
          completed_at,
          service_id,
          patient_id,
          patients!inner(
            user_id,
            profiles!inner(barangay_id)
          )
        `)
        .eq('status', 'completed')
        .in('service_id', serviceIds)
        .not('completed_at', 'is', null)
        .eq('patients.profiles.barangay_id', barangayId)
        .order('completed_at', { ascending: true });
    }

    const { data: appointments, error: histError } = await query;

    if (histError) {
      console.error('[Generate Predictions API] Historical data error:', histError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch historical data' },
        { status: 500 }
      );
    }

    console.log('[Generate Predictions API] Found appointments:', appointments?.length || 0);

    // ========================================================================
    // Fetch Excel-Imported Historical Statistics
    // ========================================================================

    let statisticsQuery = adminClient
      .from('healthcard_statistics')
      .select('*')
      .eq('healthcard_type', healthcardType)
      .order('record_date', { ascending: true });

    // Apply barangay filter if specified
    if (barangayId !== null) {
      statisticsQuery = statisticsQuery.eq('barangay_id', barangayId);
    }

    const { data: importedStats, error: statsError } = await statisticsQuery;

    if (statsError) {
      console.error('[Generate Predictions API] Statistics query error:', statsError);
      // Don't fail - just log and continue with appointment data only
      console.warn('[Generate Predictions API] Continuing without imported statistics');
    }

    console.log('[Generate Predictions API] Found imported statistics:', importedStats?.length || 0);

    // ========================================================================
    // Merge Both Data Sources
    // ========================================================================

    // Aggregate by date (YYYY-MM-DD format)
    const cardsByDate = new Map<string, number>();

    // First, add Excel-imported statistics
    importedStats?.forEach((stat: any) => {
      const date = stat.record_date;
      cardsByDate.set(date, (cardsByDate.get(date) || 0) + stat.cards_issued);
    });

    console.log(`[Generate Predictions API] Cards map after imported data: ${cardsByDate.size} dates`);

    // Then, add real appointment data
    appointments?.forEach((appointment: any) => {
      const completedDate = new Date(appointment.completed_at).toISOString().split('T')[0];
      cardsByDate.set(completedDate, (cardsByDate.get(completedDate) || 0) + 1);
    });

    // Convert to array for SARIMA
    const mergedAppointments = Array.from(cardsByDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        completed_at: date,
        count: count,
      }));

    console.log('[Generate Predictions API] Total merged data points:', mergedAppointments.length);

    if (!mergedAppointments || mergedAppointments.length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient historical data. Found ${mergedAppointments?.length || 0} data points, need at least 5 for monthly aggregation.`,
        },
        { status: 400 }
      );
    }

    // Format historical data
    const historicalData = formatHistoricalData(mergedAppointments);

    console.log('[Generate Predictions API] Formatted data points:', historicalData.length);

    // ========================================================================
    // Generate Predictions with Local SARIMA
    // ========================================================================

    console.log(`[Generate Predictions API] Running local SARIMA with ${granularity} granularity...`);
    const forecast = await generateSARIMAPredictions(
      historicalData,
      healthcardType,
      forecastPeriods,
      granularity as 'daily' | 'monthly'
    );

    console.log('[Generate Predictions API] Local SARIMA forecast received:', {
      predictions: forecast.predictions.length,
      trend: forecast.trend,
      r_squared: forecast.accuracy_metrics.r_squared,
    });

    // Predictions are already validated by local SARIMA
    const validatedPredictions = forecast.predictions;

    // ========================================================================
    // Save to Database (if auto_save enabled)
    // ========================================================================

    let savedCount = 0;

    if (autoSave) {
      console.log('[Generate Predictions API] Saving predictions to database...');

      // Delete existing predictions for this type/barangay/date range
      const firstDate = validatedPredictions[0]?.date;
      const lastDate = validatedPredictions[validatedPredictions.length - 1]?.date;

      if (firstDate && lastDate) {
        const deleteQuery = adminClient
          .from('healthcard_predictions')
          .delete()
          .eq('healthcard_type', healthcardType)
          .gte('prediction_date', firstDate)
          .lte('prediction_date', lastDate);

        if (barangayId !== null) {
          deleteQuery.eq('barangay_id', barangayId);
        } else {
          deleteQuery.is('barangay_id', null);
        }

        const { error: deleteError } = await deleteQuery;

        if (deleteError) {
          console.warn('[Generate Predictions API] Failed to delete old predictions:', deleteError);
        } else {
          console.log('[Generate Predictions API] Deleted old predictions');
        }
      }

      // Insert new predictions with granularity
      const predictionsToInsert = validatedPredictions.map((pred) => ({
        healthcard_type: healthcardType,
        barangay_id: barangayId,
        prediction_date: pred.date,
        predicted_cards: pred.predicted_cards,
        confidence_level: pred.confidence_level,
        model_version: forecast.model_version,
        granularity: granularity, // NEW: Store granularity
        prediction_data: {
          upper_bound: pred.upper_bound,
          lower_bound: pred.lower_bound,
          mse: forecast.accuracy_metrics.mse,
          rmse: forecast.accuracy_metrics.rmse,
          mae: forecast.accuracy_metrics.mae,
          r_squared: forecast.accuracy_metrics.r_squared,
          trend: forecast.trend,
          seasonality_detected: forecast.seasonality_detected,
          generated_by: 'local-sarima',
          generated_at: new Date().toISOString(),
        },
      }));

      const { data: insertedData, error: insertError } = await adminClient
        .from('healthcard_predictions')
        .insert(predictionsToInsert)
        .select();

      if (insertError) {
        console.error('[Generate Predictions API] Insert error:', insertError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to save predictions to database',
            details: insertError.message,
          },
          { status: 500 }
        );
      }

      savedCount = insertedData?.length || 0;
      console.log('[Generate Predictions API] Saved predictions:', savedCount);
    }

    // ========================================================================
    // Build Response
    // ========================================================================

    const periodLabel = granularity === 'monthly' ? 'months' : 'days';
    return NextResponse.json({
      success: true,
      message: `Successfully generated ${validatedPredictions.length} ${granularity} predictions using local SARIMA`,
      data: {
        healthcard_type: healthcardType,
        barangay_id: barangayId,
        forecast_periods: forecastPeriods,
        granularity: granularity,
        predictions: validatedPredictions,
        model_metadata: {
          version: forecast.model_version,
          accuracy_metrics: forecast.accuracy_metrics,
          trend: forecast.trend,
          seasonality_detected: forecast.seasonality_detected,
          generated_by: 'local-sarima-arima-js',
          generated_at: new Date().toISOString(),
        },
        historical_data_points: historicalData.length,
        data_sources: {
          appointments: appointments.length,
          imported_statistics: importedStats?.length || 0,
          merged_dates: mergedAppointments.length,
        },
        saved_to_database: autoSave,
        saved_count: savedCount,
      },
    });
  } catch (error) {
    console.error('[Generate Predictions API] Unexpected error:', error);
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
