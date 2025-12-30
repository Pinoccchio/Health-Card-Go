/**
 * Direct Gemini AI SARIMA Test (No Auth Required)
 *
 * This script tests the Gemini AI service directly without authentication.
 *
 * Usage:
 * npx tsx scripts/test-gemini-direct.ts              # Food Handler (default)
 * npx tsx scripts/test-gemini-direct.ts food_handler # Food Handler (explicit)
 * npx tsx scripts/test-gemini-direct.ts non_food     # Non-Food Handler
 */

// CRITICAL: Load .env.local FIRST, before any other imports
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// Now import other modules (they will see the environment variables)
import { createClient } from '@supabase/supabase-js';
import { generateSARIMAPredictions, formatHistoricalData } from '../src/lib/ai/geminiSARIMA';
import type { HealthCardType } from '../src/types/healthcard';

async function testGeminiDirect() {
  // Parse command-line argument for health card type
  const args = process.argv.slice(2);
  const typeArg = args[0]?.toLowerCase();

  const healthcardType: HealthCardType = typeArg === 'non_food' ? 'non_food' : 'food_handler';
  const serviceIds = healthcardType === 'food_handler' ? [12, 13] : [14, 15];

  console.log(`🧪 Testing ${healthcardType === 'food_handler' ? 'Food Handler' : 'Non-Food Handler'} Gemini AI SARIMA (Direct Service Test)\n`);

  // Verify environment variables
  console.log('🔑 Checking environment variables...');
  console.log(`   - GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '✅ Set (length: ' + process.env.GEMINI_API_KEY.length + ')' : '❌ Missing'}`);
  console.log(`   - NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}\n`);

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in environment');
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment. Check .env.local file.');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`1️⃣ Fetching historical ${healthcardType} health card data...`);

    // Fetch completed health card appointments
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, completed_at, service_id')
      .eq('status', 'completed')
      .in('service_id', serviceIds)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch appointments: ${error.message}`);
    }

    if (!appointments || appointments.length < 7) {
      throw new Error(`Insufficient data: ${appointments?.length || 0} appointments found, need at least 7`);
    }

    console.log(`✅ Found ${appointments.length} completed appointments\n`);

    // Format historical data
    const historicalData = formatHistoricalData(appointments);
    console.log('2️⃣ Formatted data into time series');
    console.log(`   - Data points: ${historicalData.length}`);
    console.log(`   - Date range: ${historicalData[0].date} to ${historicalData[historicalData.length - 1].date}\n`);

    // Generate predictions with Gemini AI
    console.log('3️⃣ Calling Gemini AI (gemini-2.5-flash-lite)...');
    const daysForecast = 30;

    const forecast = await generateSARIMAPredictions(
      historicalData,
      healthcardType,
      daysForecast
    );

    console.log('✅ Gemini AI responded successfully!\n');

    // Display results
    console.log('📊 SARIMA Forecast Results:');
    console.log(`   - Model Version: ${forecast.model_version}`);
    console.log(`   - Predictions Generated: ${forecast.predictions.length}`);
    console.log(`   - Trend: ${forecast.trend}`);
    console.log(`   - Seasonality Detected: ${forecast.seasonality_detected ? 'Yes' : 'No'}\n`);

    console.log('📈 Model Accuracy Metrics:');
    console.log(`   - R² Score: ${forecast.accuracy_metrics.r_squared.toFixed(3)}`);
    console.log(`   - RMSE: ${forecast.accuracy_metrics.rmse.toFixed(2)}`);
    console.log(`   - MAE: ${forecast.accuracy_metrics.mae.toFixed(2)}`);
    console.log(`   - MSE: ${forecast.accuracy_metrics.mse.toFixed(2)}\n`);

    // Show sample predictions
    console.log('📅 Sample Predictions (first 7 days):');
    forecast.predictions.slice(0, 7).forEach((pred, index) => {
      const margin = Math.round((pred.upper_bound - pred.lower_bound) / 2);
      const confidence = Math.round(pred.confidence_level * 100);
      console.log(
        `   ${index + 1}. ${pred.date}: ${pred.predicted_cards} cards (±${margin}, confidence: ${confidence}%)`
      );
    });

    console.log('\n🎉 Gemini AI integration test PASSED!');
    console.log('\n💾 To save these predictions to database:');
    console.log('   - Use the API endpoint: POST /api/healthcards/generate-predictions');
    console.log('   - Or run: npx tsx scripts/save-predictions.ts');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testGeminiDirect();
