/**
 * Seed HealthCard SARIMA Predictions
 *
 * Run this script to seed demo predictions into the healthcard_predictions table.
 * Generates realistic predictions for testing the SARIMA chart components.
 *
 * Usage:
 * npx ts-node scripts/seed-healthcard-predictions.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedPredictions() {
  console.log('🌱 Seeding HealthCard SARIMA Predictions...\n');

  const daysForecast = 30;
  const barangays = [22, 24, 25, 33, 45]; // Top 5 barangays from actual data
  const types: ('food_handler' | 'non_food')[] = ['food_handler', 'non_food'];

  const predictions: any[] = [];
  const today = new Date();

  for (const type of types) {
    const baseDemand = type === 'food_handler' ? 5 : 3;

    console.log(`📊 Generating predictions for ${type}...`);

    for (const barangayId of barangays) {
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
          Math.round(baseDemand * seasonalFactor * weeklyFactor * noiseFactor)
        );

        const upperBound = Math.round(predictedCards * 1.2);
        const lowerBound = Math.max(0, Math.round(predictedCards * 0.8));

        const confidenceLevel = 0.80 + Math.random() * 0.15;
        const rmse = 0.8 + Math.random() * 0.6;
        const r_squared = 0.70 + Math.random() * 0.20;

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

    // System-wide predictions (barangay_id = null)
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

  console.log(`\n📦 Total predictions generated: ${predictions.length}`);
  console.log(`   - Food Handler: ${predictions.filter((p) => p.healthcard_type === 'food_handler').length}`);
  console.log(`   - Non-Food: ${predictions.filter((p) => p.healthcard_type === 'non_food').length}`);

  // Insert in batches
  const batchSize = 500;
  let insertedCount = 0;

  for (let i = 0; i < predictions.length; i += batchSize) {
    const batch = predictions.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('healthcard_predictions')
      .insert(batch)
      .select();

    if (error) {
      console.error(`\n❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      process.exit(1);
    }

    insertedCount += data?.length || 0;
    console.log(`   ✅ Batch ${Math.floor(i / batchSize) + 1}: Inserted ${data?.length || 0} predictions`);
  }

  console.log(`\n✅ Successfully seeded ${insertedCount} predictions!`);
  console.log(`\n🎉 Done! You can now view the SARIMA charts in the reports pages.`);
}

seedPredictions().catch((error) => {
  console.error('\n❌ Seeding failed:', error);
  process.exit(1);
});
