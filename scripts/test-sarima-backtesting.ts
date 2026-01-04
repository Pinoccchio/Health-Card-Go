/**
 * Standalone SARIMA Back-Testing Test Script
 *
 * Tests SARIMA predictions with different parameters to identify
 * which configurations cause R² = 0 and prediction explosions
 *
 * Usage: npx tsx scripts/test-sarima-backtesting.ts
 */

import ARIMA from 'arima';
import { calculateRSquared, calculateRMSE, calculateMAE } from '../src/lib/utils/sarimaMetrics';

// ============================================================================
// TEST DATA
// ============================================================================

// Pregnancy complications data (mimics real data from ERRORS.md)
// 36 data points with trend (line 224: "Data points: 36")
const pregnancyData = [
  2, 3, 1, 4, 2, 5, 3, 6, 4, 7, 5, 8,  // Year 1 (months 1-12) - increasing trend
  6, 7, 5, 8, 6, 9, 7, 10, 8, 11, 9, 12, // Year 2 (months 13-24) - continuing trend
  10, 11, 9, 12, 10, 13, 11, 14, 12, 15, 13, 16 // Year 3 (months 25-36) - continuing trend
];

// Dengue data (mimics real data from ERRORS.md)
// 47 data points (line 134: "Data points: 47")
const dengueData = [
  // Seasonal pattern with weekly cycles
  5, 7, 6, 8, 10, 12, 15,  // Week 1-7
  18, 20, 22, 19, 17, 15, 14,  // Week 8-14
  12, 10, 8, 6, 5, 7, 9,  // Week 15-21
  11, 13, 15, 18, 20, 22, 24,  // Week 22-28
  26, 28, 30, 28, 26, 24, 22,  // Week 29-35
  20, 18, 16, 14, 12, 10, 8,  // Week 36-42
  6, 5, 4, 3, 2  // Week 43-47
];

// ============================================================================
// SARIMA PARAMETER CONFIGURATIONS
// ============================================================================

