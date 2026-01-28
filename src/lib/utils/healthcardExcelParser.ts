/**
 * Excel/CSV Parser for HealthCard Historical Data Import
 *
 * This module handles parsing and validation of Excel/CSV files containing
 * historical health card issuance data for bulk import into the system.
 *
 * Supported formats: .xlsx, .xls, .csv
 * Max file size: 5MB (enforced in UI)
 * Max records per import: 1000 (enforced in API)
 */

import * as XLSX from 'xlsx';
import { validateBarangayName, type Barangay } from './barangayMatcher';

/**
 * Normalizes date strings to YYYY-MM-DD format
 * Handles various input formats from Excel/CSV
 */
function normalizeDateString(dateValue: any): string {
  if (!dateValue) return '';

  const str = dateValue.toString().trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Handle Excel serial date numbers
  if (!isNaN(Number(str)) && Number(str) > 10000) {
    const excelDate = XLSX.SSF.parse_date_code(Number(str));
    if (excelDate) {
      const year = excelDate.y;
      const month = String(excelDate.m).padStart(2, '0');
      const day = String(excelDate.d).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // Try to parse as a date string (handles MM/DD/YYYY, DD/MM/YYYY, etc.)
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Return original if we can't parse it
  return str;
}

export interface HealthcardHistoricalRecord {
  record_date: string;
  healthcard_type: 'food_handler' | 'non_food' | 'pink';
  cards_issued: number;
  barangay?: string;
  source?: string;
  notes?: string;
}

export interface ValidationError {
  row: number;
  errors: string[];
}

/**
 * Validates a single healthcard historical record
 * @param record - The record to validate
 * @param barangays - Array of valid barangays for lookup
 * @returns Array of error messages (empty if valid)
 */
export function validateHealthcardHistoricalRecord(
  record: HealthcardHistoricalRecord,
  barangays: Barangay[]
): string[] {
  const errors: string[] = [];

  // Validate record_date (required)
  if (!record.record_date) {
    errors.push('Record Date is required');
  } else {
    // Try to parse date
    const date = new Date(record.record_date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid Record Date format. Use YYYY-MM-DD.');
    } else if (date > new Date()) {
      errors.push('Record Date cannot be in the future');
    }
  }

  // Validate healthcard_type (required)
  if (!record.healthcard_type) {
    errors.push('HealthCard Type is required');
  } else if (!['food_handler', 'non_food', 'pink'].includes(record.healthcard_type)) {
    errors.push('HealthCard Type must be "food_handler", "non_food", or "pink"');
  }

  // Validate cards_issued (required, positive integer)
  if (record.cards_issued === undefined || record.cards_issued === null) {
    errors.push('Cards Issued is required');
  } else {
    const cardsIssued = Number(record.cards_issued);
    if (!Number.isInteger(cardsIssued) || cardsIssued <= 0) {
      errors.push('Cards Issued must be a positive integer');
    }
  }

  // Validate barangay using fuzzy matcher (optional, but must exist if provided)
  if (record.barangay && record.barangay.trim() !== '') {
    const validation = validateBarangayName(record.barangay, barangays);
    if (!validation.isValid) {
      errors.push(validation.error!);
    }
  }

  return errors;
}

/**
 * Parses an Excel file and extracts healthcard historical records
 * @param file - The Excel file to parse
 * @returns Promise with valid records and validation errors
 */
export async function parseHealthcardExcel(file: File): Promise<{
  validRecords: HealthcardHistoricalRecord[];
  errors: ValidationError[];
}> {
  try {
    // Check if it's a CSV file - need different handling for encoding
    const isCSV = file.name.toLowerCase().endsWith('.csv');

    let workbook;
    if (isCSV) {
      // For CSV files, read as text with UTF-8 encoding to handle special characters (e.g., ñ)
      const text = await file.text();
      workbook = XLSX.read(text, { type: 'string', raw: false });
    } else {
      // For Excel files, read as array buffer
      const data = await file.arrayBuffer();
      workbook = XLSX.read(data, { type: 'array' });
    }

    // Get "Data" sheet (the template has Instructions, Data, Barangay List sheets)
    const sheetName = 'Data';
    if (!workbook.SheetNames.includes(sheetName)) {
      // Fallback to first sheet if "Data" sheet doesn't exist (for custom uploads)
      const fallbackSheet = workbook.SheetNames[0];
      if (!fallbackSheet) {
        throw new Error('Excel file has no sheets');
      }
      const sheet = workbook.Sheets[fallbackSheet];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (jsonData.length === 0) {
        throw new Error('Excel file is empty');
      }

      // Continue with fallback sheet...
      const validRecords: HealthcardHistoricalRecord[] = [];
      const errors: ValidationError[] = [];

      // Fetch barangays for validation (client-side API call)
      let barangays: Barangay[] = [];
      try {
        const response = await fetch('/api/barangays');
        if (response.ok) {
          const result = await response.json();
          barangays = result.data || [];
        } else {
          throw new Error('Failed to fetch barangays for validation');
        }
      } catch (err) {
        throw new Error('Cannot validate barangay names without server connection');
      }

      // Parse each row
      jsonData.forEach((row: any, index: number) => {
        // Try both header formats (with spaces and underscores)
        const record: HealthcardHistoricalRecord = {
          record_date: normalizeDateString(row['Record Date'] || row['record_date'] || ''),
          healthcard_type: (row['HealthCard Type'] || row['healthcard_type'] || '').toString().toLowerCase().trim() as 'food_handler' | 'non_food' | 'pink',
          cards_issued: parseInt(row['Cards Issued'] || row['cards_issued'] || '0'),
          barangay: (row['Barangay'] || row['barangay'] || '').toString().trim(),
          source: (row['Source'] || row['source'] || '').toString().trim(),
          notes: (row['Notes'] || row['notes'] || '').toString().trim(),
        };

        // Clean up empty optional fields
        if (!record.barangay) delete record.barangay;
        if (!record.source) delete record.source;
        if (!record.notes) delete record.notes;

        // Validate record
        const validationErrors = validateHealthcardHistoricalRecord(record, barangays);

        if (validationErrors.length > 0) {
          errors.push({
            row: index + 2, // +2 because: +1 for 0-indexed, +1 for header row
            errors: validationErrors,
          });
        } else {
          validRecords.push(record);
        }
      });

      return { validRecords, errors };
    }

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }

    const validRecords: HealthcardHistoricalRecord[] = [];
    const errors: ValidationError[] = [];

    // Fetch barangays for validation (client-side API call)
    let barangays: Barangay[] = [];
    try {
      const response = await fetch('/api/barangays');
      if (response.ok) {
        const result = await response.json();
        barangays = result.data || [];
      } else {
        throw new Error('Failed to fetch barangays for validation');
      }
    } catch (err) {
      throw new Error('Cannot validate barangay names without server connection');
    }

    // Parse each row
    jsonData.forEach((row: any, index: number) => {
      // Try both header formats (with spaces and underscores)
      const record: HealthcardHistoricalRecord = {
        record_date: normalizeDateString(row['Record Date'] || row['record_date'] || ''),
        healthcard_type: (row['HealthCard Type'] || row['healthcard_type'] || '').toString().toLowerCase().trim() as 'food_handler' | 'non_food' | 'pink',
        cards_issued: parseInt(row['Cards Issued'] || row['cards_issued'] || '0'),
        barangay: (row['Barangay'] || row['barangay'] || '').toString().trim(),
        source: (row['Source'] || row['source'] || '').toString().trim(),
        notes: (row['Notes'] || row['notes'] || '').toString().trim(),
      };

      // Clean up empty optional fields
      if (!record.barangay) delete record.barangay;
      if (!record.source) delete record.source;
      if (!record.notes) delete record.notes;

      // Validate record
      const validationErrors = validateHealthcardHistoricalRecord(record, barangays);

      if (validationErrors.length > 0) {
        errors.push({
          row: index + 2, // +2 because: +1 for 0-indexed, +1 for header row
          errors: validationErrors,
        });
      } else {
        validRecords.push(record);
      }
    });

    return { validRecords, errors };
  } catch (error: any) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Validates Excel file format and size before parsing
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export function validateHealthcardExcelFile(file: File): string | null {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv', // .csv (alternative MIME)
  ];

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
    return 'Invalid file format. Please upload an Excel or CSV file (.xlsx, .xls, or .csv)';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File size exceeds 5MB limit';
  }

  return null;
}
