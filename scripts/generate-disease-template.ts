/**
 * Script to generate Excel template for disease historical data import
 * Run with: npx tsx scripts/generate-disease-template.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Template data with 30 realistic test records
// Staff-accessible disease types: Dengue, Malaria, Measles, Animal Bite, Custom Disease
const templateData = [
  // Dengue cases (10 records)
  {
    'Record Date': '2024-01-15',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 5,
    'Barangay': 'A.O. Floirendo',
    'Source': 'DOH Region XI Bulletin',
    'Notes': 'Dengue cases during rainy season'
  },
  {
    'Record Date': '2024-02-20',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 3,
    'Barangay': 'Buenavista',
    'Source': 'CHO Daily Report',
    'Notes': 'Community outbreak alert issued'
  },
  {
    'Record Date': '2024-03-10',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 7,
    'Barangay': 'Gredu (Poblacion)',
    'Source': 'DOH Region XI Bulletin',
    'Notes': 'Urban area with high population density'
  },
  {
    'Record Date': '2024-04-05',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 4,
    'Barangay': 'Kasilak',
    'Source': 'CHO Daily Report',
    'Notes': ''
  },
  {
    'Record Date': '2024-05-12',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 6,
    'Barangay': 'Mabunao',
    'Source': 'DOH Region XI Bulletin',
    'Notes': 'Peak dengue season'
  },
  {
    'Record Date': '2024-06-18',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 8,
    'Barangay': 'New Pandan (Pob.)',
    'Source': 'CHO Daily Report',
    'Notes': 'Fogging operations conducted'
  },
  {
    'Record Date': '2024-07-22',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 5,
    'Barangay': 'San Francisco (Pob.)',
    'Source': 'DOH Region XI Bulletin',
    'Notes': ''
  },
  {
    'Record Date': '2024-08-14',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 4,
    'Barangay': 'Santo Niño (Pob.)',
    'Source': 'CHO Daily Report',
    'Notes': 'Continuing surveillance'
  },
  {
    'Record Date': '2024-09-30',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 3,
    'Barangay': 'Kasilak',
    'Source': 'DOH Region XI Bulletin',
    'Notes': 'Cases declining'
  },
  {
    'Record Date': '2024-11-08',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 2,
    'Barangay': 'Kauswagan',
    'Source': 'CHO Daily Report',
    'Notes': 'Post-rainy season monitoring'
  },

  // Malaria cases (5 records)
  {
    'Record Date': '2024-03-15',
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 2,
    'Barangay': 'Cacao',
    'Source': 'Provincial Health Office Report',
    'Notes': 'Endemic area surveillance'
  },
  {
    'Record Date': '2024-05-20',
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Barangay': 'Consolacion',
    'Source': 'Provincial Health Office Report',
    'Notes': ''
  },
  {
    'Record Date': '2024-07-10',
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 3,
    'Barangay': 'Dapco',
    'Source': 'DOH Malaria Control Program',
    'Notes': 'Agricultural workers affected'
  },
  {
    'Record Date': '2024-09-05',
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 2,
    'Barangay': 'Maduao',
    'Source': 'Provincial Health Office Report',
    'Notes': 'Treated with antimalarial drugs'
  },
  {
    'Record Date': '2024-10-25',
    'Disease Type': 'Malaria',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Barangay': 'Waterfall',
    'Source': 'Provincial Health Office Report',
    'Notes': 'Remote area case'
  },

  // Measles cases (7 records)
  {
    'Record Date': '2024-02-10',
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 4,
    'Barangay': 'Santo Niño (Pob.)',
    'Source': 'DOH Measles Surveillance',
    'Notes': 'Vaccination campaign initiated'
  },
  {
    'Record Date': '2024-03-18',
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 5,
    'Barangay': 'Santa Cruz',
    'Source': 'DOH Measles Surveillance',
    'Notes': 'School-age children affected'
  },
  {
    'Record Date': '2024-04-22',
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 3,
    'Barangay': 'Quezon',
    'Source': 'CHO Immunization Program',
    'Notes': ''
  },
  {
    'Record Date': '2024-05-15',
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 6,
    'Barangay': 'Salvacion',
    'Source': 'DOH Measles Surveillance',
    'Notes': 'Outbreak control measures applied'
  },
  {
    'Record Date': '2024-06-28',
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 4,
    'Barangay': 'San Vicente',
    'Source': 'DOH Measles Surveillance',
    'Notes': 'Contact tracing completed'
  },
  {
    'Record Date': '2024-08-12',
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 3,
    'Barangay': 'San Roque',
    'Source': 'CHO Immunization Program',
    'Notes': ''
  },
  {
    'Record Date': '2024-09-20',
    'Disease Type': 'Measles',
    'Custom Disease Name': '',
    'Case Count': 2,
    'Barangay': 'New Visayas',
    'Source': 'DOH Measles Surveillance',
    'Notes': 'Cases declining after vaccination'
  },

  // Animal Bite cases (6 records)
  {
    'Record Date': '2024-04-08',
    'Disease Type': 'Animal Bite',
    'Custom Disease Name': '',
    'Case Count': 3,
    'Barangay': 'Little Panay',
    'Source': 'Rabies Prevention Program Report',
    'Notes': 'Dog bite incidents'
  },
  {
    'Record Date': '2024-05-16',
    'Disease Type': 'Animal Bite',
    'Custom Disease Name': '',
    'Case Count': 2,
    'Barangay': 'New Malitbog',
    'Source': 'Rabies Prevention Program Report',
    'Notes': 'Post-exposure prophylaxis administered'
  },
  {
    'Record Date': '2024-07-05',
    'Disease Type': 'Animal Bite',
    'Custom Disease Name': '',
    'Case Count': 4,
    'Barangay': 'San Nicolas',
    'Source': 'CHO Animal Bite Center',
    'Notes': 'Stray dog population control needed'
  },
  {
    'Record Date': '2024-08-20',
    'Disease Type': 'Animal Bite',
    'Custom Disease Name': '',
    'Case Count': 1,
    'Barangay': 'San Pedro',
    'Source': 'Rabies Prevention Program Report',
    'Notes': ''
  },
  {
    'Record Date': '2024-10-10',
    'Disease Type': 'Animal Bite',
    'Custom Disease Name': '',
    'Case Count': 2,
    'Barangay': 'Tagpore',
    'Source': 'CHO Animal Bite Center',
    'Notes': 'Vaccination of pets encouraged'
  },
  {
    'Record Date': '2024-12-02',
    'Disease Type': 'Animal Bite',
    'Custom Disease Name': '',
    'Case Count': 3,
    'Barangay': 'Tibungol',
    'Source': 'Rabies Prevention Program Report',
    'Notes': 'Recent cases monitored'
  },

  // Custom Disease cases (2 records)
  {
    'Record Date': '2024-07-25',
    'Disease Type': 'Custom Disease',
    'Custom Disease Name': 'Leptospirosis',
    'Case Count': 3,
    'Barangay': 'Southern Davao',
    'Source': 'CHO Special Disease Monitoring',
    'Notes': 'Flooding-related cases'
  },
  {
    'Record Date': '2024-11-15',
    'Disease Type': 'Custom Disease',
    'Custom Disease Name': 'Hand-Foot-Mouth Disease',
    'Case Count': 2,
    'Barangay': 'Upper Licanan',
    'Source': 'CHO Special Disease Monitoring',
    'Notes': 'Daycare center outbreak'
  }
];

// Instructions sheet data
const instructionsData = [
  ['DISEASE HISTORICAL DATA IMPORT TEMPLATE'],
  [''],
  ['INSTRUCTIONS:'],
  ['1. Fill in your disease data in the "Data" sheet'],
  ['2. Delete the example rows before importing'],
  ['3. Maximum 1000 rows per import'],
  ['4. File size limit: 5MB'],
  ['5. Save as .xlsx or .xls format'],
  [''],
  ['COLUMN DESCRIPTIONS:'],
  [''],
  ['Record Date (REQUIRED):'],
  ['  - Format: YYYY-MM-DD (e.g., 2024-01-15) or MM/DD/YYYY'],
  ['  - Must be in the past (cannot be future date)'],
  ['  - Excel date format is also supported'],
  [''],
  ['Disease Type (REQUIRED):'],
  ['  - Must be one of: Dengue, Malaria, Measles, Animal Bite, Custom Disease'],
  ['  - Case-insensitive (e.g., "dengue" or "Dengue" both work)'],
  ['  - Note: HIV/AIDS and Pregnancy Complications are restricted for Healthcare Admins only'],
  [''],
  ['Custom Disease Name (CONDITIONAL):'],
  ['  - Required ONLY if Disease Type = "Custom Disease"'],
  ['  - Leave blank for standard disease types'],
  ['  - Example: "Leptospirosis", "Hand-Foot-Mouth Disease", "Typhoid Fever"'],
  [''],
  ['Case Count (REQUIRED):'],
  ['  - Must be a positive integer (1 or greater)'],
  ['  - Number of confirmed cases for this record'],
  [''],
  ['Barangay (REQUIRED):'],
  ['  - Must match exact barangay name in the system'],
  ['  - Case-insensitive matching'],
  ['  - Examples: "Datu Abdul Dadia", "San Francisco", "Poblacion"'],
  ['  - See "Barangay List" sheet for valid barangays'],
  [''],
  ['Source (OPTIONAL):'],
  ['  - Reference to data source'],
  ['  - Examples: "Health Center Report", "Laboratory Confirmation", "Clinic Records"'],
  ['  - Defaults to "Excel Import" if left blank'],
  [''],
  ['Notes (OPTIONAL):'],
  ['  - Additional information or comments'],
  ['  - Any relevant details about this record'],
  [''],
  ['VALIDATION RULES:'],
  ['  ✓ All dates must be in the past'],
  ['  ✓ Case Count must be > 0'],
  ['  ✓ Disease Type must match allowed values'],
  ['  ✓ Barangay name must exist in system'],
  ['  ✓ Custom Disease Name required when Disease Type = "Custom Disease"'],
  [''],
  ['ERROR HANDLING:'],
  ['  - The import will show detailed validation errors'],
  ['  - Errors include row number and specific field issues'],
  ['  - Fix all errors before importing'],
  ['  - Only valid records will be imported'],
];

// Barangay list (all 41 barangays in Panabo City - from Supabase database)
const barangayListData = [
  ['VALID BARANGAY NAMES (41 total)'],
  [''],
  ['Use these exact names in the "Barangay" column:'],
  [''],
  ['A.O. Floirendo'],
  ['Buenavista'],
  ['Cacao'],
  ['Cagangohan'],
  ['Consolacion'],
  ['Dapco'],
  ['Datu Abdul Dadia'],
  ['Gredu (Poblacion)'],
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
  ['New Malaga (Dalisay)'],
  ['New Malitbog'],
  ['New Pandan (Pob.)'],
  ['New Visayas'],
  ['Outside Zone'],
  ['Quezon'],
  ['Salvacion'],
  ['San Francisco (Pob.)'],
  ['San Nicolas'],
  ['San Pedro'],
  ['San Roque'],
  ['San Vicente'],
  ['Santa Cruz'],
  ['Santo Niño (Pob.)'],
  ['Sindaton'],
  ['Southern Davao'],
  ['Tagpore'],
  ['Tibungol'],
  ['Upper Licanan'],
  ['Waterfall'],
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
  { wch: 25 }, // Disease Type
  { wch: 25 }, // Custom Disease Name
  { wch: 12 }, // Case Count
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
  'disease-historical-import-template.xlsx'
);

XLSX.writeFile(workbook, outputPath);

console.log('✅ Excel template created successfully!');
console.log(`📁 Location: ${outputPath}`);
console.log('📊 Sheets: Instructions, Data (with 30 test records), Barangay List (41 barangays)');
console.log('🏥 Disease Types: Dengue (10), Malaria (5), Measles (7), Animal Bite (6), Custom Disease (2)');
console.log('📅 Date Range: January 2024 - December 2024');
console.log('📍 Barangays: 17 unique barangays across Panabo City');
console.log('✨ Staff can download and immediately test import with pre-filled data!');
console.log('🌐 Download URL: /templates/disease-historical-import-template.xlsx');
