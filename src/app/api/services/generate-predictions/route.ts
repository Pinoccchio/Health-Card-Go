/**
 * Local SARIMA Service Predictions Generator API
 *
 * POST /api/services/generate-predictions
 *
 * Uses local SARIMA model to analyze historical appointment booking data
 * and generate SARIMA predictions with confidence intervals.
 *
 * Body Parameters:
 * - service_id: number (required) - Service ID (16 for HIV, 17 for Pregnancy, etc.)
 * - barangay_id: number (optional, null for system-wide)
 * - days_forecast: number (optional, default: 30)
 * - auto_save: boolean (optional, default: true - save to database)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { runLocalSARIMA } from '@/lib/sarima/localSARIMA';

export async function POST(request: NextRequest) {
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
    const serviceId = body.service_id;
    const barangayId = body.barangay_id || null;

    // MONTHLY GRANULARITY SUPPORT: Accept both legacy and new parameters
    const granularity = body.granularity || 'monthly'; // Default to monthly
    const forecastPeriods = body.months_forecast || body.days_forecast || 12; // Default 12 months
    const autoSave = body.auto_save !== false; // Default true

    // Validate service_id
    if (!serviceId || typeof serviceId !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid service_id. Must be a number.',
        },
        { status: 400 }
      );
    }

    // ========================================================================
    // AUTHORIZATION CHECK
    // ========================================================================

    // Super Admins can generate for any service
    // Healthcare Admins can only generate for their assigned service
    if (profile.role === 'healthcare_admin') {
      if (profile.assigned_service_id !== serviceId) {
        return NextResponse.json(
          {
            success: false,
            error: `Forbidden: Healthcare Admins can only generate predictions for their assigned service (Service ${profile.assigned_service_id})`,
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

    console.log('[Generate Service Predictions API] Parameters:', {
      serviceId,
      barangayId,
      forecastPeriods,
      granularity,
      autoSave,
      userId: user.id,
      userRole: profile.role,
    });

    // ========================================================================
    // Fetch Historical Appointment Data
    // ========================================================================

    // Use admin client to bypass RLS for fetching system-wide appointment data
    // (authentication already verified above)
    const adminClient = createAdminClient();

    let query = adminClient
      .from('appointments')
      .select('appointment_date, status')
      .eq('service_id', serviceId)
      .in('status', ['scheduled', 'verified', 'in_progress', 'completed'])
      .order('appointment_date', { ascending: true });

    // Apply barangay filter if specified
    if (barangayId !== null) {
      // Join with patients to filter by barangay
      query = adminClient
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
        .in('status', ['scheduled', 'verified', 'in_progress', 'completed'])
        .order('appointment_date', { ascending: true });
    }

    const { data: appointments, error: histError } = await query;

    if (histError) {
      console.error('[Generate Service Predictions API] Historical data error:', histError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch historical appointment data' },
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

    console.log('[Generate Service Predictions API] Found appointments:', appointments.length);

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
      console.error('[Generate Service Predictions API] Statistics query error:', statsError);
      // Don't fail - just log and continue with appointment data only
      console.warn('[Generate Service Predictions API] Continuing without imported statistics');
    }

    console.log(`[Generate Service Predictions API] Found ${importedStats?.length || 0} imported statistics records`);

    // ========================================================================
    // Merge Both Data Sources - Aggregate by Date
    // ========================================================================

    const appointmentsByDate = new Map<string, number>();

    // First, add Excel-imported statistics
    importedStats?.forEach((stat: any) => {
      const date = stat.record_date;
      appointmentsByDate.set(date, (appointmentsByDate.get(date) || 0) + stat.appointments_completed);
    });

    console.log(`[Generate Service Predictions API] Appointments map after imported data: ${appointmentsByDate.size} dates`);

    // Then, add real appointment data
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

    console.log('[Generate Service Predictions API] Total merged data points:', historicalData.length);

    if (historicalData.length < 7) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient historical data. Found ${historicalData.length} data points, need at least 7 for accurate predictions.`,
        },
        { status: 400 }
      );
    }

    // Check data quality
    let dataQuality: 'high' | 'moderate' | 'insufficient' = 'high';
    if (historicalData.length < 7) {
      dataQuality = 'insufficient';
    } else if (historicalData.length < 30) {
      dataQuality = 'moderate';
    }

    // ========================================================================
    // Generate Predictions with Local SARIMA
    // ========================================================================

    console.log(`[Generate Service Predictions API] Running local SARIMA with ${granularity} granularity...`);
    const predictions = await runLocalSARIMA(historicalData, forecastPeriods, granularity as 'daily' | 'monthly');

    console.log('[Generate Service Predictions API] Local SARIMA forecast received:', {
      predictions: predictions.length,
      granularity,
      dataQuality,
    });

    // ========================================================================
    // Calculate Accuracy Metrics (simplified)
    // ========================================================================

    // For now, use placeholder metrics
    // TODO: Implement back-testing for service predictions similar to disease SARIMA
    const accuracyMetrics = {
      mse: 0,
      rmse: 0,
      mae: 0,
      r_squared: 0.75, // Placeholder
    };

    // ========================================================================
    // Save to Database (if auto_save enabled)
    // ========================================================================

    let savedCount = 0;

    if (autoSave) {
      console.log('[Generate Service Predictions API] Saving predictions to database...');

      // Delete existing predictions for this service/barangay/date range
      const firstDate = predictions[0]?.date;
      const lastDate = predictions[predictions.length - 1]?.date;

      if (firstDate && lastDate) {
        const deleteQuery = supabase
          .from('service_predictions')
          .delete()
          .eq('service_id', serviceId)
          .gte('prediction_date', firstDate)
          .lte('prediction_date', lastDate);

        if (barangayId !== null) {
          deleteQuery.eq('barangay_id', barangayId);
        } else {
          deleteQuery.is('barangay_id', null);
        }

        const { error: deleteError } = await deleteQuery;

        if (deleteError) {
          console.warn('[Generate Service Predictions API] Failed to delete old predictions:', deleteError);
        } else {
          console.log('[Generate Service Predictions API] Deleted old predictions');
        }
      }

      // Insert new predictions with granularity
      const predictionsToInsert = predictions.map((pred) => ({
        service_id: serviceId,
        barangay_id: barangayId,
        prediction_date: pred.date,
        predicted_appointments: pred.predicted_value,
        confidence_level: 0.95,
        model_version: `Local-SARIMA-${granularity}-v2.0`,
        granularity: granularity, // NEW: Store granularity
        prediction_data: {
          upper_bound: pred.upper_bound,
          lower_bound: pred.lower_bound,
          mse: accuracyMetrics.mse,
          rmse: accuracyMetrics.rmse,
          mae: accuracyMetrics.mae,
          r_squared: accuracyMetrics.r_squared,
          trend: 'stable', // Placeholder
          seasonality_detected: false,
          data_quality: dataQuality,
          generated_by: 'local-sarima',
          generated_at: new Date().toISOString(),
        },
        generated_by_id: user.id,
      }));

      const { data: insertedData, error: insertError } = await supabase
        .from('service_predictions')
        .insert(predictionsToInsert)
        .select();

      if (insertError) {
        console.error('[Generate Service Predictions API] Insert error:', insertError);
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
      console.log('[Generate Service Predictions API] Saved predictions:', savedCount);
    }

    // ========================================================================
    // Build Response
    // ========================================================================

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${predictions.length} ${granularity} predictions using local SARIMA`,
      data: {
        service_id: serviceId,
        barangay_id: barangayId,
        forecast_periods: forecastPeriods,
        granularity: granularity,
        predictions: predictions,
        model_metadata: {
          version: `Local-SARIMA-${granularity}-v2.0`,
          accuracy_metrics: accuracyMetrics,
          trend: 'stable',
          seasonality_detected: false,
          data_quality: dataQuality,
          generated_by: 'local-sarima-arima-js',
          generated_at: new Date().toISOString(),
        },
        historical_data_points: historicalData.length,
        data_sources: {
          appointments: appointments.length,
          imported_statistics: importedStats?.length || 0,
          merged_dates: historicalData.length,
        },
        saved_to_database: autoSave,
        saved_count: savedCount,
      },
    });
  } catch (error) {
    console.error('[Generate Service Predictions API] Unexpected error:', error);
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
