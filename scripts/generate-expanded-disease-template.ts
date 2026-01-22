/**
 * Script to generate Excel template with STRATEGIC outbreak scenarios
 * Designed to trigger all alert levels: CRITICAL, HIGH, MEDIUM, NORMAL
 * Run with: npx tsx scripts/generate-expanded-disease-template.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// All 41 barangays in Panabo City
const barangays = [
  'A.O. Floirendo', 'Buenavista', 'Cacao', 'Cagangohan', 'Consolacion',
  'Dapco', 'Datu Abdul Dadia', 'Gredu (Poblacion)', 'J.P. Laurel', 'Kasilak',
  'Katipunan', 'Katualan', 'Kauswagan', 'Kiotoy', 'Little Panay',
  'Lower Panaga (Roxas)', 'Mabunao', 'Maduao', 'Malativas', 'Manay',
  'Nanyo', 'New Malaga (Dalisay)', 'New Malitbog', 'New Pandan (Pob.)',
  'New Visayas', 'Outside Zone', 'Quezon', 'Salvacion', 'San Francisco (Pob.)',
  'San Nicolas', 'San Pedro', 'San Roque', 'San Vicente', 'Santa Cruz',
  'Santo Niño (Pob.)', 'Sindaton', 'Southern Davao', 'Tagpore', 'Tibungol',
  'Upper Licanan', 'Waterfall'
];

const sources = [
  'DOH Region XI Bulletin',
  'CHO Daily Report',
  'Provincial Health Office Report',
  'CHO Disease Surveillance',
  'Laboratory Confirmation',
  'Health Center Report'
];

// Helper: Get date N days ago
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper: Random date within last N days (ensures at least 1 day in the past)
function randomDateWithinDays(maxDaysAgo: number): string {
  // Ensure minimum 1 day ago to avoid "today" being considered future
  const daysBack = Math.floor(Math.random() * (maxDaysAgo - 1)) + 1;
  return daysAgo(daysBack);
}

// Helper: Pick random item
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper: Pick severity with weighted distribution
function randomSeverity(critical: number = 5, severe: number = 20, moderate: number = 60, mild: number = 15): string {
  const total = critical + severe + moderate + mild;
  const rand = Math.random() * total;

  if (rand < critical) return 'critical';
  if (rand < critical + severe) return 'severe';
  if (rand < critical + severe + moderate) return 'moderate';
  return 'mild';
}

const templateData = [];

console.log('🎯 Generating strategic outbreak test data...\n');

// ============================================================================
// SCENARIO 1: CRITICAL/HIGH ALERT - Dengue Outbreak in Gredu (Poblacion)
// ============================================================================
// Threshold: 5 cases in 14 days
// Strategy: 10 cases in last 14 days → triggers HIGH RISK (10 >= 5 * 1.5)
// Severity mix: 2 critical, 3 severe, 4 moderate, 1 mild (realistic outbreak)
console.log('📍 Scenario 1: Dengue outbreak in Gredu (Poblacion)');
console.log('   Target: HIGH RISK alert (10 cases >= 7.5 threshold)');
const greduSeverities = ['critical', 'critical', 'severe', 'severe', 'severe', 'moderate', 'moderate', 'moderate', 'moderate', 'mild'];
for (let i = 0; i < 10; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': Math.floor(Math.random() * 3) + 1, // 1-3 cases per record
    'Severity': greduSeverities[i], // Strategic severity distribution
    'Barangay': 'Gredu (Poblacion)',
    'Source': randomPick(sources),
    'Notes': i === 0 ? 'Outbreak alert issued - clustered cases detected' : 'Part of ongoing outbreak investigation'
  });
}

// ============================================================================
// SCENARIO 2: HIGH ALERT - Measles Outbreak in Kasilak
// ============================================================================
// Threshold: 3 cases in 14 days
// Strategy: 6 cases in last 14 days → triggers HIGH RISK (6 >= 3 * 1.5)
// Severity mix: 1 critical, 2 severe, 3 moderate (school outbreak pattern)
console.log('📍 Scenario 2: Measles outbreak in Kasilak');
console.log('   Target: HIGH RISK alert (6 cases >= 4.5 threshold)');
const kasilakSeverities = ['critical', 'severe', 'severe', 'moderate', 'moderate', 'moderate'];
for (let i = 0; i < 6; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 1, // Individual cases
    'Severity': kasilakSeverities[i],
    'Barangay': 'Kasilak',
    'Source': 'DOH Measles Surveillance',
    'Notes': i === 0 ? 'School-based outbreak detected' : 'Contact tracing ongoing'
  });
}

// ============================================================================
// SCENARIO 3: MEDIUM ALERT - Malaria in Dapco
// ============================================================================
// Threshold: 3 cases in 14 days
// Strategy: Exactly 3 cases → triggers MEDIUM (meets threshold exactly)
// Severity mix: 0 critical, 1 severe, 2 moderate (medium outbreak)
console.log('📍 Scenario 3: Malaria outbreak in Dapco');
console.log('   Target: MEDIUM alert (3 cases = exact threshold)');
const dapcoSeverities = ['severe', 'moderate', 'moderate'];
for (let i = 0; i < 3; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': dapcoSeverities[i],
    'Barangay': 'Dapco',
    'Source': 'DOH Malaria Control Program',
    'Notes': 'Endemic area - agricultural workers affected'
  });
}

// ============================================================================
// SCENARIO 4: CRITICAL CITY-WIDE - Dengue Epidemic Across Multiple Barangays
// ============================================================================
// Threshold: 5 cases in 14 days (city-wide threshold: 10 cases = 2x)
// Strategy: 35 cases across 12 barangays → triggers CRITICAL city-wide
// Severity mix: 3 critical, 8 severe, 20 moderate, 4 mild (epidemic pattern)
console.log('📍 Scenario 4: Dengue city-wide epidemic');
console.log('   Target: CRITICAL city-wide alert (35 cases >= 10 threshold)');

const epidemicBarangays = [
  'Buenavista', 'San Francisco (Pob.)', 'Santo Niño (Pob.)', 'New Pandan (Pob.)',
  'Kauswagan', 'Mabunao', 'San Vicente', 'Santa Cruz', 'Quezon',
  'Salvacion', 'New Visayas', 'A.O. Floirendo'
];

for (let i = 0; i < 35; i++) {
  // Realistic severity distribution for epidemic (8.5% critical, 23% severe, 57% moderate, 11.5% mild)
  let severity: string;
  if (i < 3) severity = 'critical';
  else if (i < 11) severity = 'severe';
  else if (i < 31) severity = 'moderate';
  else severity = 'mild';

  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': Math.floor(Math.random() * 2) + 1, // 1-2 cases per record
    'Severity': severity,
    'Barangay': epidemicBarangays[i % epidemicBarangays.length],
    'Source': randomPick(sources),
    'Notes': i < 5 ? 'City-wide epidemic alert - immediate response required' : ''
  });
}

// ============================================================================
// SCENARIO 4B: CRITICAL - Severe Dengue Hemorrhagic Fever Cluster
// ============================================================================
// Threshold: 5 cases in 14 days
// Strategy: 45 cases with HIGH severity concentration → triggers CRITICAL
// Severity mix: 6 critical, 12 severe, 22 moderate, 5 mild (severe epidemic)
console.log('📍 Scenario 4B: Severe Dengue Hemorrhagic Fever cluster');
console.log('   Target: CRITICAL alert (45 cases, 6 critical, 12 severe)');

const dhfBarangays = ['San Nicolas', 'San Pedro', 'San Roque', 'Katipunan', 'Manay', 'Nanyo'];
for (let i = 0; i < 45; i++) {
  let severity: string;
  if (i < 6) severity = 'critical';  // 13% critical
  else if (i < 18) severity = 'severe';  // 27% severe
  else if (i < 40) severity = 'moderate';  // 49% moderate
  else severity = 'mild';  // 11% mild

  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': Math.floor(Math.random() * 2) + 1,
    'Severity': severity,
    'Barangay': dhfBarangays[i % dhfBarangays.length],
    'Source': 'DOH Emergency Response Team',
    'Notes': i < 3 ? 'Dengue Hemorrhagic Fever - Critical epidemic alert' : ''
  });
}

// ============================================================================
// SCENARIO 4C: CRITICAL - Measles Epidemic in Schools
// ============================================================================
// Threshold: 3 cases in 14 days
// Strategy: 38 cases across urban barangays → triggers CRITICAL
// Severity mix: 5 critical, 10 severe, 18 moderate, 5 mild (school outbreak)
console.log('📍 Scenario 4C: Measles epidemic in school communities');
console.log('   Target: CRITICAL alert (38 cases, 5 critical, 10 severe)');

const schoolBarangays = ['J.P. Laurel', 'Kiotoy', 'Tibungol', 'Tagpore', 'Upper Licanan'];
for (let i = 0; i < 38; i++) {
  let severity: string;
  if (i < 5) severity = 'critical';
  else if (i < 15) severity = 'severe';
  else if (i < 33) severity = 'moderate';
  else severity = 'mild';

  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': severity,
    'Barangay': schoolBarangays[i % schoolBarangays.length],
    'Source': 'DOH Measles Surveillance',
    'Notes': i < 2 ? 'School-based measles epidemic - mass immunization campaign launched' : ''
  });
}

// ============================================================================
// SCENARIO 5A: HIGH RISK - Dengue Cluster in New Malitbog
// ============================================================================
// Threshold: 5 cases in 14 days
// Strategy: 9 cases → triggers HIGH RISK (9 >= 7.5)
// Severity mix: 1 critical, 3 severe, 4 moderate, 1 mild
console.log('📍 Scenario 5A: Dengue cluster in New Malitbog');
console.log('   Target: HIGH RISK alert (9 cases)');
const malitbogSeverities = ['critical', 'severe', 'severe', 'severe', 'moderate', 'moderate', 'moderate', 'moderate', 'mild'];
for (let i = 0; i < 9; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': malitbogSeverities[i],
    'Barangay': 'New Malitbog',
    'Source': randomPick(sources),
    'Notes': i === 0 ? 'Cluster outbreak detected - vector control deployed' : ''
  });
}

// ============================================================================
// SCENARIO 5B: HIGH RISK - Dengue in Cagangohan
// ============================================================================
console.log('📍 Scenario 5B: Dengue cluster in Cagangohan');
console.log('   Target: HIGH RISK alert (11 cases)');
const cagangohanSeverities = ['critical', 'critical', 'severe', 'severe', 'severe', 'moderate', 'moderate', 'moderate', 'moderate', 'moderate', 'mild'];
for (let i = 0; i < 11; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': cagangohanSeverities[i],
    'Barangay': 'Cagangohan',
    'Source': randomPick(sources),
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 5C: HIGH RISK - Malaria Endemic Area in Waterfall
// ============================================================================
// Threshold: 3 cases in 14 days
// Strategy: 6 cases → triggers HIGH RISK (6 >= 4.5)
console.log('📍 Scenario 5C: Malaria endemic outbreak in Waterfall');
console.log('   Target: HIGH RISK alert (6 cases)');
const waterfallSeverities = ['severe', 'severe', 'moderate', 'moderate', 'moderate', 'mild'];
for (let i = 0; i < 6; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': waterfallSeverities[i],
    'Barangay': 'Waterfall',
    'Source': 'DOH Malaria Control Program',
    'Notes': i === 0 ? 'Forest workers affected - endemic area monitoring intensified' : ''
  });
}

// ============================================================================
// SCENARIO 5D: HIGH RISK - Typhoid Fever Outbreak
// ============================================================================
// Threshold: 3 cases in 14 days (custom disease)
// Strategy: 5 cases → triggers HIGH RISK (5 >= 4.5)
console.log('📍 Scenario 5D: Typhoid fever outbreak in Malativas');
console.log('   Target: HIGH RISK alert (5 cases)');
const typhoidSeverities = ['severe', 'severe', 'moderate', 'moderate', 'mild'];
for (let i = 0; i < 5; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Custom Disease',
    'Custom Disease Name': 'Typhoid Fever',
    'Case Count': 1,
    'Severity': typhoidSeverities[i],
    'Barangay': 'Malativas',
    'Source': 'CHO Special Disease Monitoring',
    'Notes': i === 0 ? 'Water contamination suspected - sanitation measures implemented' : ''
  });
}

// ============================================================================
// SCENARIO 5E: HIGH RISK - Pneumonia Cluster
// ============================================================================
console.log('📍 Scenario 5E: Pneumonia cluster in Sindaton');
console.log('   Target: HIGH RISK alert (4 cases)');
const pneumoniaSeverities = ['critical', 'severe', 'severe', 'moderate'];
for (let i = 0; i < 4; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Custom Disease',
    'Custom Disease Name': 'Pneumonia',
    'Case Count': 1,
    'Severity': pneumoniaSeverities[i],
    'Barangay': 'Sindaton',
    'Source': 'CHO Respiratory Surveillance',
    'Notes': i === 0 ? 'Respiratory outbreak - elderly population affected' : ''
  });
}

// ============================================================================
// SCENARIO 5F: HIGH RISK - Measles in New Visayas
// ============================================================================
console.log('📍 Scenario 5F: Measles outbreak in New Visayas');
console.log('   Target: HIGH RISK alert (7 cases)');
const newVisayasSeverities = ['critical', 'severe', 'severe', 'moderate', 'moderate', 'moderate', 'mild'];
for (let i = 0; i < 7; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': newVisayasSeverities[i],
    'Barangay': 'New Visayas',
    'Source': 'DOH Measles Surveillance',
    'Notes': i === 0 ? 'Unvaccinated children affected' : ''
  });
}

// ============================================================================
// SCENARIO 5: MEDIUM ALERT - Rabies Case (Immediate Alert)
// ============================================================================
// Threshold: 1 case in 7 days
// Strategy: 1 case → triggers MEDIUM (rabies = immediate alert)
console.log('📍 Scenario 5: Rabies immediate alert');
console.log('   Target: MEDIUM alert (1 case triggers rabies alert)');
templateData.push({
  'Record Date': daysAgo(3),
  'Disease Type': 'Animal Bite',
  'Custom Disease Name': '',
  'Case Count': 1,
  'Severity': 'severe', // Rabies cases are always serious
  'Barangay': 'Little Panay',
  'Source': 'Rabies Prevention Program Report',
  'Notes': 'Confirmed rabies case - immediate post-exposure prophylaxis administered'
});

// ============================================================================
// SCENARIO 6: MEDIUM ALERT - Leptospirosis (Custom Disease)
// ============================================================================
// Threshold: 3 cases in 14 days
// Strategy: Exactly 3 cases → triggers MEDIUM
// Severity mix: 0 critical, 1 severe, 2 moderate
console.log('📍 Scenario 6: Leptospirosis outbreak (custom disease)');
console.log('   Target: MEDIUM alert (3 cases = exact threshold)');
const leptoSeverities = ['severe', 'moderate', 'moderate'];
for (let i = 0; i < 3; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Custom Disease',
    'Custom Disease Name': 'Leptospirosis',
    'Case Count': 1,
    'Severity': leptoSeverities[i],
    'Barangay': 'Southern Davao',
    'Source': 'CHO Special Disease Monitoring',
    'Notes': i === 0 ? 'Flooding-related outbreak' : 'Water contamination suspected'
  });
}

// ============================================================================
// SCENARIO 6B: MEDIUM ALERT - Dengue in Cacao (Exact Threshold)
// ============================================================================
console.log('📍 Scenario 6B: Dengue at threshold in Cacao');
console.log('   Target: MEDIUM alert (5 cases = exact threshold)');
const cacaoSeverities = ['severe', 'moderate', 'moderate', 'moderate', 'mild'];
for (let i = 0; i < 5; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': cacaoSeverities[i],
    'Barangay': 'Cacao',
    'Source': randomPick(sources),
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 6C: MEDIUM ALERT - Measles in Maduao
// ============================================================================
console.log('📍 Scenario 6C: Measles at threshold in Maduao');
console.log('   Target: MEDIUM alert (3 cases = exact threshold)');
const maduaoSeverities = ['severe', 'moderate', 'moderate'];
for (let i = 0; i < 3; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': maduaoSeverities[i],
    'Barangay': 'Maduao',
    'Source': 'DOH Measles Surveillance',
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 6D: MEDIUM ALERT - Malaria in Datu Abdul Dadia
// ============================================================================
console.log('📍 Scenario 6D: Malaria at threshold in Datu Abdul Dadia');
console.log('   Target: MEDIUM alert (3 cases)');
for (let i = 0; i < 3; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': i === 0 ? 'severe' : 'moderate',
    'Barangay': 'Datu Abdul Dadia',
    'Source': 'DOH Malaria Control Program',
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 6E: MEDIUM ALERT - Hand-Foot-Mouth Disease
// ============================================================================
console.log('📍 Scenario 6E: Hand-Foot-Mouth Disease in Lower Panaga');
console.log('   Target: MEDIUM alert (3 cases)');
for (let i = 0; i < 3; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Custom Disease',
    'Custom Disease Name': 'Hand-Foot-Mouth Disease',
    'Case Count': 1,
    'Severity': i === 0 ? 'severe' : 'moderate',
    'Barangay': 'Lower Panaga (Roxas)',
    'Source': 'CHO Special Disease Monitoring',
    'Notes': i === 0 ? 'Daycare center affected' : ''
  });
}

// ============================================================================
// SCENARIO 6F: MEDIUM ALERT - Dengue in Outside Zone
// ============================================================================
console.log('📍 Scenario 6F: Dengue at threshold in Outside Zone');
console.log('   Target: MEDIUM alert (5 cases)');
for (let i = 0; i < 5; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': i < 1 ? 'severe' : 'moderate',
    'Barangay': 'Outside Zone',
    'Source': randomPick(sources),
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 6G: MEDIUM ALERT - Measles in Kauswagan
// ============================================================================
console.log('📍 Scenario 6G: Measles at threshold in Kauswagan');
console.log('   Target: MEDIUM alert (3 cases)');
for (let i = 0; i < 3; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': i === 0 ? 'severe' : 'moderate',
    'Barangay': 'Kauswagan',
    'Source': 'DOH Measles Surveillance',
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 6H: MEDIUM ALERT - Diarrhea Outbreak
// ============================================================================
console.log('📍 Scenario 6H: Diarrhea outbreak in New Malaga');
console.log('   Target: MEDIUM alert (3 cases)');
for (let i = 0; i < 3; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Custom Disease',
    'Custom Disease Name': 'Diarrhea',
    'Case Count': 1,
    'Severity': 'moderate',
    'Barangay': 'New Malaga (Dalisay)',
    'Source': 'CHO Special Disease Monitoring',
    'Notes': i === 0 ? 'Food safety investigation initiated' : ''
  });
}

// ============================================================================
// SCENARIO 6I: MEDIUM ALERT - Animal Bite in Mabunao
// ============================================================================
console.log('📍 Scenario 6I: Animal bite case in Mabunao');
console.log('   Target: MEDIUM alert (1 case in 7 days)');
templateData.push({
  'Record Date': daysAgo(2),
  'Disease Type': 'Animal Bite',
  'Custom Disease Name': '',
  'Case Count': 1,
  'Severity': 'severe',
  'Barangay': 'Mabunao',
  'Source': 'CHO Animal Bite Center',
  'Notes': 'Possible rabies exposure - monitoring patient'
});

// ============================================================================
// SCENARIO 6J: MEDIUM ALERT - Malaria in Consolacion
// ============================================================================
console.log('📍 Scenario 6J: Malaria at threshold in Consolacion');
console.log('   Target: MEDIUM alert (3 cases)');
for (let i = 0; i < 3; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': i === 0 ? 'severe' : 'moderate',
    'Barangay': 'Consolacion',
    'Source': 'DOH Malaria Control Program',
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 6K: MEDIUM ALERT - Dengue in San Vicente
// ============================================================================
console.log('📍 Scenario 6K: Dengue at threshold in San Vicente');
console.log('   Target: MEDIUM alert (5 cases)');
for (let i = 0; i < 5; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': i === 0 ? 'severe' : 'moderate',
    'Barangay': 'San Vicente',
    'Source': randomPick(sources),
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 6L: MEDIUM ALERT - Measles in A.O. Floirendo
// ============================================================================
console.log('📍 Scenario 6L: Measles at threshold in A.O. Floirendo');
console.log('   Target: MEDIUM alert (3 cases)');
for (let i = 0; i < 3; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(14),
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': i === 0 ? 'severe' : 'moderate',
    'Barangay': 'A.O. Floirendo',
    'Source': 'DOH Measles Surveillance',
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 7: NORMAL STATUS - Below Threshold Cases
// ============================================================================
// Strategy: Various diseases with 1-2 cases each (below thresholds)
console.log('📍 Scenario 7: Normal status diseases (below threshold)');

// Animal Bite - scattered cases (below rabies threshold of 1 in 7 days, but older)
for (let i = 0; i < 15; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(30), // Spread across 30 days
    'Severity': randomSeverity(5, 15, 65, 15), // Mostly mild/moderate for scattered cases
    'Disease Type': 'Animal Bite',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Barangay': randomPick(barangays),
    'Source': 'CHO Animal Bite Center',
    'Notes': 'Routine dog bite case'
  });
}

// Malaria - scattered (1-2 cases per barangay, below threshold)
const malariaBarangays = ['Cacao', 'Waterfall', 'Maduao', 'Consolacion'];
for (let i = 0; i < 8; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(30),
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': randomSeverity(0, 20, 60, 20), // Mostly moderate for endemic areas
    'Barangay': malariaBarangays[i % malariaBarangays.length],
    'Source': 'DOH Malaria Control Program',
    'Notes': ''
  });
}

// Measles - scattered (1-2 cases, below threshold of 3)
for (let i = 0; i < 10; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(30),
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Severity': randomSeverity(5, 25, 55, 15), // Measles can be more severe
    'Barangay': randomPick(barangays),
    'Source': 'DOH Measles Surveillance',
    'Notes': ''
  });
}

// Custom diseases - scattered
const customDiseases = ['Typhoid Fever', 'Pneumonia', 'Diarrhea', 'Hand-Foot-Mouth Disease'];
for (let i = 0; i < 20; i++) {
  templateData.push({
    'Record Date': randomDateWithinDays(30),
    'Disease Type': 'Custom Disease',
    'Custom Disease Name': customDiseases[i % customDiseases.length],
    'Case Count': 1,
    'Severity': randomSeverity(2, 15, 68, 15), // Varied severity for custom diseases
    'Barangay': randomPick(barangays),
    'Source': 'CHO Special Disease Monitoring',
    'Notes': ''
  });
}

// ============================================================================
// SCENARIO 8: BACKGROUND NOISE - Older Historical Data
// ============================================================================
// Strategy: Older cases (15-30 days ago) won't trigger current outbreaks
console.log('📍 Scenario 8: Background historical data');

for (let i = 0; i < 40; i++) {
  const disease = randomPick(['Dengue', 'Measles', 'Malaria', 'Animal Bite']);
  templateData.push({
    'Record Date': randomDateWithinDays(30), // 15-30 days ago
    'Disease Type': disease,
    'Custom Disease Name': '',
    'Case Count': Math.floor(Math.random() * 2) + 1,
    'Severity': randomSeverity(3, 18, 62, 17), // General distribution
    'Barangay': randomPick(barangays),
    'Source': randomPick(sources),
    'Notes': 'Historical surveillance data'
  });
}

// Sort by date (oldest first)
templateData.sort((a, b) => new Date(a['Record Date']).getTime() - new Date(b['Record Date']).getTime());

console.log(`\n✅ Generated ${templateData.length} total records\n`);
console.log('📊 EXPECTED OUTBREAK ALERTS:');
console.log('   🔴 CRITICAL (3 outbreaks):');
console.log('      • Dengue city-wide epidemic (35 cases across 12 barangays)');
console.log('      • Dengue Hemorrhagic Fever cluster (45 cases, 6 critical, 12 severe)');
console.log('      • Measles school epidemic (38 cases, 5 critical, 10 severe)');
console.log('   🟠 HIGH RISK (8 outbreaks):');
console.log('      • Dengue in Gredu (10 cases), New Malitbog (9 cases), Cagangohan (11 cases)');
console.log('      • Measles in Kasilak (6 cases), New Visayas (7 cases)');
console.log('      • Malaria in Waterfall (6 cases)');
console.log('      • Typhoid Fever in Malativas (5 cases)');
console.log('      • Pneumonia in Sindaton (4 cases)');
console.log('   🟡 MEDIUM (12 outbreaks):');
console.log('      • Malaria: Dapco (3), Datu Abdul Dadia (3), Consolacion (3)');
console.log('      • Dengue: Cacao (5), Outside Zone (5), San Vicente (5)');
console.log('      • Measles: Maduao (3), Kauswagan (3), A.O. Floirendo (3)');
console.log('      • Leptospirosis in Southern Davao (3)');
console.log('      • Animal Bite: Little Panay (1), Mabunao (1)');
console.log('      • Custom: Hand-Foot-Mouth (3), Diarrhea (3)');
console.log('   🟢 NORMAL: Animal Bite, scattered cases below thresholds\n');

// Instructions sheet data
const instructionsData = [
  ['DISEASE SURVEILLANCE TEST DATA - STRATEGIC OUTBREAK SCENARIOS'],
  [''],
  ['📊 THIS TEMPLATE CONTAINS PRE-CONFIGURED OUTBREAK SCENARIOS FOR TESTING'],
  [''],
  ['🎯 TESTING OBJECTIVES:'],
  [''],
  ['This template is designed to trigger ALL outbreak alert levels:'],
  [''],
  ['🔴 CRITICAL ALERTS (3 scenarios):'],
  ['   • Dengue city-wide epidemic (35 cases across 12 barangays)'],
  ['   • Dengue Hemorrhagic Fever cluster (45 cases, 6 critical, 12 severe)'],
  ['   • Measles school epidemic (38 cases, 5 critical, 10 severe)'],
  [''],
  ['🟠 HIGH RISK ALERTS (8 scenarios):'],
  ['   • Dengue outbreaks: Gredu (10), New Malitbog (9), Cagangohan (11)'],
  ['   • Measles outbreaks: Kasilak (6), New Visayas (7)'],
  ['   • Malaria in Waterfall (6 cases)'],
  ['   • Typhoid Fever in Malativas (5 cases)'],
  ['   • Pneumonia in Sindaton (4 cases)'],
  [''],
  ['🟡 MEDIUM ALERTS (12 scenarios):'],
  ['   • Malaria: Dapco, Datu Abdul Dadia, Consolacion (3 cases each)'],
  ['   • Dengue: Cacao, Outside Zone, San Vicente (5 cases each)'],
  ['   • Measles: Maduao, Kauswagan, A.O. Floirendo (3 cases each)'],
  ['   • Leptospirosis, Hand-Foot-Mouth, Diarrhea (3 cases each)'],
  ['   • Animal Bite cases: Little Panay, Mabunao (1 case each)'],
  [''],
  ['🟢 NORMAL STATUS:'],
  ['   • Animal Bite - scattered cases (below threshold)'],
  ['   • Other diseases - distributed cases (below thresholds)'],
  [''],
  ['📅 DATE RANGE: Last 30 days (recent outbreak data)'],
  [''],
  ['⚠️ DO NOT MODIFY DATA - Import as-is for accurate testing'],
  [''],
  ['OUTBREAK DETECTION THRESHOLDS:'],
  ['   • Dengue: 5 cases in 14 days'],
  ['   • Measles: 3 cases in 14 days'],
  ['   • Malaria: 3 cases in 14 days'],
  ['   • Rabies/Animal Bite: 1 case in 7 days'],
  ['   • Custom Disease: 3 cases in 14 days'],
  ['   • City-Wide: 2x barangay threshold'],
  [''],
  ['RISK LEVEL CALCULATIONS:'],
  ['   • CRITICAL: ≥10 cases city-wide OR ≥3x threshold single barangay'],
  ['   • HIGH: ≥1.5x threshold in single barangay'],
  ['   • MEDIUM: Meets exact threshold'],
  ['   • NORMAL: Below threshold'],
  [''],
  ['COLUMN DESCRIPTIONS:'],
  [''],
  ['Record Date (REQUIRED):'],
  ['   • Format: YYYY-MM-DD'],
  ['   • Automatically generated within last 30 days'],
  [''],
  ['Disease Type (REQUIRED):'],
  ['   • Values: Dengue, Malaria, Measles, Animal Bite, Custom Disease'],
  [''],
  ['Custom Disease Name (CONDITIONAL):'],
  ['   • Required only if Disease Type = "Custom Disease"'],
  ['   • Examples in template: Leptospirosis, Typhoid, Pneumonia, etc.'],
  [''],
  ['Case Count (REQUIRED):'],
  ['   • Number of confirmed cases for this record'],
  ['   • Strategically assigned to trigger outbreak thresholds'],
  [''],
  ['Severity (REQUIRED):'],
  ['   • Values: critical, severe, moderate, mild'],
  ['   • Critical: Life-threatening, requires immediate ICU care'],
  ['   • Severe: Serious symptoms, hospitalization required'],
  ['   • Moderate: Symptomatic but stable, outpatient care'],
  ['   • Mild: Minor symptoms, minimal medical intervention'],
  ['   • Outbreak risk calculations consider severity distribution'],
  [''],
  ['Barangay (REQUIRED):'],
  ['   • Must match exact barangay name from system'],
  ['   • Strategically clustered for outbreak scenarios'],
  [''],
  ['Source (OPTIONAL):'],
  ['   • Reference to data source'],
  [''],
  ['Notes (OPTIONAL):'],
  ['   • Additional context about the outbreak scenario'],
];

// Barangay list
const barangayListData = [
  ['VALID BARANGAY NAMES (41 total)'],
  [''],
  ['Use these exact names in the "Barangay" column:'],
  [''],
  ...barangays.map(b => [b])
];

// Create workbook
const workbook = XLSX.utils.book_new();

// Add Instructions sheet
const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
instructionsSheet['!cols'] = [{ wch: 85 }];
XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

// Add Data sheet
const dataSheet = XLSX.utils.json_to_sheet(templateData);
dataSheet['!cols'] = [
  { wch: 15 }, // Record Date
  { wch: 25 }, // Disease Type
  { wch: 25 }, // Custom Disease Name
  { wch: 12 }, // Case Count
  { wch: 12 }, // Severity (NEW)
  { wch: 30 }, // Barangay
  { wch: 30 }, // Source
  { wch: 60 }, // Notes
];
XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

// Add Barangay List sheet
const barangaySheet = XLSX.utils.aoa_to_sheet(barangayListData);
barangaySheet['!cols'] = [{ wch: 40 }];
XLSX.utils.book_append_sheet(workbook, barangaySheet, 'Barangay List');

// Write to file
const outputPath = path.join(
  __dirname,
  '..',
  'public',
  'templates',
  'disease-historical-import-template.xlsx'
);

// Ensure templates directory exists
const templatesDir = path.dirname(outputPath);
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

XLSX.writeFile(workbook, outputPath);

console.log('✅ Strategic outbreak test template created successfully!');
console.log(`📁 Location: ${outputPath}`);
console.log(`📊 Total Records: ${templateData.length}`);
console.log('🎯 Ready for testing - Import to verify all alert levels!');
console.log('🌐 Download URL: /templates/disease-historical-import-template.xlsx');
