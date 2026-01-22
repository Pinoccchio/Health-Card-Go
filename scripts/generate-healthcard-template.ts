/**
 * Script to generate Excel template for healthcard historical data import
 * Run with: npx tsx scripts/generate-healthcard-template.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Template data with VALID, IMPORTABLE examples
// These records can be imported directly for testing without modification
// Using historical dates (2020-2022) to avoid double-counting with live appointment data
// System began tracking appointments in 2023, so these are pre-system historical records
const templateData = [
  // 2020 Historical Data (Pre-System)
  {
    'Record Date': '2020-03-15',
    'HealthCard Type': 'food_handler',
    'Cards Issued': 45,
    'Barangay': 'Datu Abdul Dadia',
    'Source': 'CHO Manual Records',
    'Notes': 'Q1 2020 - Pre-pandemic batch'
  },
  {
    'Record Date': '2020-06-10',
    'HealthCard Type': 'non_food',
    'Cards Issued': 32,
    'Barangay': 'Gredu',
    'Source': 'CHO Manual Records',
    'Notes': 'Q2 2020 - Limited operations due to COVID-19'
  },
  {
    'Record Date': '2020-09-20',
    'HealthCard Type': 'food_handler',
    'Cards Issued': 38,
    'Barangay': '',
    'Source': 'DOH Regional Data',
    'Notes': 'Q3 2020 - Gradual reopening of food establishments'
  },
  {
    'Record Date': '2020-12-05',
    'HealthCard Type': 'non_food',
    'Cards Issued': 28,
    'Barangay': '',
    'Source': 'CHO Manual Records',
    'Notes': 'Q4 2020 - Year-end processing'
  },

  // 2021 Historical Data (Pre-System)
  {
    'Record Date': '2021-02-14',
    'HealthCard Type': 'food_handler',
    'Cards Issued': 52,
    'Barangay': 'New Pandan (Poblacion)',
    'Source': 'CHO Manual Records',
    'Notes': 'Q1 2021 - Recovery period processing'
  },
  {
    'Record Date': '2021-05-22',
    'HealthCard Type': 'non_food',
    'Cards Issued': 41,
    'Barangay': 'San Francisco (Poblacion)',
    'Source': 'DOH Regional Data',
    'Notes': 'Q2 2021 - Increased applications'
  },
  {
    'Record Date': '2021-08-18',
    'HealthCard Type': 'food_handler',
    'Cards Issued': 47,
    'Barangay': '',
    'Source': 'CHO Manual Records',
    'Notes': 'Q3 2021 - Surge in food handler certifications'
  },
  {
    'Record Date': '2021-11-10',
    'HealthCard Type': 'non_food',
    'Cards Issued': 35,
    'Barangay': 'Kasilak',
    'Source': 'CHO Manual Records',
    'Notes': 'Q4 2021 - Year-end batch'
  },

  // 2022 Historical Data (Pre-System)
  {
    'Record Date': '2022-01-25',
    'HealthCard Type': 'food_handler',
    'Cards Issued': 58,
    'Barangay': '',
    'Source': 'CHO Manual Records',
    'Notes': 'Q1 2022 - High demand from restaurants'
  },
  {
    'Record Date': '2022-04-12',
    'HealthCard Type': 'non_food',
    'Cards Issued': 44,
    'Barangay': 'Dapco',
    'Source': 'DOH Regional Data',
    'Notes': 'Q2 2022 - Office workers returning'
  },
  {
    'Record Date': '2022-07-08',
    'HealthCard Type': 'food_handler',
    'Cards Issued': 63,
    'Barangay': 'Mabunao',
    'Source': 'CHO Manual Records',
    'Notes': 'Q3 2022 - Peak season processing'
  },
  {
    'Record Date': '2022-10-15',
    'HealthCard Type': 'non_food',
    'Cards Issued': 39,
    'Barangay': '',
    'Source': 'CHO Manual Records',
    'Notes': 'Q4 2022 - Final pre-system batch'
  },
];

// Instructions sheet data
const instructionsData = [
  ['HEALTHCARD HISTORICAL DATA IMPORT TEMPLATE'],
  [''],
  ['🚀 QUICK START (FOR TESTING):'],
  ['  You can import this template AS-IS without any changes!'],
  ['  The "Data" sheet contains 8 valid sample records ready for import.'],
  ['  Just click "Import Excel" to test the functionality.'],
  [''],
  ['INSTRUCTIONS FOR REAL DATA:'],
  ['1. Open the "Data" sheet'],
  ['2. Delete all sample rows (rows 2-9)'],
  ['3. Fill in your actual healthcard data'],
  ['4. Maximum 1000 rows per import'],
  ['5. File size limit: 5MB'],
  ['6. Save and import'],
  [''],
  ['COLUMN DESCRIPTIONS:'],
  [''],
  ['Record Date (REQUIRED):'],
  ['  - Format: YYYY-MM-DD (e.g., 2024-01-15)'],
  ['  - Must be in the past (cannot be future date)'],
  ['  - Excel date format is also supported'],
  [''],
  ['HealthCard Type (REQUIRED):'],
  ['  - Must be one of: food_handler, non_food'],
  ['  - Case-insensitive (e.g., "Food_Handler" or "food_handler" both work)'],
  ['  - food_handler: For food industry workers (restaurants, cafes, food stalls)'],
  ['  - non_food: For non-food industry workers (offices, retail, etc.)'],
  [''],
  ['Cards Issued (REQUIRED):'],
  ['  - Must be a positive integer (1 or greater)'],
  ['  - Number of healthcards issued on this date'],
  ['  - Cannot be 0 or negative'],
  [''],
  ['Barangay (OPTIONAL):'],
  ['  - Must match exact barangay name in the system'],
  ['  - Case-insensitive matching'],
  ['  - Leave blank for system-wide data (no specific barangay)'],
  ['  - Examples: "Datu Abdul Dadia", "San Francisco", "Poblacion"'],
  ['  - See "Barangay List" sheet for valid barangays'],
  [''],
  ['Source (OPTIONAL):'],
  ['  - Reference to data source'],
  ['  - Examples: "CHO Manual Count", "DOH Bulletin", "CHO Records"'],
  ['  - Useful for audit trail and data provenance'],
  [''],
  ['Notes (OPTIONAL):'],
  ['  - Additional information or comments'],
  ['  - Any relevant details about this record'],
  ['  - Examples: "January batch", "Q1 2024 data", "Walk-in processing"'],
  [''],
  ['VALIDATION RULES:'],
  ['  ✓ All dates must be in the past'],
  ['  ✓ Cards Issued must be > 0 (positive integer)'],
  ['  ✓ HealthCard Type must be "food_handler" or "non_food"'],
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
  ['  3. Monthly/quarterly batch imports'],
  ['  4. Training data for SARIMA prediction models'],
];

// Barangay list (all 41 barangays in Panabo City)
const barangayListData = [
  ['VALID BARANGAY NAMES'],
  [''],
  ['Use these exact names in the "Barangay" column:'],
  ['(Leave blank for system-wide data)'],
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
  { wch: 15 }, // Record Date
  { wch: 18 }, // HealthCard Type
  { wch: 15 }, // Cards Issued
  { wch: 30 }, // Barangay
  { wch: 30 }, // Source
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
  'healthcard-historical-import-template.xlsx'
);

XLSX.writeFile(workbook, outputPath);

console.log('✓ HealthCard Excel template created successfully!');
console.log(`  Location: ${outputPath}`);
console.log('  Sheets: Instructions, Data (with examples), Barangay List');
console.log('  Ready for download at: /templates/healthcard-historical-import-template.xlsx');
