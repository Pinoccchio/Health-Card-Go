/**
 * Gemini AI HealthCard Predictions Generator API
 *
 * POST /api/healthcards/generate-predictions
 *
 * Uses Google Gemini AI to analyze historical health card issuance data
 * and generate SARIMA predictions with confidence intervals.
 *
 * Body Parameters:
 * - healthcard_type: 'food_handler' | 'non_food' (required)
 * - barangay_id: number (optional, null for system-wide)
 * - days_forecast: number (optional, default: 30)
 * - auto_save: boolean (optional, default: true - save to database)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { HealthCardType } from '@/types/healthcard';
import { isValidHealthCardType } from '@/lib/utils/healthcardHelpers';
import { generateSARIMAPredictions, formatHistoricalData, validatePredictions } from '@/lib/ai/geminiSARIMA';

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

    // Check if user is Super Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gemini AI not configured. Please set GEMINI_API_KEY environment variable.',
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const healthcardTypeParam = body.healthcard_type;
    const barangayId = body.barangay_id || null;
    const daysForecast = body.days_forecast || 30;
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

    console.log('[Generate Predictions API] Parameters:', {
      healthcardType,
      barangayId,
      daysForecast,
      autoSave,
      serviceIds,
    });

    // ========================================================================
    // Fetch Historical Data
    // ========================================================================

    let query = supabase
      .from('appointments')
      .select('id, completed_at, service_id, patient_id')
      .eq('status', 'completed')
      .in('service_id', serviceIds)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true });

    // Apply barangay filter if specified
    if (barangayId !== null) {
      // Join with patients and profiles to filter by barangay
      query = supabase
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

    if (!appointments || appointments.length < 7) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient historical data. Found ${appointments?.length || 0} appointments, need at least 7 for accurate predictions.`,
        },
        { status: 400 }
      );
    }

    console.log('[Generate Predictions API] Historical data points:', appointments.length);

    // Format historical data
    const historicalData = formatHistoricalData(appointments);

    console.log('[Generate Predictions API] Formatted data points:', historicalData.length);

    // ========================================================================
    // Generate Predictions with Gemini AI
    // ========================================================================

    console.log('[Generate Predictions API] Calling Gemini AI...');
    const forecast = await generateSARIMAPredictions(
      historicalData,
      healthcardType,
      daysForecast
    );

    console.log('[Generate Predictions API] Gemini AI forecast received:', {
      predictions: forecast.predictions.length,
      trend: forecast.trend,
      r_squared: forecast.accuracy_metrics.r_squared,
    });

    // Validate predictions
    const validatedPredictions = validatePredictions(forecast.predictions);

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
        const deleteQuery = supabase
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

      // Insert new predictions
      const predictionsToInsert = validatedPredictions.map((pred) => ({
        healthcard_type: healthcardType,
        barangay_id: barangayId,
        prediction_date: pred.date,
        predicted_cards: pred.predicted_cards,
        confidence_level: pred.confidence_level,
        model_version: forecast.model_version,
        prediction_data: {
          upper_bound: pred.upper_bound,
          lower_bound: pred.lower_bound,
          mse: forecast.accuracy_metrics.mse,
          rmse: forecast.accuracy_metrics.rmse,
          mae: forecast.accuracy_metrics.mae,
          r_squared: forecast.accuracy_metrics.r_squared,
          trend: forecast.trend,
          seasonality_detected: forecast.seasonality_detected,
          generated_by: 'gemini-ai',
          generated_at: new Date().toISOString(),
        },
      }));

      const { data: insertedData, error: insertError } = await supabase
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

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${validatedPredictions.length} predictions using Gemini AI`,
      data: {
        healthcard_type: healthcardType,
        barangay_id: barangayId,
        days_forecast: daysForecast,
        predictions: validatedPredictions,
        model_metadata: {
          version: forecast.model_version,
          accuracy_metrics: forecast.accuracy_metrics,
          trend: forecast.trend,
          seasonality_detected: forecast.seasonality_detected,
          generated_by: 'google-gemini-1.5-flash',
          generated_at: new Date().toISOString(),
        },
        historical_data_points: historicalData.length,
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
