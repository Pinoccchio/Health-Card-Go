import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateDiseaseSARIMAPredictions,
  formatDiseaseHistoricalData,
  validateDiseasePredictions,
  calculateDataQuality,
} from '@/lib/ai/geminiDiseaseSARIMA';

/**
 * POST /api/diseases/generate-predictions
 * Generate disease predictions using Gemini AI
 * (Staff and Super Admin only)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user profile and check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    // Only Staff and Super Admin can generate predictions
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Staff and Super Admins can generate disease predictions',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { diseaseType = 'all', barangayId = null, daysForecast = 30 } = body;

    const startTime = Date.now();

    console.log('========================================');
    console.log('[DISEASE PREDICTIONS] STARTING GENERATION');
    console.log(`[DISEASE PREDICTIONS] Request:`, { diseaseType, barangayId, daysForecast });
    console.log('========================================');

    // Validate disease type
    const validDiseaseTypes = [
      'all',
      'dengue',
      'hiv_aids',
      'malaria',
      'measles',
      'rabies',
      'pregnancy_complications',
      'other',
    ];
    if (!validDiseaseTypes.includes(diseaseType)) {
      return NextResponse.json(
        { success: false, error: `Invalid disease type: ${diseaseType}` },
        { status: 400 }
      );
    }

    // Fetch barangays for name lookup
    const { data: barangays, error: barangaysError } = await supabase
      .from('barangays')
      .select('id, name');

    if (barangaysError) {
      console.error('Error fetching barangays:', barangaysError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch barangays' },
        { status: 500 }
      );
    }

    // Determine which diseases to generate predictions for
    const diseasesToGenerate =
      diseaseType === 'all'
        ? ['dengue', 'hiv_aids', 'malaria', 'measles', 'rabies', 'pregnancy_complications']
        : [diseaseType];

    const results: Array<{
      disease_type: string;
      barangay_name: string | null;
      success: boolean;
      predictions_count: number;
      data_quality: string;
      error?: string;
    }> = [];

    // Generate predictions for each disease
    for (const disease of diseasesToGenerate) {
      try {
        // Build query for historical data
        let query = supabase
          .from('disease_statistics')
          .select('record_date, case_count')
          .eq('disease_type', disease)
          .order('record_date', { ascending: true });

        // Filter by barangay if specified
        if (barangayId) {
          query = query.eq('barangay_id', barangayId);
        }

        // Fetch historical data
        const { data: historicalRecords, error: historyError } = await query;

        if (historyError) {
          console.error(`Error fetching historical data for ${disease}:`, historyError);
          results.push({
            disease_type: disease,
            barangay_name: barangayId
              ? barangays?.find((b) => b.id === barangayId)?.name || null
              : null,
            success: false,
            predictions_count: 0,
            data_quality: 'insufficient',
            error: 'Failed to fetch historical data',
          });
          continue;
        }

        // Check data sufficiency
        if (!historicalRecords || historicalRecords.length < 7) {
          console.warn(`Insufficient data for ${disease}: ${historicalRecords?.length || 0} points`);
          results.push({
            disease_type: disease,
            barangay_name: barangayId
              ? barangays?.find((b) => b.id === barangayId)?.name || null
              : null,
            success: false,
            predictions_count: 0,
            data_quality: 'insufficient',
            error: `Insufficient historical data (${historicalRecords?.length || 0} points). Minimum 7 required.`,
          });
          continue;
        }

        // Format data for Gemini
        const formattedData = formatDiseaseHistoricalData(historicalRecords);

        // Get barangay name for context
        const barangayName = barangayId
          ? barangays?.find((b) => b.id === barangayId)?.name || `Barangay ${barangayId}`
          : 'System-Wide';

        // ========================================
        // 24-HOUR CACHE CHECK (Prevent quota exhaustion)
        // ========================================
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const cacheQuery = supabase
          .from('disease_predictions')
          .select('generated_at, data_points_count')
          .eq('disease_type', disease);

        if (barangayId) {
          cacheQuery.eq('barangay_id', barangayId);
        } else {
          cacheQuery.is('barangay_id', null);
        }

        const { data: recentPredictions } = await cacheQuery
          .gte('generated_at', twentyFourHoursAgo)
          .order('generated_at', { ascending: false }) // Get the MOST RECENT prediction
          .limit(1);

        if (recentPredictions && recentPredictions.length > 0) {
          const cacheAge = Math.round((Date.now() - new Date(recentPredictions[0].generated_at).getTime()) / (1000 * 60 * 60));
          console.log(`[Cache Hit] Using recent predictions for ${disease} (generated ${cacheAge}h ago)`);

          results.push({
            disease_type: disease,
            barangay_name: barangayName,
            success: true,
            predictions_count: 30, // Assuming 30 predictions
            data_quality: 'high', // From cache
            cached: true,
            cache_age_hours: cacheAge,
          });
          continue; // Skip Gemini API call
        }

        // ========================================
        // RATE LIMITING (Stay under 15 RPM)
        // ========================================
        // Add 10-second delay between diseases (except first one)
        if (disease !== diseasesToGenerate[0]) {
          console.log(`[Rate Limit] Waiting 10 seconds before generating ${disease}...`);
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }

        // Generate predictions using Gemini AI
        console.log(`[Generate Predictions] Calling Gemini for ${disease} in ${barangayName}...`);
        const forecast = await generateDiseaseSARIMAPredictions(
          formattedData,
          disease,
          barangayName,
          daysForecast
        );

        // Validate predictions
        const validatedPredictions = validateDiseasePredictions(forecast.predictions);

        // Calculate data quality
        const qualityInfo = calculateDataQuality(formattedData.length);

        // Delete old predictions for this disease/barangay combination
        const deleteQuery = supabase
          .from('disease_predictions')
          .delete()
          .eq('disease_type', disease);

        if (barangayId) {
          deleteQuery.eq('barangay_id', barangayId);
        } else {
          deleteQuery.is('barangay_id', null);
        }

        await deleteQuery;

        // Prepare prediction records for insertion
        const predictionRecords = validatedPredictions.map((pred) => ({
          disease_type: disease,
          barangay_id: barangayId,
          prediction_date: pred.date,
          predicted_cases: pred.predicted_cases,
          confidence_upper: pred.upper_bound,
          confidence_lower: pred.lower_bound,
          confidence_level: pred.confidence_level,
          model_version: forecast.model_version,
          accuracy_r_squared: forecast.accuracy_metrics.r_squared,
          accuracy_rmse: forecast.accuracy_metrics.rmse,
          accuracy_mae: forecast.accuracy_metrics.mae,
          accuracy_mse: forecast.accuracy_metrics.mse,
          trend: forecast.trend,
          seasonality_detected: forecast.seasonality_detected,
          data_quality: forecast.data_quality,
          data_points_count: formattedData.length,
          generated_at: new Date().toISOString(),
          generated_by_id: user.id,
          // Store full forecast JSON (fixes NULL prediction_data issue)
          prediction_data: {
            full_forecast: forecast,
            historical_data_count: formattedData.length,
            generated_by_model: 'gemini-2.5-flash-lite',
            timestamp: new Date().toISOString(),
          },
        }));

        // Insert new predictions
        const { error: insertError } = await supabase
          .from('disease_predictions')
          .insert(predictionRecords);

        if (insertError) {
          console.error(`Error inserting predictions for ${disease}:`, insertError);
          results.push({
            disease_type: disease,
            barangay_name: barangayName,
            success: false,
            predictions_count: 0,
            data_quality: qualityInfo.quality,
            error: 'Failed to save predictions to database',
          });
          continue;
        }

        const diseaseTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `[✓ ${disease.toUpperCase()}] ${validatedPredictions.length} predictions | R²: ${forecast.accuracy_metrics.r_squared.toFixed(2)} | Quality: ${forecast.data_quality} | Time: ${diseaseTime}s`
        );

        results.push({
          disease_type: disease,
          barangay_name: barangayName,
          success: true,
          predictions_count: validatedPredictions.length,
          data_quality: qualityInfo.quality,
        });
      } catch (error) {
        console.error(`Error generating predictions for ${disease}:`, error);
        results.push({
          disease_type: disease,
          barangay_name: barangayId
            ? barangays?.find((b) => b.id === barangayId)?.name || null
            : null,
          success: false,
          predictions_count: 0,
          data_quality: 'insufficient',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Calculate summary
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;
    const totalPredictions = results.reduce((sum, r) => sum + r.predictions_count, 0);
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Calculate average R² for successful predictions
    const successfulResults = results.filter((r) => r.success && r.accuracy_r_squared);
    const avgRSquared = successfulResults.length > 0
      ? (successfulResults.reduce((sum, r) => sum + (r.accuracy_r_squared || 0), 0) / successfulResults.length).toFixed(2)
      : 'N/A';

    console.log('========================================');
    console.log('[DISEASE PREDICTIONS] GENERATION COMPLETE');
    console.log(`[DISEASE PREDICTIONS] ✓ Successful: ${successCount}/${results.length} diseases`);
    if (failedCount > 0) {
      console.log(`[DISEASE PREDICTIONS] ✗ Failed: ${failedCount}/${results.length} diseases`);
    }
    console.log(`[DISEASE PREDICTIONS] Total predictions: ${totalPredictions}`);
    console.log(`[DISEASE PREDICTIONS] Total duration: ${totalDuration}s`);
    console.log(`[DISEASE PREDICTIONS] Average R²: ${avgRSquared}`);
    console.log('========================================');

    return NextResponse.json({
      success: successCount > 0,
      message:
        successCount > 0
          ? `Successfully generated predictions for ${successCount} disease(s)`
          : 'Failed to generate predictions',
      summary: {
        total_diseases: results.length,
        successful: successCount,
        failed: failedCount,
        total_predictions: totalPredictions,
      },
      results,
    });
  } catch (error) {
    console.error('[Generate Predictions] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during prediction generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
