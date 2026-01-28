/**
 * Script to generate Excel template for HIV appointment historical data import
 * Run with: npx tsx scripts/generate-hiv-template.ts
 *
 * SIMPLIFIED TEMPLATE (Jan 2025):
 * - Removed Status column (was misleading - all statuses were aggregated anyway)
 * - Now matches healthcard template pattern
 * - Only tracks completed appointments (what matters for SARIMA predictions)
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Template data with VALID, IMPORTABLE examples
// These records can be imported directly for testing without modification
// Using historical dates (2020-2024) for comprehensive SARIMA training data
// Mock data follows realistic seasonal patterns for HIV testing:
// - Peaks in June/July (HIV Awareness Month, World AIDS Conference)
// - Peaks in December (World AIDS Day - Dec 1)
// - Low periods in January (post-holiday)
// - Gradual growth trend year-over-year reflecting improved outreach
const templateData = [
  // ==================== 2020 Historical Data (Pre-System, COVID Impact) ====================
  {
    'Appointment Month': '2020-01',
    'Appointments Completed': 5,
    'Barangay': 'Datu Abdul Dadia',
    'Source': 'CHO Manual Records',
    'Notes': 'Jan 2020 - Pre-pandemic baseline'
  },
  {
    'Appointment Month': '2020-02',
    'Appointments Completed': 7,
    'Barangay': 'Gredu',
    'Source': 'CHO Manual Records',
    'Notes': 'Feb 2020 - Normal operations'
  },
  {
    'Appointment Month': '2020-03',
    'Appointments Completed': 3,
    'Barangay': '',
    'Source': 'CHO Manual Records',
    'Notes': 'Mar 2020 - COVID-19 lockdown begins, services reduced'
  },
  {
    'Appointment Month': '2020-04',
    'Appointments Completed': 2,
    'Barangay': 'New Pandan (Poblacion)',
    'Source': 'CHO Manual Records',
    'Notes': 'Apr 2020 - ECQ period, minimal services'
  },
  {
    'Appointment Month': '2020-05',
    'Appointments Completed': 4,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'May 2020 - MECQ, gradual resumption'
  },
  {
    'Appointment Month': '2020-06',
    'Appointments Completed': 6,
    'Barangay': 'San Francisco (Poblacion)',
    'Source': 'CHO Manual Records',
    'Notes': 'Jun 2020 - HIV Awareness Month (limited activities)'
  },
  {
    'Appointment Month': '2020-07',
    'Appointments Completed': 8,
    'Barangay': 'Kasilak',
    'Source': 'CHO Manual Records',
    'Notes': 'Jul 2020 - GCQ, services resuming'
  },
  {
    'Appointment Month': '2020-08',
    'Appointments Completed': 7,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Aug 2020 - Continued recovery'
  },
  {
    'Appointment Month': '2020-09',
    'Appointments Completed': 6,
    'Barangay': 'Dapco',
    'Source': 'CHO Manual Records',
    'Notes': 'Sep 2020 - Stable operations'
  },
  {
    'Appointment Month': '2020-10',
    'Appointments Completed': 8,
    'Barangay': 'Mabunao',
    'Source': 'CHO Manual Records',
    'Notes': 'Oct 2020 - Outreach programs resume'
  },
  {
    'Appointment Month': '2020-11',
    'Appointments Completed': 10,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Nov 2020 - Pre-World AIDS Day campaigns'
  },
  {
    'Appointment Month': '2020-12',
    'Appointments Completed': 12,
    'Barangay': 'Santo Niño (Poblacion)',
    'Source': 'CHO Manual Records',
    'Notes': 'Dec 2020 - World AIDS Day (virtual events)'
  },

  // ==================== 2021 Historical Data (Recovery Year) ====================
  {
    'Appointment Month': '2021-01',
    'Appointments Completed': 8,
    'Barangay': 'Katipunan',
    'Source': 'CHO Manual Records',
    'Notes': 'Jan 2021 - Post-holiday, vaccine rollout begins'
  },
  {
    'Appointment Month': '2021-02',
    'Appointments Completed': 10,
    'Barangay': 'Buenavista',
    'Source': 'CHO Manual Records',
    'Notes': 'Feb 2021 - Services expanding'
  },
  {
    'Appointment Month': '2021-03',
    'Appointments Completed': 12,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Mar 2021 - Community testing resumes'
  },
  {
    'Appointment Month': '2021-04',
    'Appointments Completed': 11,
    'Barangay': 'Cacao',
    'Source': 'CHO Manual Records',
    'Notes': 'Apr 2021 - Easter outreach programs'
  },
  {
    'Appointment Month': '2021-05',
    'Appointments Completed': 14,
    'Barangay': 'Cagangohan',
    'Source': 'CHO Manual Records',
    'Notes': 'May 2021 - Pre-awareness month preparations'
  },
  {
    'Appointment Month': '2021-06',
    'Appointments Completed': 18,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Jun 2021 - HIV Awareness Month activities'
  },
  {
    'Appointment Month': '2021-07',
    'Appointments Completed': 20,
    'Barangay': 'Consolacion',
    'Source': 'CHO Manual Records',
    'Notes': 'Jul 2021 - Peak testing period'
  },
  {
    'Appointment Month': '2021-08',
    'Appointments Completed': 16,
    'Barangay': 'J.P. Laurel',
    'Source': 'CHO Manual Records',
    'Notes': 'Aug 2021 - Post-peak sustained volume'
  },
  {
    'Appointment Month': '2021-09',
    'Appointments Completed': 14,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Sep 2021 - Back to school health drives'
  },
  {
    'Appointment Month': '2021-10',
    'Appointments Completed': 13,
    'Barangay': 'Katualan',
    'Source': 'CHO Manual Records',
    'Notes': 'Oct 2021 - Regular operations'
  },
  {
    'Appointment Month': '2021-11',
    'Appointments Completed': 17,
    'Barangay': 'Kauswagan',
    'Source': 'CHO Manual Records',
    'Notes': 'Nov 2021 - Pre-World AIDS Day campaigns'
  },
  {
    'Appointment Month': '2021-12',
    'Appointments Completed': 22,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Dec 2021 - World AIDS Day surge'
  },

  // ==================== 2022 Historical Data (Full Recovery) ====================
  {
    'Appointment Month': '2022-01',
    'Appointments Completed': 12,
    'Barangay': 'Kiotoy',
    'Source': 'CHO Manual Records',
    'Notes': 'Jan 2022 - Post-holiday low but improving'
  },
  {
    'Appointment Month': '2022-02',
    'Appointments Completed': 15,
    'Barangay': 'Little Panay',
    'Source': 'CHO Manual Records',
    'Notes': 'Feb 2022 - Valentine\'s health awareness'
  },
  {
    'Appointment Month': '2022-03',
    'Appointments Completed': 18,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Mar 2022 - Women\'s health month tie-in'
  },
  {
    'Appointment Month': '2022-04',
    'Appointments Completed': 16,
    'Barangay': 'Lower Panaga (Roxas)',
    'Source': 'CHO Manual Records',
    'Notes': 'Apr 2022 - Community outreach expansion'
  },
  {
    'Appointment Month': '2022-05',
    'Appointments Completed': 20,
    'Barangay': 'Maduao',
    'Source': 'CHO Manual Records',
    'Notes': 'May 2022 - Pre-awareness month surge'
  },
  {
    'Appointment Month': '2022-06',
    'Appointments Completed': 28,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Jun 2022 - HIV Awareness Month peak'
  },
  {
    'Appointment Month': '2022-07',
    'Appointments Completed': 32,
    'Barangay': 'Malativas',
    'Source': 'CHO Manual Records',
    'Notes': 'Jul 2022 - Highest testing volume (post-COVID recovery)'
  },
  {
    'Appointment Month': '2022-08',
    'Appointments Completed': 25,
    'Barangay': 'Manay',
    'Source': 'CHO Manual Records',
    'Notes': 'Aug 2022 - Post-peak sustained testing'
  },
  {
    'Appointment Month': '2022-09',
    'Appointments Completed': 21,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Sep 2022 - School health programs'
  },
  {
    'Appointment Month': '2022-10',
    'Appointments Completed': 19,
    'Barangay': 'Nanyo',
    'Source': 'CHO Manual Records',
    'Notes': 'Oct 2022 - Regular operations continue'
  },
  {
    'Appointment Month': '2022-11',
    'Appointments Completed': 24,
    'Barangay': 'New Malaga (New Malitbog)',
    'Source': 'CHO Manual Records',
    'Notes': 'Nov 2022 - Pre-World AIDS Day campaigns'
  },
  {
    'Appointment Month': '2022-12',
    'Appointments Completed': 30,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Dec 2022 - World AIDS Day surge'
  },

  // ==================== 2023 Historical Data (System Launch Year) ====================
  {
    'Appointment Month': '2023-01',
    'Appointments Completed': 14,
    'Barangay': 'New Visayas',
    'Source': 'CHO Manual Records',
    'Notes': 'Jan 2023 - Post-holiday period'
  },
  {
    'Appointment Month': '2023-02',
    'Appointments Completed': 18,
    'Barangay': 'Quezon',
    'Source': 'CHO Manual Records',
    'Notes': 'Feb 2023 - Valentine\'s awareness campaigns'
  },
  {
    'Appointment Month': '2023-03',
    'Appointments Completed': 22,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Mar 2023 - Expanding community testing'
  },
  {
    'Appointment Month': '2023-04',
    'Appointments Completed': 19,
    'Barangay': 'Salvacion',
    'Source': 'CHO Manual Records',
    'Notes': 'Apr 2023 - Holy Week outreach'
  },
  {
    'Appointment Month': '2023-05',
    'Appointments Completed': 25,
    'Barangay': 'San Nicolas',
    'Source': 'CHO Manual Records',
    'Notes': 'May 2023 - Pre-awareness month activities'
  },
  {
    'Appointment Month': '2023-06',
    'Appointments Completed': 35,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Jun 2023 - HIV Awareness Month (record high)'
  },
  {
    'Appointment Month': '2023-07',
    'Appointments Completed': 38,
    'Barangay': 'San Pedro',
    'Source': 'CHO Manual Records',
    'Notes': 'Jul 2023 - Peak testing volume'
  },
  {
    'Appointment Month': '2023-08',
    'Appointments Completed': 30,
    'Barangay': 'San Roque',
    'Source': 'CHO Manual Records',
    'Notes': 'Aug 2023 - Post-peak sustained interest'
  },
  {
    'Appointment Month': '2023-09',
    'Appointments Completed': 26,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Sep 2023 - University health drives'
  },
  {
    'Appointment Month': '2023-10',
    'Appointments Completed': 23,
    'Barangay': 'San Vicente',
    'Source': 'CHO Manual Records',
    'Notes': 'Oct 2023 - Regular operations'
  },
  {
    'Appointment Month': '2023-11',
    'Appointments Completed': 29,
    'Barangay': 'Santa Cruz',
    'Source': 'CHO Manual Records',
    'Notes': 'Nov 2023 - Pre-World AIDS Day surge'
  },
  {
    'Appointment Month': '2023-12',
    'Appointments Completed': 36,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Dec 2023 - World AIDS Day peak'
  },

  // ==================== 2024 Historical Data (Current Year) ====================
  {
    'Appointment Month': '2024-01',
    'Appointments Completed': 16,
    'Barangay': 'Sindaton',
    'Source': 'CHO Manual Records',
    'Notes': 'Jan 2024 - Post-holiday period'
  },
  {
    'Appointment Month': '2024-02',
    'Appointments Completed': 20,
    'Barangay': 'Southern Davao',
    'Source': 'CHO Manual Records',
    'Notes': 'Feb 2024 - Valentine\'s health awareness'
  },
  {
    'Appointment Month': '2024-03',
    'Appointments Completed': 24,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Mar 2024 - Women\'s Month activities'
  },
  {
    'Appointment Month': '2024-04',
    'Appointments Completed': 21,
    'Barangay': 'Tagpore',
    'Source': 'CHO Manual Records',
    'Notes': 'Apr 2024 - Expanded barangay outreach'
  },
  {
    'Appointment Month': '2024-05',
    'Appointments Completed': 28,
    'Barangay': 'Tibungol',
    'Source': 'CHO Manual Records',
    'Notes': 'May 2024 - Pre-awareness month surge'
  },
  {
    'Appointment Month': '2024-06',
    'Appointments Completed': 40,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Jun 2024 - HIV Awareness Month (new record)'
  },
  {
    'Appointment Month': '2024-07',
    'Appointments Completed': 45,
    'Barangay': 'Upper Licanan',
    'Source': 'CHO Manual Records',
    'Notes': 'Jul 2024 - Peak testing (World AIDS Conference momentum)'
  },
  {
    'Appointment Month': '2024-08',
    'Appointments Completed': 35,
    'Barangay': 'A. O. Floirendo',
    'Source': 'CHO Manual Records',
    'Notes': 'Aug 2024 - Post-peak sustained volume'
  },
  {
    'Appointment Month': '2024-09',
    'Appointments Completed': 29,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Sep 2024 - School health programs'
  },
  {
    'Appointment Month': '2024-10',
    'Appointments Completed': 26,
    'Barangay': 'Buenavista',
    'Source': 'CHO Manual Records',
    'Notes': 'Oct 2024 - Community mobile testing'
  },
  {
    'Appointment Month': '2024-11',
    'Appointments Completed': 33,
    'Barangay': 'Cacao',
    'Source': 'CHO Manual Records',
    'Notes': 'Nov 2024 - Pre-World AIDS Day campaigns'
  },
  {
    'Appointment Month': '2024-12',
    'Appointments Completed': 42,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Dec 2024 - World AIDS Day surge'
  },
];

// Instructions sheet data
const instructionsData = [
  ['HIV TESTING & COUNSELING HISTORICAL DATA IMPORT TEMPLATE'],
  [''],
  ['🚀 QUICK START (FOR TESTING):'],
  ['  You can import this template AS-IS without any changes!'],
  ['  The "Data" sheet contains 60 valid sample records (2020-2024) ready for import.'],
  ['  This data is ideal for SARIMA prediction model training.'],
  ['  Just click "Import Excel" to test the functionality.'],
  [''],
  ['INSTRUCTIONS FOR REAL DATA:'],
  ['1. Open the "Data" sheet'],
  ['2. Delete all sample rows (rows 2-61)'],
  ['3. Fill in your actual HIV testing appointment data'],
  ['4. Maximum 1000 rows per import'],
  ['5. File size limit: 5MB'],
  ['6. Save and import'],
  [''],
  ['COLUMN DESCRIPTIONS:'],
  [''],
  ['Appointment Month (REQUIRED):'],
  ['  - Format: YYYY-MM (e.g., 2024-01)'],
  ['  - Must be in the past (cannot be future month)'],
  ['  - Represents the month when appointments were completed'],
  [''],
  ['Appointments Completed (REQUIRED):'],
  ['  - Must be a positive integer (1 or greater)'],
  ['  - Number of HIV testing appointments completed this month'],
  ['  - Cannot be 0, negative, or exceed 1000'],
  ['  - Only count successful/completed appointments'],
  [''],
  ['Barangay (OPTIONAL):'],
  ['  - Must match exact barangay name in the system'],
  ['  - Case-insensitive matching'],
  ['  - Leave blank for city-wide/aggregated data'],
  ['  - Examples: "Datu Abdul Dadia", "San Francisco (Poblacion)"'],
  ['  - See "Barangay List" sheet for valid barangays'],
  [''],
  ['Source (OPTIONAL):'],
  ['  - Reference to data source for audit trail'],
  ['  - Examples: "CHO Manual Records", "DOH Regional Data", "PMTCT Registry"'],
  [''],
  ['Notes (OPTIONAL):'],
  ['  - Additional information or context'],
  ['  - Examples: "World AIDS Day event", "Outreach program", "Community testing"'],
  [''],
  ['VALIDATION RULES:'],
  ['  ✓ Appointment Month must be in YYYY-MM format'],
  ['  ✓ Appointment Month cannot be in the future'],
  ['  ✓ Appointments Completed must be > 0 and <= 1000'],
  ['  ✓ Barangay name must exist in system (if provided)'],
  ['  ✓ Maximum 1000 records per import'],
  ['  ✓ File size must be under 5MB'],
  [''],
  ['ERROR HANDLING:'],
  ['  - The import will show detailed validation errors'],
  ['  - Errors include row number and specific field issues'],
  ['  - Fix all errors before importing'],
  ['  - Only valid records will be imported'],
  [''],
  ['EXAMPLE USE CASES:'],
  ['  1. Historical CHO records digitization'],
  ['  2. DOH regional data consolidation'],
  ['  3. PMTCT (Prevention of Mother-to-Child Transmission) records'],
  ['  4. Community outreach testing records'],
  ['  5. Training data for SARIMA prediction models'],
  [''],
  ['HIV-SPECIFIC NOTES:'],
  ['  - All HIV data is automatically encrypted in the system'],
  ['  - Only authorized HIV Admin users can view detailed records'],
  ['  - Data is used for SARIMA predictions and trend analysis'],
  ['  - Consider World AIDS Day (Dec 1) and awareness campaigns in patterns'],
];

// Barangay list (all 41 barangays in Panabo City)
const barangayListData = [
  ['VALID BARANGAY NAMES'],
  [''],
  ['Use these exact names in the "Barangay" column:'],
  ['(Leave blank for city-wide aggregated data)'],
  [''],
  ['A. O. Floirendo'],
  ['Buenavista'],
  ['Cacao'],
  ['Cagangohan'],
  ['Consolacion'],
  ['Dapco'],
  ['Datu Abdul Dadia'],
  ['Gredu'],
  ['J.P. Laurel'],
  ['Kasilak'],
  ['Katipunan'],
  ['Katualan'],
  ['Kauswagan'],
  ['Kiotoy'],
  ['Little Panay'],
  ['Lower Panaga (Roxas)'],
  ['Mabunao'],
  ['Maduao'],
  ['Malativas'],
  ['Manay'],
  ['Nanyo'],
  ['New Malaga (New Malitbog)'],
  ['New Pandan (Poblacion)'],
  ['New Visayas'],
  ['Quezon'],
  ['Salvacion'],
  ['San Francisco (Poblacion)'],
  ['San Nicolas'],
  ['San Pedro'],
  ['San Roque'],
  ['San Vicente'],
  ['Santa Cruz'],
  ['Santo Niño (Poblacion)'],
  ['Sindaton'],
  ['Southern Davao'],
  ['Tagpore'],
  ['Tibungol'],
  ['Upper Licanan'],
];

// Create workbook
const workbook = XLSX.utils.book_new();

// Add Instructions sheet
const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
// Set column widths for instructions
instructionsSheet['!cols'] = [{ wch: 80 }];
XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

// Add Data sheet with examples
const dataSheet = XLSX.utils.json_to_sheet(templateData);
// Set column widths for data sheet
dataSheet['!cols'] = [
  { wch: 20 }, // Appointment Month
  { wch: 22 }, // Appointments Completed
  { wch: 30 }, // Barangay
  { wch: 25 }, // Source
  { wch: 50 }, // Notes
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
  'hiv-appointment-import-template.xlsx'
);

// Ensure templates directory exists
const templatesDir = path.dirname(outputPath);
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

XLSX.writeFile(workbook, outputPath);

console.log('✓ HIV Testing Excel template created successfully!');
console.log(`  Location: ${outputPath}`);
console.log(`  Sheets: Instructions, Data (with ${templateData.length} sample records spanning 2020-2024), Barangay List`);
console.log('  Columns: Appointment Month, Appointments Completed, Barangay, Source, Notes');
console.log('  Ready for download at: /templates/hiv-appointment-import-template.xlsx');
