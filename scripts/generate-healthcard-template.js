/**
 * Generate HealthCard Historical Import Excel Template with Pink Card Support
 *
 * This script creates an Excel template with:
 * - Instructions sheet
 * - Data sheet with examples (Yellow, Green, Pink cards)
 * - Barangay List sheet
 */

const XLSX = require('xlsx');

// Instructions Sheet
const instructions = [
  ['HealthCard Historical Data Import Template'],
  [''],
  ['INSTRUCTIONS:'],
  ['1. Fill out the "Data" sheet with your historical healthcard statistics'],
  ['2. Required fields: Record Date, HealthCard Type, Cards Issued'],
  ['3. Optional fields: Barangay, Source, Notes'],
  ['4. Valid HealthCard Types: food_handler, non_food, pink'],
  ['5. Date format: YYYY-MM-DD (e.g., 2025-01-15)'],
  ['6. Barangay names must match exactly (see "Barangay List" sheet)'],
  ['7. Maximum 1000 records per import'],
  ['8. File size limit: 5MB'],
  [''],
  ['HEALTHCARD TYPES:'],
  ['Type', 'Display Name', 'Description'],
  ['food_handler', 'Yellow Card - General', 'Health certification for food handlers and restaurant workers'],
  ['non_food', 'Green Card - General', 'Health certification for non-food industry workers'],
  ['pink', 'Pink Card - Service/Clinical', 'Health certification for service and clinical workers'],
  [''],
  ['TIPS:'],
  ['- Leave Barangay blank for system-wide data (not specific to one barangay)'],
  ['- Use Source to track where the data came from (e.g., "CHO Manual Count", "DOH Bulletin")'],
  ['- Add Notes for any special information about the record'],
  ['- Do not modify column headers in the Data sheet'],
];

// Data Sheet with examples
const dataHeaders = ['Record Date', 'HealthCard Type', 'Cards Issued', 'Barangay', 'Source', 'Notes'];
const dataExamples = [
  ['2025-01-15', 'food_handler', '45', 'Dapco', 'CHO Manual Count', 'Regular monthly count'],
  ['2025-01-10', 'non_food', '23', 'Gredu', 'CHO Database Export', 'Including backlog entries'],
  ['2025-01-08', 'pink', '12', 'New Pandan', 'CHO Manual Count', 'Service workers certification'],
  ['2024-12-20', 'food_handler', '67', '', 'DOH Bulletin', 'System-wide data (no specific barangay)'],
  ['2024-12-15', 'non_food', '34', 'Poblacion', 'CHO Records', ''],
  ['2024-12-10', 'pink', '18', 'Kasilak', 'CHO Manual Count', 'Clinical workers health screening'],
];

const dataSheet = [dataHeaders, ...dataExamples];

// Barangay List Sheet
const barangayHeaders = ['Barangay Name', 'Code', 'Notes'];
const barangays = [
  ['A. O. Floirendo', 'AOF', 'Use exact name when importing'],
  ['Dapco', 'DAP', ''],
  ['Gredu', 'GRE', ''],
  ['J.P. Laurel', 'JPL', ''],
  ['Kasilak', 'KAS', ''],
  ['Katipunan', 'KAT', ''],
  ['Kauswagan', 'KAU', ''],
  ['Katualan', 'KAA', ''],
  ['Kiotoy', 'KIO', ''],
  ['Lower Licanan', 'LLI', ''],
  ['Mabunao', 'MAB', ''],
  ['Maduao', 'MAD', ''],
  ['Malativas', 'MAL', ''],
  ['Manay', 'MAN', ''],
  ['Nanyo', 'NAN', ''],
  ['New Malaga', 'NMA', ''],
  ['New Malitbog', 'NMB', ''],
  ['New Pandan', 'NPA', ''],
  ['New Visayas', 'NVI', ''],
  ['Poblacion', 'POB', ''],
  ['San Francisco', 'SFR', ''],
  ['San Nicolas', 'SNI', ''],
  ['San Pedro', 'SPE', ''],
  ['San Roque', 'SRO', ''],
  ['San Vicente', 'SVI', ''],
  ['Santa Cruz', 'SCR', ''],
  ['Santo Niño', 'SNO', ''],
  ['Sindaton', 'SIN', ''],
  ['Southern Davao', 'SDA', ''],
  ['Tibungol', 'TIB', ''],
  ['Upper Licanan', 'ULI', ''],
  ['Waterfall', 'WAT', ''],
  ['Buenavista', 'BUE', ''],
  ['Cacao', 'CAC', ''],
  ['Consolacion', 'CON', ''],
  ['Datu Balong', 'DBA', ''],
  ['Little Panay', 'LPA', ''],
  ['Lower Panaga', 'LPG', ''],
  ['Magsaysay', 'MAG', ''],
  ['Quezon', 'QUE', ''],
  ['Salvacion', 'SAL', ''],
];

const barangaySheet = [barangayHeaders, ...barangays];

// Create workbook
const wb = XLSX.utils.book_new();

// Add Instructions sheet
const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
wsInstructions['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 60 }];
XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

// Add Data sheet
const wsData = XLSX.utils.aoa_to_sheet(dataSheet);
wsData['!cols'] = [
  { wch: 15 }, // Record Date
  { wch: 18 }, // HealthCard Type
  { wch: 12 }, // Cards Issued
  { wch: 20 }, // Barangay
  { wch: 25 }, // Source
  { wch: 40 }, // Notes
];

// Style header row (make it bold)
const dataHeaderRange = XLSX.utils.decode_range(wsData['!ref']);
for (let col = dataHeaderRange.s.c; col <= dataHeaderRange.e.c; col++) {
  const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
  if (!wsData[cellAddress]) continue;
  if (!wsData[cellAddress].s) wsData[cellAddress].s = {};
  wsData[cellAddress].s.font = { bold: true };
}

XLSX.utils.book_append_sheet(wb, wsData, 'Data');

// Add Barangay List sheet
const wsBarangay = XLSX.utils.aoa_to_sheet(barangaySheet);
wsBarangay['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 40 }];
XLSX.utils.book_append_sheet(wb, wsBarangay, 'Barangay List');

// Write file
const outputPath = 'C:\\Users\\User\\Documents\\first_year_files\\folder_for_jobs\\HealthCard\\Health-Card-Go\\public\\templates\\healthcard-historical-import-template.xlsx';
XLSX.writeFile(wb, outputPath);

console.log('✅ HealthCard template generated successfully!');
console.log('📄 File:', outputPath);
console.log('📊 Sheets: Instructions, Data (with Yellow/Green/Pink examples), Barangay List');
