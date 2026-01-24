/**
 * Script to update disease-historical-import-template.xlsx
 * Removes the "Severity" column as it's now auto-calculated
 *
 * Run with: npx tsx scripts/update-disease-template.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const TEMPLATE_PATH = path.join(
  process.cwd(),
  'public',
  'templates',
  'disease-historical-import-template.xlsx'
);

const BACKUP_PATH = path.join(
  process.cwd(),
  'public',
  'templates',
  'disease-historical-import-template-backup.xlsx'
);

console.log('📝 Updating Disease Historical Import Template');
console.log('   Template path:', TEMPLATE_PATH);

// Step 1: Create backup
console.log('\n📦 Creating backup...');
if (fs.existsSync(TEMPLATE_PATH)) {
  fs.copyFileSync(TEMPLATE_PATH, BACKUP_PATH);
  console.log('   ✅ Backup created:', BACKUP_PATH);
} else {
  console.error('   ❌ Template file not found!');
  process.exit(1);
}

// Step 2: Read existing template
console.log('\n📂 Reading existing template...');
const workbook = XLSX.readFile(TEMPLATE_PATH);
const sheetNames = workbook.SheetNames;
console.log('   Available sheets:', sheetNames.join(', '));

// Process each sheet
sheetNames.forEach(sheetName => {
  console.log(`\n🔄 Processing sheet: "${sheetName}"`);

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

  if (data.length === 0) {
    console.log('   ⚠️  Sheet is empty, skipping');
    return;
  }

  // Check if this is the Data sheet with headers
  const headers = data[0] as string[];
  console.log('   Current columns:', headers.join(', '));

  // Find Severity column index
  const severityIndex = headers.findIndex(h =>
    h && h.toString().toLowerCase().includes('severity')
  );

  if (severityIndex === -1) {
    console.log('   ℹ️  No Severity column found, skipping');
    return;
  }

  console.log(`   ✂️  Found Severity column at index ${severityIndex}, removing...`);

  // Remove Severity column from all rows
  const updatedData = data.map(row => {
    const newRow = [...row];
    newRow.splice(severityIndex, 1);
    return newRow;
  });

  // Create new worksheet from updated data
  const newWorksheet = XLSX.utils.aoa_to_sheet(updatedData);

  // Replace worksheet in workbook
  workbook.Sheets[sheetName] = newWorksheet;

  // Log updated columns
  const newHeaders = updatedData[0] as string[];
  console.log('   ✅ Updated columns:', newHeaders.join(', '));
});

// Step 3: Save updated template
console.log('\n💾 Saving updated template...');
XLSX.writeFile(workbook, TEMPLATE_PATH);
console.log('   ✅ Template updated successfully!');

// Step 4: Verify changes
console.log('\n🔍 Verifying changes...');
const verifyWorkbook = XLSX.readFile(TEMPLATE_PATH);
const verifySheet = verifyWorkbook.Sheets[verifyWorkbook.SheetNames[0]];
const verifyData = XLSX.utils.sheet_to_json(verifySheet, { header: 1 }) as any[][];
const verifyHeaders = verifyData[0] as string[];

console.log('   Final columns:', verifyHeaders.join(', '));

// Check if Severity is still present
const stillHasSeverity = verifyHeaders.some(h =>
  h && h.toString().toLowerCase().includes('severity')
);

if (stillHasSeverity) {
  console.error('   ❌ Error: Severity column still present!');
  console.log('\n🔄 Restoring backup...');
  fs.copyFileSync(BACKUP_PATH, TEMPLATE_PATH);
  console.log('   ✅ Backup restored');
  process.exit(1);
} else {
  console.log('   ✅ Severity column successfully removed!');
}

console.log('\n🎉 Template update complete!');
console.log('\nExpected columns for disease import:');
console.log('   - Record Date (YYYY-MM-DD)');
console.log('   - Disease Type');
console.log('   - Custom Disease Name (optional, required if Disease Type = "Other")');
console.log('   - Case Count');
console.log('   - Barangay');
console.log('   - Source (optional)');
console.log('   - Notes (optional)');
console.log('\n⚠️  Note: Severity is now AUTO-CALCULATED using formula:');
console.log('   (Number of cases / Barangay population) × 100');
console.log('   - High risk (critical): ≥70%');
console.log('   - Medium risk (severe): 50-69%');
console.log('   - Low risk (moderate): <50%');
