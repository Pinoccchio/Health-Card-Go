/**
 * HealthCard Seed Predictions API
 *
 * POST /api/healthcards/seed-predictions
 *
 * Seeds demo SARIMA predictions for testing and development.
 * Generates realistic predictions for both Food Handler and Non-Food health cards.
 *
 * Body Parameters:
 * - days_forecast: number (optional, default: 30)
 * - barangays: number[] (optional, default: [22, 24, 25, 33, 45] - top 5 barangays)
 * - clear_existing: boolean (optional, default: false)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateHealthCardPredictionPayload, HealthCardType } from '@/types/healthcard';

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

    // Parse request body
    const body = await request.json();
    const daysForecast = body.days_forecast || 30;
    const barangays = body.barangays || [22, 24, 25, 33, 45]; // Top 5 barangays from actual data
    const clearExisting = body.clear_existing || false;

    console.log('[Seed Predictions API] Parameters:', {
      daysForecast,
      barangays,
      clearExisting,
    });

    // Clear existing predictions if requested
    if (clearExisting) {
      const { error: deleteError } = await supabase
        .from('healthcard_predictions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        console.error('[Seed Predictions API] Delete error:', deleteError);
        return NextResponse.json(
          { success: false, error: 'Failed to clear existing predictions' },
          { status: 500 }
        );
      }
      console.log('[Seed Predictions API] Cleared existing predictions');
    }

    // Generate predictions
    const predictions: CreateHealthCardPredictionPayload[] = [];
    const today = new Date();
    const types: HealthCardType[] = ['food_handler', 'non_food'];

    for (const type of types) {
      // Base demand for each type (food handler typically higher)
      const baseDemand = type === 'food_handler' ? 5 : 3;

      for (const barangayId of barangays) {
        // Generate predictions for each day
        for (let day = 1; day <= daysForecast; day++) {
          const predictionDate = new Date(today);
          predictionDate.setDate(predictionDate.getDate() + day);

          // Add realistic variation patterns
          const weekday = predictionDate.getDay();
          const isWeekend = weekday === 0 || weekday === 6;
          const isMonday = weekday === 1; // Monday typically busy

          // Seasonal variation (simulate monthly cycles)
          const monthProgress = predictionDate.getDate() / 30;
          const seasonalFactor = 1 + 0.2 * Math.sin(monthProgress * Math.PI);

          // Weekly pattern
          let weeklyFactor = 1.0;
          if (isWeekend) weeklyFactor = 0.3; // Much lower on weekends
          if (isMonday) weeklyFactor = 1.4; // Higher on Mondays

          // Random noise (-20% to +20%)
          const noiseFactor = 1 + (Math.random() * 0.4 - 0.2);

          // Calculate predicted value
          const predictedCards = Math.max(
            0,
            Math.round(baseDemand * seasonalFactor * weeklyFactor * noiseFactor)
          );

          // Calculate confidence intervals (±20%)
          const upperBound = Math.round(predictedCards * 1.2);
          const lowerBound = Math.max(0, Math.round(predictedCards * 0.8));

          // Model accuracy metrics (simulated)
          const confidenceLevel = 0.80 + Math.random() * 0.15; // 0.80-0.95
          const rmse = 0.8 + Math.random() * 0.6; // 0.8-1.4
          const r_squared = 0.70 + Math.random() * 0.20; // 0.70-0.90

          predictions.push({
            healthcard_type: type,
            barangay_id: barangayId,
            prediction_date: predictionDate.toISOString().split('T')[0],
            predicted_cards: predictedCards,
            confidence_level: confidenceLevel,
            model_version: 'SARIMA(1,1,1)(1,1,1,7)',
            prediction_data: {
              upper_bound: upperBound,
              lower_bound: lowerBound,
              rmse,
              r_squared,
              mae: rmse * 0.8,
              mse: rmse * rmse,
              trend: predictedCards > baseDemand ? 'increasing' : 'decreasing',
              seasonality_detected: true,
              notes: 'Demo prediction generated for testing',
            },
          });
        }
      }

      // Also generate system-wide predictions (barangay_id = null)
      const systemBaseDemand = baseDemand * barangays.length;

      for (let day = 1; day <= daysForecast; day++) {
        const predictionDate = new Date(today);
        predictionDate.setDate(predictionDate.getDate() + day);

        const weekday = predictionDate.getDay();
        const isWeekend = weekday === 0 || weekday === 6;
        const isMonday = weekday === 1;

        const monthProgress = predictionDate.getDate() / 30;
        const seasonalFactor = 1 + 0.2 * Math.sin(monthProgress * Math.PI);

        let weeklyFactor = 1.0;
        if (isWeekend) weeklyFactor = 0.3;
        if (isMonday) weeklyFactor = 1.4;

        const noiseFactor = 1 + (Math.random() * 0.4 - 0.2);

        const predictedCards = Math.max(
          0,
          Math.round(systemBaseDemand * seasonalFactor * weeklyFactor * noiseFactor)
        );

        const upperBound = Math.round(predictedCards * 1.2);
        const lowerBound = Math.max(0, Math.round(predictedCards * 0.8));

        const confidenceLevel = 0.85 + Math.random() * 0.10;
        const rmse = 1.5 + Math.random() * 1.0;
        const r_squared = 0.75 + Math.random() * 0.15;

        predictions.push({
          healthcard_type: type,
          barangay_id: null,
          prediction_date: predictionDate.toISOString().split('T')[0],
          predicted_cards: predictedCards,
          confidence_level: confidenceLevel,
          model_version: 'SARIMA(1,1,1)(1,1,1,7)',
          prediction_data: {
            upper_bound: upperBound,
            lower_bound: lowerBound,
            rmse,
            r_squared,
            mae: rmse * 0.8,
            mse: rmse * rmse,
            trend: predictedCards > systemBaseDemand ? 'increasing' : 'stable',
            seasonality_detected: true,
            notes: 'System-wide demo prediction generated for testing',
          },
        });
      }
    }

    console.log('[Seed Predictions API] Generated predictions:', predictions.length);

    // Insert predictions in batches (Supabase limit: 1000 per insert)
    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < predictions.length; i += batchSize) {
      const batch = predictions.slice(i, i + batchSize);

      const { data, error: insertError } = await supabase
        .from('healthcard_predictions')
        .insert(batch)
        .select();

      if (insertError) {
        console.error('[Seed Predictions API] Insert error:', insertError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to insert predictions',
            details: insertError.message,
            inserted_before_error: insertedCount,
          },
          { status: 500 }
        );
      }

      insertedCount += data?.length || 0;
      console.log('[Seed Predictions API] Inserted batch:', data?.length || 0);
    }

    console.log('[Seed Predictions API] Total inserted:', insertedCount);

    return NextResponse.json({
      success: true,
      message: 'Successfully seeded health card predictions',
      total_predictions: insertedCount,
      breakdown: {
        food_handler: predictions.filter((p) => p.healthcard_type === 'food_handler').length,
        non_food: predictions.filter((p) => p.healthcard_type === 'non_food').length,
      },
      barangays: barangays,
      days_forecast: daysForecast,
    });
  } catch (error) {
    console.error('[Seed Predictions API] Unexpected error:', error);
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