const paramConfigs = [
  {
    label: 'CURRENT PARAMS (d=0, D=0, s=12)',
    params: { p: 1, d: 0, q: 1, P: 1, D: 0, Q: 1, s: 12 },
    description: 'Current implementation - NO differencing, monthly seasonality'
  },
  {
    label: 'STABLE PARAMS (d=1, D=0, s=1)',
    params: { p: 1, d: 1, q: 1, P: 0, D: 0, Q: 0, s: 1 },
    description: 'With differencing - handles trends better'
  },
  {
    label: 'OLD PARAMS (d=1, D=1, s=7)',
    params: { p: 1, d: 1, q: 1, P: 1, D: 1, Q: 1, s: 7 },
    description: 'Previous implementation - overdifferencing'
  },
  {
    label: 'SIMPLE AR (d=0, D=0, s=1)',
    params: { p: 1, d: 0, q: 0, P: 0, D: 0, Q: 0, s: 1 },
    description: 'Simplest model - AR(1)'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateStdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function detectExplosion(predictions: number[], historicalData: number[]): boolean {
  const historicalMax = Math.max(...historicalData);
  const maxPrediction = Math.max(...predictions);
  return maxPrediction > historicalMax * 10;
}

function detectConstant(predictions: number[]): boolean {
  const stdDev = calculateStdDev(predictions);
  return stdDev < 1;
}

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

function testBackTesting(
  data: number[],
  params: any,
  label: string,
  description: string
) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${label}`);
  console.log(`${description}`);
  console.log(`${'='.repeat(80)}`);

  // Split data (80/20 for back-testing)
  const trainSize = Math.floor(data.length * 0.8);
  const testSize = data.length - trainSize;

  const trainData = data.slice(0, trainSize);
  const testData = data.slice(trainSize);

  console.log(`\nData Split:`);
  console.log(`  Total: ${data.length} points`);
  console.log(`  Train: ${trainSize} points`);
  console.log(`  Test: ${testSize} points`);

  try {
    console.log(`\nTraining ARIMA with params:`, params);

    const arima = new ARIMA(params);
    arima.train(trainData);

    console.log(`✓ Training successful`);

    // Predict on test set
    const [rawPredictions, errors] = arima.predict(testSize);

    console.log(`\nRaw Predictions:`);
    console.log(`  Values:`, rawPredictions.map(p => p.toFixed(2)));
    console.log(`  Min: ${Math.min(...rawPredictions).toFixed(2)}`);
    console.log(`  Max: ${Math.max(...rawPredictions).toFixed(2)}`);
    console.log(`  Mean: ${(rawPredictions.reduce((a, b) => a + b) / rawPredictions.length).toFixed(2)}`);
    console.log(`  Std Dev: ${calculateStdDev(rawPredictions).toFixed(2)}`);

    // Check for issues
    const hasExplosion = detectExplosion(rawPredictions, trainData);
    const isConstant = detectConstant(rawPredictions);

    if (hasExplosion) {
      console.log(`\n⚠️  EXPLOSION DETECTED!`);
      console.log(`   Max prediction: ${Math.max(...rawPredictions).toFixed(0)}`);
      console.log(`   Historical max: ${Math.max(...trainData).toFixed(0)}`);
      console.log(`   Ratio: ${(Math.max(...rawPredictions) / Math.max(...trainData)).toFixed(1)}x`);
    }

    if (isConstant) {
      console.log(`\n⚠️  NEAR-CONSTANT PREDICTIONS!`);
      console.log(`   Std Dev: ${calculateStdDev(rawPredictions).toFixed(4)} (should be > 1)`);
      console.log(`   This causes R² = 0 mathematically`);
    }

    // Round predictions (like production code does)
    const roundedPredictions = rawPredictions.map(p => Math.max(0, Math.round(p)));

    console.log(`\nRounded Predictions vs Actual:`);
    for (let i = 0; i < testSize; i++) {
      console.log(`  [${i + 1}] Actual: ${testData[i]}, Predicted: ${roundedPredictions[i]}, Error: ${Math.abs(testData[i] - roundedPredictions[i])}`);
    }

    // Calculate metrics
    const r2 = calculateRSquared(testData, roundedPredictions);
    const rmse = calculateRMSE(testData, roundedPredictions);
    const mae = calculateMAE(testData, roundedPredictions);

    console.log(`\n📊 METRICS:`);
    console.log(`  R²:   ${r2.toFixed(3)} ${r2 === 0 ? '❌ (ZERO!)' : r2 > 0.7 ? '✅' : '⚠️'}`);
    console.log(`  RMSE: ${rmse.toFixed(2)}`);
    console.log(`  MAE:  ${mae.toFixed(2)}`);

    // Diagnosis
    console.log(`\n🔍 DIAGNOSIS:`);
    if (r2 === 0 && !hasExplosion) {
      console.log(`  R² = 0 likely due to CONSTANT PREDICTIONS`);
      console.log(`  Predictions have low variance → R² calculation fails`);
    } else if (r2 === 0 && hasExplosion) {
      console.log(`  R² = 0 due to PREDICTION EXPLOSION`);
      console.log(`  Predictions are so far off that R² is clamped to 0`);
    } else if (r2 > 0.7) {
      console.log(`  ✅ GOOD MODEL - R² > 0.7 indicates strong predictive power`);
    } else {
      console.log(`  ⚠️  MODERATE MODEL - R² between 0 and 0.7`);
    }

  } catch (error) {
    console.error(`\n❌ TRAINING FAILED:`, error);
    console.log(`   This usually means parameters are incompatible with data`);
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    SARIMA BACK-TESTING TEST SUITE                          ║
║                                                                            ║
║  Purpose: Identify which SARIMA parameters cause R² = 0                   ║
║  Bug: Back-testing doesn't apply validation/clamping                      ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

// Test 1: Pregnancy Complications (the problematic one)
console.log(`\n\n### TEST 1: PREGNANCY COMPLICATIONS DATA (36 points) ###`);
paramConfigs.forEach(config => {
  testBackTesting(pregnancyData, config.params, config.label, config.description);
});

// Test 2: Dengue Data
console.log(`\n\n### TEST 2: DENGUE DATA (47 points) ###`);
paramConfigs.forEach(config => {
  testBackTesting(dengueData, config.params, config.label, config.description);
});

// Summary
console.log(`\n\n${'='.repeat(80)}`);
console.log(`SUMMARY & RECOMMENDATIONS`);
console.log(`${'='.repeat(80)}`);
console.log(`
✅ EXPECTED FINDINGS:
  1. d=0, D=0 params (current) likely produce CONSTANT predictions → R² = 0
  2. d=1 params (with differencing) should give R² > 0.5
  3. Back-testing needs validation/clamping like forward predictions

❌ CURRENT BUGS:
  1. Back-testing doesn't apply validatePredictions()
  2. Back-testing doesn't clamp to historicalMax * 5
  3. Constant predictions aren't detected before R² calculation

🔧 RECOMMENDED FIXES:
  1. Add validation to calculateBackTestMetrics() (lines 541-556)
  2. Apply clamping: Math.min(prediction, historicalMax * 5)
  3. Add variance check in calculateRSquared() to warn about constants
  4. Consider using d=1 for diseases with trends (pregnancy)
`);
