/**
 * Script to generate Excel template for disease historical data import
 * Run with: npx tsx scripts/generate-disease-template.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Template data with examples
const templateData = [
  {
    'Record Date': '2024-01-15',
    'Disease Type': 'Dengue',
    'Custom Disease Name': '',
    'Case Count': 5,
    'Barangay': 'Datu Abdul Dadia',
    'Source': 'Health Center Report',
    'Notes': 'Example record - delete this row before importing your data'
  },
  {
    'Record Date': '2024-01-20',
    'Disease Type': 'HIV/AIDS',
    'Custom Disease Name': '',
    'Case Count': 2,
    'Barangay': 'San Francisco',
    'Source': 'Laboratory Confirmation',
    'Notes': 'Another example - replace with your actual data'
  },
  {
    'Record Date': '2024-02-01',
    'Disease Type': 'Other',
    'Custom Disease Name': 'Typhoid Fever',
    'Case Count': 3,
    'Barangay': 'Poblacion',
    'Source': 'Clinic Records',
    'Notes': 'For "Other" disease type, Custom Disease Name is required'
  },
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
  ['  - Must be one of: HIV/AIDS, Dengue, Malaria, Measles, Rabies, Pregnancy Complications, Other'],
  ['  - Case-insensitive (e.g., "dengue" or "Dengue" both work)'],
  [''],
  ['Custom Disease Name (CONDITIONAL):'],
  ['  - Required ONLY if Disease Type = "Other"'],
  ['  - Leave blank for standard disease types'],
  ['  - Example: "Typhoid Fever", "Leptospirosis"'],
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
  ['  ✓ Custom Disease Name required when Disease Type = "Other"'],
  [''],
  ['ERROR HANDLING:'],
  ['  - The import will show detailed validation errors'],
  ['  - Errors include row number and specific field issues'],
  ['  - Fix all errors before importing'],
  ['  - Only valid records will be imported'],
];

// Barangay list (all 41 barangays in Panabo City)
const barangayListData = [
  ['VALID BARANGAY NAMES'],
  [''],
  ['Use these exact names in the "Barangay" column:'],
  [''],
  ['A. Bonifacio'],
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

console.log('✓ Excel template created successfully!');
console.log(`  Location: ${outputPath}`);
console.log('  Sheets: Instructions, Data (with examples), Barangay List');
console.log('  Ready for download at: /templates/disease-historical-import-template.xlsx');
