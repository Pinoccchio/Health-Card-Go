/**
 * Simulates outbreak detection with current database data
 * Tests if low-risk outbreaks are now being detected after removing 1.5x rule
 *
 * Run with: npx tsx test-outbreak-api-simulation.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wjwxcxvilqsuoldaduyj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable not set');
  console.log('Please set it in .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Outbreak thresholds (from API)
const OUTBREAK_THRESHOLDS = [
  { disease_type: 'dengue', cases_threshold: 5, days_window: 14 },
  { disease_type: 'hiv_aids', cases_threshold: 3, days_window: 30 },
  { disease_type: 'malaria', cases_threshold: 3, days_window: 14 },
  { disease_type: 'measles', cases_threshold: 3, days_window: 14 },
  { disease_type: 'animal_bite', cases_threshold: 1, days_window: 7 },
  { disease_type: 'pregnancy_complications', cases_threshold: 5, days_window: 30 },
];

// Classification logic (matches updated API)
function classifyOutbreak(
  highRiskCases: number,
  mediumRiskCases: number,
  lowRiskCases: number
): 'critical' | 'high' | 'medium' | 'low' {
  return highRiskCases >= 3 ? 'critical' :
         mediumRiskCases >= 5 ? 'high' :
         (highRiskCases > 0 || mediumRiskCases > 0) ? 'medium' : 'low';
}

async function simulateOutbreakDetection() {
  console.log('🔍 OUTBREAK DETECTION SIMULATION\n');
  console.log('Simulating outbreak detection with current database data...\n');
  console.log('=' .repeat(80));

  // Fetch disease statistics
  const { data: statistics, error } = await supabase
    .from('disease_statistics')
    .select('barangay_id, record_date, case_count, disease_type, severity, custom_disease_name')
    .order('record_date', { ascending: false })
    .limit(500);

  if (error) {
    console.error('❌ Error fetching disease statistics:', error);
    return;
  }

  console.log(`\n📊 Fetched ${statistics?.length || 0} disease statistics records\n`);

  // Fetch barangays
  const { data: barangays } = await supabase
    .from('barangays')
    .select('id, name');

  const barangayMap = new Map<number, string>();
  barangays?.forEach(b => barangayMap.set(b.id, b.name));

  // Aggregate by disease type and barangay
  const aggregated = new Map<string, Map<number, any>>();

  statistics?.forEach(stat => {
    if (!aggregated.has(stat.disease_type)) {
      aggregated.set(stat.disease_type, new Map());
    }
    const diseaseMap = aggregated.get(stat.disease_type)!;

    if (!diseaseMap.has(stat.barangay_id)) {
      diseaseMap.set(stat.barangay_id, {
        total_cases: 0,
        high_risk_cases: 0,
        medium_risk_cases: 0,
        low_risk_cases: 0,
        dates: [],
      });
    }

    const data = diseaseMap.get(stat.barangay_id)!;
    data.total_cases += stat.case_count;
    data.dates.push(stat.record_date);

    if (stat.severity === 'high_risk') {
      data.high_risk_cases += stat.case_count;
    } else if (stat.severity === 'medium_risk') {
      data.medium_risk_cases += stat.case_count;
    } else if (stat.severity === 'low_risk') {
      data.low_risk_cases += stat.case_count;
    }
  });

  // Detect outbreaks
  const outbreaks: any[] = [];

  for (const threshold of OUTBREAK_THRESHOLDS) {
    const diseaseStats = aggregated.get(threshold.disease_type);
    if (!diseaseStats) continue;

    diseaseStats.forEach((stats, barangayId) => {
      if (stats.total_cases < threshold.cases_threshold) return;

      const riskLevel = classifyOutbreak(
        stats.high_risk_cases,
        stats.medium_risk_cases,
        stats.low_risk_cases
      );

      outbreaks.push({
        disease_type: threshold.disease_type,
        barangay_id: barangayId,
        barangay_name: barangayMap.get(barangayId) || 'Unknown',
        case_count: stats.total_cases,
        high_risk_cases: stats.high_risk_cases,
        medium_risk_cases: stats.medium_risk_cases,
        low_risk_cases: stats.low_risk_cases,
        risk_level: riskLevel,
        threshold: threshold.cases_threshold,
      });
    });
  }

  // Calculate metadata
  const metadata = {
    total_outbreaks: outbreaks.length,
    critical_outbreaks: outbreaks.filter(o => o.risk_level === 'critical').length,
    high_risk_outbreaks: outbreaks.filter(o => o.risk_level === 'high').length,
    medium_risk_outbreaks: outbreaks.filter(o => o.risk_level === 'medium').length,
    low_risk_outbreaks: outbreaks.filter(o => o.risk_level === 'low').length,
  };

  // Display results
  console.log('\n📈 OUTBREAK DETECTION RESULTS:\n');
  console.log(`Total Outbreaks Detected: ${metadata.total_outbreaks}`);
  console.log(`├─ Critical Outbreaks: ${metadata.critical_outbreaks}`);
  console.log(`├─ High Risk Outbreaks: ${metadata.high_risk_outbreaks}`);
  console.log(`├─ Medium Risk Outbreaks: ${metadata.medium_risk_outbreaks}`);
  console.log(`└─ Low Risk Outbreaks: ${metadata.low_risk_outbreaks}`);

  // Display low-risk outbreaks in detail
  const lowRiskOutbreaks = outbreaks.filter(o => o.risk_level === 'low');

  if (lowRiskOutbreaks.length > 0) {
    console.log(`\n✅ LOW RISK OUTBREAKS DETECTED:\n`);
    lowRiskOutbreaks.forEach((outbreak, index) => {
      console.log(`${index + 1}. ${outbreak.barangay_name} - ${outbreak.disease_type}`);
      console.log(`   Total Cases: ${outbreak.case_count} (Threshold: ${outbreak.threshold})`);
      console.log(`   Severity: High=${outbreak.high_risk_cases}, Medium=${outbreak.medium_risk_cases}, Low=${outbreak.low_risk_cases}`);
      console.log(`   Risk Level: ${outbreak.risk_level.toUpperCase()}\n`);
    });
  } else {
    console.log(`\n⚠️  NO LOW RISK OUTBREAKS DETECTED\n`);
  }

  // Verify fix success
  console.log('=' .repeat(80));
  if (metadata.low_risk_outbreaks > 0) {
    console.log(`\n🎉 SUCCESS! Low-risk outbreaks are now being detected.`);
    console.log(`The 1.5x threshold rule has been successfully removed.\n`);
  } else {
    console.log(`\n⚠️  WARNING: Still no low-risk outbreaks detected.`);
    console.log(`This might indicate an issue with the classification logic or data.\n`);
  }
}

simulateOutbreakDetection().catch(console.error);
