#!/usr/bin/env tsx
/**
 * Test script for simplified seasonal SARIMA parameters
 *
 * Purpose: Verify SARIMA(1,0,1)(1,0,0)[12] prevents prediction explosions
 *
 * Usage: npx tsx scripts/test-seasonal-sarima.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  generateDiseaseSARIMAPredictions,
  formatDiseaseHistoricalData,
} from '../src/lib/sarima/localSARIMA';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DISEASE_TYPES = [
  'dengue',
  'hiv_aids',
  'malaria',
  'measles',
  'rabies',
  'pregnancy_complications',
  'other',
];

async function testDisease(diseaseType: string): Promise<void> {
  console.log(`\n========================================`);
  console.log(`🧪 TESTING: ${diseaseType.toUpperCase()}`);
  console.log(`========================================\n`);

  // Fetch historical data
  const { data: historicalRecords, error } = await supabase
    .from('disease_statistics')
    .select('record_date, case_count')
    .eq('disease_type', diseaseType)
    .order('record_date', { ascending: true });

  if (error) {
    console.error(`❌ Database error:`, error);
    return;
  }

  if (!historicalRecords || historicalRecords.length < 7) {
    console.log(`⚠️  Insufficient data: ${historicalRecords?.length || 0} points`);
    return;
  }

  console.log(`✓ Found ${historicalRecords.length} historical records`);

  // Format data for SARIMA
  const formattedData = formatDiseaseHistoricalData(historicalRecords);

  // Generate predictions
  try {
    const forecast = await generateDiseaseSARIMAPredictions(
      formattedData,
      diseaseType,
      'System-Wide',
      30
    );

    // Check for prediction explosions
    const historicalMax = Math.max(...formattedData.map(d => d.value));
    const predictionMax = Math.max(...forecast.predictions.map(p => p.predicted_cases));
    const explosionRatio = predictionMax / historicalMax;

    console.log(`\n📊 RESULTS:`);
    console.log(`   Historical max: ${historicalMax.toFixed(1)}`);
    console.log(`   Prediction max: ${predictionMax.toFixed(1)}`);
    console.log(`   Explosion ratio: ${explosionRatio.toFixed(2)}x`);
    console.log(`   R² Score: ${forecast.accuracy_metrics.r_squared.toFixed(4)}`);
    console.log(`   RMSE: ${forecast.accuracy_metrics.rmse.toFixed(2)}`);
    console.log(`   Data Quality: ${forecast.data_quality}`);
    console.log(`   Trend: ${forecast.trend}`);

    // Verdict
    if (explosionRatio > 10) {
      console.log(`\n❌ EXPLOSION DETECTED! (${explosionRatio.toFixed(1)}x > 10x threshold)`);
    } else if (forecast.accuracy_metrics.r_squared < 0) {
      console.log(`\n⚠️  NEGATIVE R² (${forecast.accuracy_metrics.r_squared.toFixed(4)}) - worse than mean baseline`);
    } else if (forecast.accuracy_metrics.r_squared < 0.40) {
      console.log(`\n⚠️  LOW R² (${forecast.accuracy_metrics.r_squared.toFixed(4)}) - below acceptable threshold`);
    } else if (forecast.accuracy_metrics.r_squared < 0.60) {
      console.log(`\n✓ ACCEPTABLE R² (${forecast.accuracy_metrics.r_squared.toFixed(4)}) - fair predictive power`);
    } else {
      console.log(`\n✅ EXCELLENT R² (${forecast.accuracy_metrics.r_squared.toFixed(4)}) - strong predictive power`);
    }
  } catch (error) {
    console.error(`\n❌ ERROR generating predictions:`, error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🔬 Seasonal SARIMA Test (Simplified Parameters)');
  console.log('=================================================');
  console.log('Testing: SARIMA(1,0,1)(1,0,0)[12] (Q=0 to prevent explosions)');
  console.log('Expected: R² > 0.40, no prediction explosions (>10x)\n');

  const results: Array<{ disease: string; rSquared: number; explosion: boolean }> = [];

  for (const disease of DISEASE_TYPES) {
    await testDisease(disease);
  }

  console.log('\n========================================');
  console.log('✓ Test complete');
  console.log('========================================\n');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
