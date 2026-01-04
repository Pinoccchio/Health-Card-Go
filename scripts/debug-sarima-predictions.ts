#!/usr/bin/env tsx
/**
 * Debug script for SARIMA disease predictions
 *
 * Purpose: Analyze disease data, gap statistics, and parameter selection
 * to diagnose why R² = 0.00 and verify monthly aggregation is triggered
 *
 * Usage:
 *   npx tsx scripts/debug-sarima-predictions.ts [disease_type]
 *
 * Example:
 *   npx tsx scripts/debug-sarima-predictions.ts dengue
 *   npx tsx scripts/debug-sarima-predictions.ts all
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Valid disease types
const DISEASE_TYPES = [
  'dengue',
  'hiv_aids',
  'malaria',
  'measles',
  'rabies',
  'pregnancy_complications',
  'other',
];

/**
 * Calculate gap statistics between dates
 */
function analyzeGaps(dates: Date[]): {
  count: number;
  minGap: number;
  maxGap: number;
  avgGap: number;
  gapVariance: number;
  gaps: number[];
} {
  if (dates.length < 2) {
    return { count: dates.length, minGap: 0, maxGap: 0, avgGap: 0, gapVariance: 0, gaps: [] };
  }

  const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];

  for (let i = 1; i < sortedDates.length; i++) {
    const gapDays = Math.round(
      (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
    );
    gaps.push(gapDays);
  }

  const minGap = Math.min(...gaps);
  const maxGap = Math.max(...gaps);
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  // Calculate variance
  const variance =
    gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;

  return {
    count: dates.length,
    minGap,
    maxGap,
    avgGap: Math.round(avgGap * 10) / 10,
    gapVariance: Math.round(variance * 10) / 10,
    gaps,
  };
}

/**
 * Check if monthly aggregation would be triggered
 */
function checkMonthlyAggregationThresholds(gapStats: ReturnType<typeof analyzeGaps>): {
  hasIrregularGaps: boolean;
  shouldUseMonthlyAggregation: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Current threshold from localSARIMA.ts line 378-382
  const avgGapThreshold = 20; // days
  const maxGapThreshold = 45; // days

  // Check irregularity (from hasIrregularGaps function)
  const avgGap = gapStats.avgGap;
  const maxGap = gapStats.maxGap;
  const irregularityRatio = maxGap / avgGap;
  const hasIrregularGaps = irregularityRatio > 1.5;

  if (hasIrregularGaps) {
    reasons.push(`✓ Irregular gaps detected (max/avg ratio: ${irregularityRatio.toFixed(2)} > 1.5)`);
  } else {
    reasons.push(`✗ Gaps too regular (max/avg ratio: ${irregularityRatio.toFixed(2)} <= 1.5)`);
  }

  // Check monthly aggregation thresholds (from shouldUseMonthlyAggregation function)
  const meetsAvgThreshold = avgGap > avgGapThreshold;
  const meetsMaxThreshold = maxGap > maxGapThreshold;
  const shouldAggregate = meetsAvgThreshold || meetsMaxThreshold;

  if (meetsAvgThreshold) {
    reasons.push(`✓ Average gap > ${avgGapThreshold} days (${avgGap.toFixed(1)} > ${avgGapThreshold})`);
  } else {
    reasons.push(`✗ Average gap <= ${avgGapThreshold} days (${avgGap.toFixed(1)} <= ${avgGapThreshold})`);
  }

  if (meetsMaxThreshold) {
    reasons.push(`✓ Max gap > ${maxGapThreshold} days (${maxGap} > ${maxGapThreshold})`);
  } else {
    reasons.push(`✗ Max gap <= ${maxGapThreshold} days (${maxGap} <= ${maxGapThreshold})`);
  }

  return {
    hasIrregularGaps,
    shouldUseMonthlyAggregation: shouldAggregate && hasIrregularGaps,
    reasons,
  };
}

/**
 * Predict which SARIMA parameters would be selected
 */
function predictParameters(
  dataLength: number,
  aggregationTriggered: boolean
): { p: number; d: number; q: number; P: number; D: number; Q: number; s: number; path: string } {
  if (aggregationTriggered) {
    // Monthly aggregation path (uses d=0)
    if (dataLength >= 24) {
      return { p: 1, d: 0, q: 1, P: 0, D: 0, Q: 0, s: 1, path: 'Monthly aggregation (d=0)' };
    } else if (dataLength >= 14) {
      return { p: 1, d: 0, q: 1, P: 0, D: 0, Q: 0, s: 1, path: 'Monthly aggregation (d=0)' };
    } else {
      return { p: 1, d: 0, q: 0, P: 0, D: 0, Q: 0, s: 1, path: 'Monthly aggregation (d=0)' };
    }
  } else {
    // Non-aggregated path (uses d=1) - THIS IS THE PROBLEM!
    if (dataLength >= 24) {
      return { p: 1, d: 1, q: 1, P: 0, D: 0, Q: 0, s: 1, path: 'Non-aggregated (d=1) ⚠️ CAUSES R²=0' };
    } else if (dataLength >= 14) {
      return { p: 1, d: 1, q: 1, P: 0, D: 0, Q: 0, s: 1, path: 'Non-aggregated (d=1) ⚠️ CAUSES R²=0' };
    } else {
      return { p: 1, d: 1, q: 0, P: 0, D: 0, Q: 0, s: 1, path: 'Non-aggregated (d=1) ⚠️ CAUSES R²=0' };
    }
  }
}

/**
 * Analyze a single disease type
 */
