/**
 * Script to create disease-historical-import-template-MOCKUP.xlsx
 * Generates realistic mock data with High Risk, Medium Risk, and Low Risk severity cases
 *
 * Run with: npx tsx scripts/create-mockup-template.ts
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

console.log('📝 Creating Disease Historical Import Template - MOCKUP VERSION');
console.log('   This template contains realistic test data to demonstrate severity levels\n');

// Define barangays with populations (from database - exact names)
const barangays = [
  { name: 'Katualan', population: 611 },
  { name: 'San Roque', population: 666 },
  { name: 'Buenavista', population: 806 },
  { name: 'Waterfall', population: 1000 },
  { name: 'Santa Cruz', population: 1229 },
  { name: 'Kiotoy', population: 1578 },
  { name: 'Gredu (Poblacion)', population: 17084 }, // FIXED: Must include (Poblacion)
  { name: 'New Visayas', population: 19953 },
  { name: 'San Vicente', population: 20317 },
];

// Disease types
const diseaseTypes = [
  'Dengue',
  'Measles',
  'Malaria',
  'Animal Bite',
  'Pregnancy Complications',
  'HIV/AIDS',
  'Custom Disease',
];

// Helper function to generate date range
function generateDateRange(startDate: string, endDate: string, count: number): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const randomDays = Math.floor(Math.random() * daysDiff);
    const date = new Date(start);
    date.setDate(date.getDate() + randomDays);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates.sort();
}

// Create mock data rows
const mockData: any[] = [];

console.log('🔥 SCENARIO A: High Risk Severity Cases (≥70%)\n');

// Scenario A1: Katualan - 450 dengue cases (73.6% = High Risk)
const katualan_dengue_dates = generateDateRange('2026-01-10', '2026-01-20', 15);
console.log(`   Katualan (pop. 611): 450 dengue cases over 11 days`);
console.log(`   → Severity: (450 / 611) × 100 = 73.6% = HIGH RISK ✅`);
katualan_dengue_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Dengue',
    'Case Count': idx === 0 ? 450 : Math.floor(Math.random() * 10) + 5,
    'Barangay': 'Katualan',
    'Custom Disease Name': '',
    'Source': 'Mock Data - High Risk Scenario',
    'Notes': 'High-severity outbreak simulation for testing',
  });
});

// Scenario A2: San Roque - 480 measles cases (72.1% = High Risk)
const sanroque_measles_dates = generateDateRange('2026-01-15', '2026-01-21', 12);
console.log(`   San Roque (pop. 666): 480 measles cases over 7 days`);
console.log(`   → Severity: (480 / 666) × 100 = 72.1% = HIGH RISK ✅\n`);
sanroque_measles_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Measles',
    'Case Count': idx === 0 ? 480 : Math.floor(Math.random() * 15) + 10,
    'Barangay': 'San Roque',
    'Custom Disease Name': '',
    'Source': 'Mock Data - High Risk Scenario',
    'Notes': 'Highly contagious outbreak for testing',
  });
});

// Scenario A3: Buenavista - 580 malaria cases (71.9% = High Risk)
const buenavista_malaria_dates = generateDateRange('2026-01-05', '2026-01-19', 14);
console.log('⚠️  SCENARIO B: Medium Risk Severity Cases (50-69%)\n');
buenavista_malaria_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Malaria',
    'Case Count': idx === 0 ? 580 : Math.floor(Math.random() * 12) + 8,
    'Barangay': 'Buenavista',
    'Custom Disease Name': '',
    'Source': 'Mock Data - High Risk Scenario',
    'Notes': 'Vector-borne disease outbreak simulation',
  });
});

// Scenario B1: Katualan - 350 animal bite cases (57.3% = Medium Risk)
const katualan_animalbite_dates = generateDateRange('2026-01-08', '2026-01-21', 18);
console.log(`   Katualan (pop. 611): 350 animal bite cases over 14 days`);
console.log(`   → Severity: (350 / 611) × 100 = 57.3% = MEDIUM RISK ✅`);
katualan_animalbite_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Animal Bite',
    'Case Count': idx === 0 ? 350 : Math.floor(Math.random() * 8) + 3,
    'Barangay': 'Katualan',
    'Custom Disease Name': '',
    'Source': 'Mock Data - Medium Risk Scenario',
    'Notes': 'Rabies risk outbreak simulation',
  });
});

// Scenario B2: Waterfall - 550 pregnancy complications (55% = Medium Risk)
const waterfall_pregnancy_dates = generateDateRange('2025-12-22', '2026-01-21', 20);
console.log(`   Waterfall (pop. 1000): 550 pregnancy cases over 31 days`);
console.log(`   → Severity: (550 / 1000) × 100 = 55.0% = MEDIUM RISK ✅`);
waterfall_pregnancy_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Pregnancy Complications',
    'Case Count': idx === 0 ? 550 : Math.floor(Math.random() * 10) + 5,
    'Barangay': 'Waterfall',
    'Custom Disease Name': '',
    'Source': 'Mock Data - Medium Risk Scenario',
    'Notes': 'Maternal health crisis simulation',
  });
});

// Scenario B3: Santa Cruz - 700 custom disease Leptospirosis (56.9% = Medium Risk)
const santacruz_lepto_dates = generateDateRange('2026-01-01', '2026-01-21', 22);
console.log(`   Santa Cruz (pop. 1229): 700 Leptospirosis cases over 21 days`);
console.log(`   → Severity: (700 / 1229) × 100 = 56.9% = MEDIUM RISK ✅\n`);
santacruz_lepto_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Custom Disease',
    'Case Count': idx === 0 ? 700 : Math.floor(Math.random() * 15) + 8,
    'Barangay': 'Santa Cruz',
    'Custom Disease Name': 'Leptospirosis',
    'Source': 'Mock Data - Medium Risk Scenario',
    'Notes': 'Waterborne disease outbreak simulation',
  });
});

console.log('ℹ️  SCENARIO C: Low Risk Severity Cases (<50%)\n');

// Scenario C1: Gredu (Poblacion) - 500 dengue cases (2.9% = Low Risk)
const gredu_dengue_dates = generateDateRange('2026-01-01', '2026-01-21', 25);
console.log(`   Gredu (Poblacion) (pop. 17084): 500 dengue cases over 21 days`);
console.log(`   → Severity: (500 / 17084) × 100 = 2.9% = LOW RISK ✅`);
gredu_dengue_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Dengue',
    'Case Count': idx === 0 ? 500 : Math.floor(Math.random() * 20) + 10,
    'Barangay': 'Gredu (Poblacion)',
    'Custom Disease Name': '',
    'Source': 'Mock Data - Low Risk Scenario',
    'Notes': 'Urban center outbreak simulation',
  });
});

// Scenario C2: New Visayas - 600 measles cases (3% = Low Risk)
const newvisayas_measles_dates = generateDateRange('2026-01-05', '2026-01-21', 20);
console.log(`   New Visayas (pop. 19953): 600 measles cases over 17 days`);
console.log(`   → Severity: (600 / 19953) × 100 = 3.0% = LOW RISK ✅`);
newvisayas_measles_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Measles',
    'Case Count': idx === 0 ? 600 : Math.floor(Math.random() * 25) + 15,
    'Barangay': 'New Visayas',
    'Custom Disease Name': '',
    'Source': 'Mock Data - Low Risk Scenario',
    'Notes': 'Large population outbreak simulation',
  });
});

// Scenario C3: San Vicente - 400 HIV cases (2% = Low Risk)
const sanvicente_hiv_dates = generateDateRange('2025-12-01', '2026-01-21', 30);
console.log(`   San Vicente (pop. 20317): 400 HIV/AIDS cases over 52 days`);
console.log(`   → Severity: (400 / 20317) × 100 = 2.0% = LOW RISK ✅`);
sanvicente_hiv_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'HIV/AIDS',
    'Case Count': idx === 0 ? 400 : Math.floor(Math.random() * 5) + 2,
    'Barangay': 'San Vicente',
    'Custom Disease Name': '',
    'Source': 'Mock Data - Low Risk Scenario',
    'Notes': 'Long-term surveillance data',
  });
});

// PURE LOW RISK OUTBREAKS (guaranteed to trigger 'low' risk level)
// Scenario C4: Kiotoy - 50 dengue cases over 14 days (3.2% = Low Risk, PURE)
const kiotoy_dengue_dates = generateDateRange('2026-01-08', '2026-01-21', 8);
console.log(`   Kiotoy (pop. 1578): 50 dengue cases over 14 days`);
console.log(`   → Severity: (50 / 1578) × 100 = 3.2% = LOW RISK (PURE) ✅`);
kiotoy_dengue_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Dengue',
    'Case Count': idx === 0 ? 50 : Math.floor(Math.random() * 3) + 2,
    'Barangay': 'Kiotoy',
    'Custom Disease Name': '',
    'Source': 'Mock Data - Pure Low Risk Outbreak',
    'Notes': 'Pure low-risk outbreak (will trigger "low" outbreak classification)',
  });
});

// Scenario C5: Buenavista - 30 measles cases over 10 days (3.7% = Low Risk, PURE)
const buenavista_measles_low_dates = generateDateRange('2026-01-12', '2026-01-21', 6);
console.log(`   Buenavista (pop. 806): 30 measles cases over 10 days`);
console.log(`   → Severity: (30 / 806) × 100 = 3.7% = LOW RISK (PURE) ✅\n`);
buenavista_measles_low_dates.forEach((date, idx) => {
  mockData.push({
    'Record Date': date,
    'Disease Type': 'Measles',
    'Case Count': idx === 0 ? 30 : Math.floor(Math.random() * 2) + 1,
    'Barangay': 'Buenavista',
    'Custom Disease Name': '',
    'Source': 'Mock Data - Pure Low Risk Outbreak',
    'Notes': 'Pure low-risk outbreak (will trigger "low" outbreak classification)',
  });
});

console.log('🧪 SCENARIO D: Custom Diseases\n');

// Additional custom diseases with various severities
const customDiseases = [
  { name: 'Pneumonia', barangay: 'Kiotoy', pop: 1578, cases: 900, severity: 'medium_risk' },
  { name: 'Typhoid Fever', barangay: 'Waterfall', pop: 1000, cases: 450, severity: 'low_risk' },
  { name: 'Diarrhea', barangay: 'San Roque', pop: 666, cases: 500, severity: 'high_risk' },
  { name: 'Hand-Foot-Mouth Disease', barangay: 'Katualan', pop: 611, cases: 250, severity: 'low_risk' },
];

customDiseases.forEach((disease) => {
  const dates = generateDateRange('2026-01-10', '2026-01-21', 10);
  const percentage = (disease.cases / disease.pop) * 100;
  console.log(`   ${disease.barangay}: ${disease.cases} ${disease.name} cases → ${percentage.toFixed(1)}% = ${disease.severity.toUpperCase()} ✅`);

  dates.forEach((date, idx) => {
    mockData.push({
      'Record Date': date,
      'Disease Type': 'Custom Disease',
      'Case Count': idx === 0 ? disease.cases : Math.floor(Math.random() * 15) + 5,
      'Barangay': disease.barangay,
      'Custom Disease Name': disease.name,
      'Source': 'Mock Data - Custom Disease',
      'Notes': `Custom disease testing - ${disease.severity} severity`,
    });
  });
});

console.log('\n📊 Summary Statistics:');
console.log(`   Total Rows: ${mockData.length}`);
console.log(`   Date Range: ${mockData[0]['Record Date']} to ${mockData[mockData.length - 1]['Record Date']}`);
console.log(`   Unique Barangays: ${new Set(mockData.map(r => r.Barangay)).size}`);
console.log(`   Disease Types: ${new Set(mockData.map(r => r['Disease Type'])).size}`);

// Create workbook
const workbook = XLSX.utils.book_new();

// Add Instructions sheet
const instructions = [
  ['Disease Historical Import Template - MOCKUP VERSION'],
  [''],
  ['This template contains realistic mock data to test severity calculations and outbreak detection.'],
  [''],
  ['SEVERITY FORMULA: (Case Count / Barangay Population) × 100'],
  ['  - High Risk: ≥70%'],
  ['  - Medium Risk: 50-69%'],
  ['  - Low Risk: <50%'],
  [''],
  ['EXPECTED RESULTS AFTER IMPORT:'],
  ['  - High Risk Cases: 2,010+ (from Katualan, San Roque, Buenavista scenarios)'],
  ['  - Medium Risk Cases: 2,500+ (from Waterfall, Santa Cruz, Kiotoy scenarios)'],
  ['  - Low Risk Cases: 4,800+ (from Gredu, New Visayas, San Vicente scenarios)'],
  ['  - High Risk Outbreaks: 2-4 (≥70% severity)'],
  ['  - Medium Risk Outbreaks: 5-8 (50-69% severity)'],
  ['  - Low Risk Outbreaks: 3-5 (<50% severity, pure low-risk only)'],
  [''],
  ['INSTRUCTIONS:'],
  ['1. Go to Staff Dashboard → Disease Surveillance'],
  ['2. Click "Import Historical Data" button'],
  ['3. Upload this Excel file'],
  ['4. Wait for import to complete'],
  ['5. Verify:'],
  ['   - Case Severity Breakdown shows non-zero High Risk, Medium Risk, Low Risk'],
  ['   - Outbreak Alerts show all risk levels with non-zero counts'],
  ['   - Heatmap displays color-coded severity circles (red, orange, yellow)'],
  ['   - Custom diseases show as "Name (Custom Disease)" with blue badges'],
  [''],
  ['COLUMNS IN DATA SHEET:'],
  ['  1. Record Date - Date when cases occurred (YYYY-MM-DD)'],
  ['  2. Disease Type - One of: Dengue, Measles, Malaria, HIV/AIDS, Animal Bite, Pregnancy Complications, Custom Disease'],
  ['  3. Case Count - Number of cases (positive integer)'],
  ['  4. Barangay - Barangay name (must match database)'],
  ['  5. Custom Disease Name - Required if Disease Type = "Custom Disease"'],
  ['  6. Source - Optional data source reference'],
  ['  7. Notes - Optional additional information'],
  [''],
  ['NOTE: Severity is AUTO-CALCULATED. Do not add a severity column!'],
];

const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

// Add Data sheet
const dataSheet = XLSX.utils.json_to_sheet(mockData);
XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

// Add Barangay Reference sheet
const barangayReference = barangays.map(b => ({
  'Barangay Name': b.name,
  'Population': b.population,
  'Cases for High Risk (≥70%)': Math.ceil(b.population * 0.7),
  'Cases for Medium Risk (50-69%)': `${Math.ceil(b.population * 0.5)}-${Math.ceil(b.population * 0.7) - 1}`,
  'Cases for Low Risk (<50%)': `<${Math.ceil(b.population * 0.5)}`,
}));

const barangaySheet = XLSX.utils.json_to_sheet(barangayReference);
XLSX.utils.book_append_sheet(workbook, barangaySheet, 'Barangay Reference');

// Write file
const outputPath = path.join(
  process.cwd(),
  'public',
  'templates',
  'disease-historical-import-template-MOCKUP.xlsx'
);

XLSX.writeFile(workbook, outputPath);

console.log('\n✅ Template created successfully!');
console.log(`   File: ${outputPath}`);
console.log('\n🎉 Ready to import and test outbreak detection system!');
