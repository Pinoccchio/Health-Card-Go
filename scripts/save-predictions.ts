/**
 * Save Gemini AI Predictions to Database
 *
 * This script generates predictions and saves them directly to the database.
 *
 * Usage:
 * npx tsx scripts/save-predictions.ts              # Food Handler (default)
 * npx tsx scripts/save-predictions.ts food_handler # Food Handler (explicit)
 * npx tsx scripts/save-predictions.ts non_food     # Non-Food Handler
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';
import { generateSARIMAPredictions, formatHistoricalData, validatePredictions } from '../src/lib/ai/geminiSARIMA';
import type { HealthCardType } from '../src/types/healthcard';

async function savePredictions() {
  // Parse command-line argument for health card type
  const args = process.argv.slice(2);
  const typeArg = args[0]?.toLowerCase();

  const healthcardType: HealthCardType = typeArg === 'non_food' ? 'non_food' : 'food_handler';
  const serviceIds = healthcardType === 'food_handler' ? [12, 13] : [14, 15];

  console.log(`💾 Saving ${healthcardType === 'food_handler' ? 'Food Handler' : 'Non-Food Handler'} Gemini AI Predictions to Database\n`);

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch historical data
    console.log(`1️⃣  Fetching historical ${healthcardType} health card data...`);
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, completed_at, service_id')
      .eq('status', 'completed')
      .in('service_id', serviceIds)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true });

    if (error || !appointments || appointments.length < 7) {
      throw new Error(`Insufficient data: ${appointments?.length || 0} appointments`);
    }

    console.log(`✅ Found ${appointments.length} completed appointments\n`);

    // Format data
    const historicalData = formatHistoricalData(appointments);

    // Generate predictions
    console.log('2️⃣  Generating predictions with Gemini AI...');
    const forecast = await generateSARIMAPredictions(historicalData, healthcardType, 30);
    const validatedPredictions = validatePredictions(forecast.predictions);

    console.log(`✅ Generated ${validatedPredictions.length} predictions\n`);

    // Delete old predictions
    console.log('3️⃣  Deleting old predictions...');
    const firstDate = validatedPredictions[0]?.date;
    const lastDate = validatedPredictions[validatedPredictions.length - 1]?.date;

    if (firstDate && lastDate) {
      const { error: deleteError } = await supabase
        .from('healthcard_predictions')
        .delete()
        .eq('healthcard_type', healthcardType)
        .is('barangay_id', null)
        .gte('prediction_date', firstDate)
        .lte('prediction_date', lastDate);

      if (deleteError) {
        console.warn('⚠️  Failed to delete old predictions:', deleteError.message);
      } else {
        console.log('✅ Deleted old predictions\n');
      }
    }

    // Insert new predictions
    console.log('4️⃣  Inserting new predictions...');
    const predictionsToInsert = validatedPredictions.map((pred) => ({
      healthcard_type: healthcardType,
      barangay_id: null, // System-wide
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

    const { data: inserted, error: insertError } = await supabase
      .from('healthcard_predictions')
      .insert(predictionsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert: ${insertError.message}`);
    }

    console.log(`✅ Saved ${inserted?.length || 0} predictions to database\n`);

    console.log('🎉 SUCCESS! Predictions saved to database');
    console.log(`\n💡 Next step: Login as Healthcare Admin (service ${serviceIds.join(' or ')}) and view predictions in Reports → HealthCard Forecasts`);

  } catch (error) {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  }
}

savePredictions();