async function analyzeDisease(diseaseType: string): Promise<void> {
  console.log('\n========================================');
  console.log(`📊 ANALYZING: ${diseaseType.toUpperCase()}`);
  console.log('========================================\n');

  // Fetch disease data from database
  console.log('🔍 Fetching data from disease_statistics...');
  const { data: records, error } = await supabase
    .from('disease_statistics')
    .select('record_date, case_count, source')
    .eq('disease_type', diseaseType)
    .order('record_date', { ascending: true });

  if (error) {
    console.error('❌ Error fetching data:', error.message);
    return;
  }

  if (!records || records.length === 0) {
    console.log('⚠️  No data found for this disease type');
    return;
  }

  console.log(`✓ Found ${records.length} records\n`);

  // Show data sources breakdown
  const sourceCounts: Record<string, number> = {};
  records.forEach((r) => {
    sourceCounts[r.source] = (sourceCounts[r.source] || 0) + 1;
  });

  console.log('📦 Data Sources:');
  Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`   ${source}: ${count} records`);
    });
  console.log();

  // Convert dates and analyze gaps
  const dates = records.map((r) => new Date(r.record_date));
  const gapStats = analyzeGaps(dates);

  console.log('📏 Gap Statistics:');
  console.log(`   Data points: ${gapStats.count}`);
  console.log(`   Date range: ${dates[0].toISOString().split('T')[0]} to ${dates[dates.length - 1].toISOString().split('T')[0]}`);
  console.log(`   Min gap: ${gapStats.minGap} days`);
  console.log(`   Max gap: ${gapStats.maxGap} days`);
  console.log(`   Average gap: ${gapStats.avgGap} days`);
  console.log(`   Gap variance: ${gapStats.gapVariance.toFixed(1)}`);
  console.log();

  // Show gap distribution
  const gapBuckets: Record<string, number> = {
    '1-7 days': 0,
    '8-14 days': 0,
    '15-30 days': 0,
    '31-60 days': 0,
    '61+ days': 0,
  };

  gapStats.gaps.forEach((gap) => {
    if (gap <= 7) gapBuckets['1-7 days']++;
    else if (gap <= 14) gapBuckets['8-14 days']++;
    else if (gap <= 30) gapBuckets['15-30 days']++;
    else if (gap <= 60) gapBuckets['31-60 days']++;
    else gapBuckets['61+ days']++;
  });

  console.log('📊 Gap Distribution:');
  Object.entries(gapBuckets).forEach(([range, count]) => {
    const percentage = ((count / gapStats.gaps.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round((count / gapStats.gaps.length) * 20));
    console.log(`   ${range.padEnd(15)} ${count.toString().padStart(3)} (${percentage.padStart(5)}%) ${bar}`);
  });
  console.log();

  // Check monthly aggregation thresholds
  const thresholds = checkMonthlyAggregationThresholds(gapStats);

  console.log('🎯 Monthly Aggregation Decision:');
  thresholds.reasons.forEach((reason) => console.log(`   ${reason}`));
  console.log();

  if (thresholds.shouldUseMonthlyAggregation) {
    console.log('✅ RESULT: Monthly aggregation WOULD be triggered');
  } else {
    console.log('❌ RESULT: Monthly aggregation WOULD NOT be triggered');
    console.log('   ⚠️  This causes the code to use d=1 (non-aggregated path)');
    console.log('   ⚠️  d=1 on irregular data → constant predictions → R²=0.00');
  }
  console.log();

  // Predict SARIMA parameters
  const params = predictParameters(gapStats.count, thresholds.shouldUseMonthlyAggregation);

  console.log('⚙️  Predicted SARIMA Parameters:');
  console.log(`   Path: ${params.path}`);
  console.log(`   Parameters: { p: ${params.p}, d: ${params.d}, q: ${params.q}, P: ${params.P}, D: ${params.D}, Q: ${params.Q}, s: ${params.s} }`);

  if (params.d === 1) {
    console.log('   🚨 WARNING: d=1 will cause over-differencing and R²=0.00!');
  } else {
    console.log('   ✓ Using d=0 (no over-differencing)');
  }
  console.log();

  // Show recommendation
  console.log('💡 Recommendation:');
  if (!thresholds.shouldUseMonthlyAggregation) {
    console.log('   1. FORCE monthly aggregation for disease data (disease surveillance is always irregular)');
    console.log('   2. OR lower thresholds: avgGap > 7 days, maxGap > 21 days');
    console.log('   3. OR add more seed data to increase gaps above 45 days');
  } else {
    console.log('   ✓ Current thresholds would trigger monthly aggregation correctly');
    console.log('   ✓ Should achieve R² > 0.60 with d=0 parameters');
  }
  console.log();
}

/**
 * Main execution
 */
async function main() {
  const diseaseArg = process.argv[2] || 'all';

  console.log('🔬 SARIMA Disease Prediction Debugger');
  console.log('=====================================');
  console.log(`Target: ${diseaseArg}`);

  if (diseaseArg === 'all') {
    for (const disease of DISEASE_TYPES) {
      await analyzeDisease(disease);
    }
  } else if (DISEASE_TYPES.includes(diseaseArg)) {
    await analyzeDisease(diseaseArg);
  } else {
    console.error(`\n❌ Invalid disease type: ${diseaseArg}`);
    console.error(`Valid types: ${DISEASE_TYPES.join(', ')}, all`);
    process.exit(1);
  }

  console.log('========================================');
  console.log('✓ Analysis complete');
  console.log('========================================\n');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
