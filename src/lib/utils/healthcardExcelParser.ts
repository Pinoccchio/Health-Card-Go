/**
 * Excel Parser for HealthCard Historical Data Import
 *
 * This module handles parsing and validation of Excel files containing
 * historical health card issuance data for bulk import into the system.
 *
 * Supported formats: .xlsx, .xls
 * Max file size: 5MB (enforced in UI)
 * Max records per import: 1000 (enforced in API)
 */

import * as XLSX from 'xlsx';

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
  barangays: Array<{ id: number; name: string; code: string }>
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

  // Validate barangay (optional, but must exist if provided)
  if (record.barangay && record.barangay.trim() !== '') {
    const barangayExists = barangays.some(
      (b) => b.name.toLowerCase() === record.barangay!.toLowerCase().trim()
    );
    if (!barangayExists) {
      errors.push(`Barangay "${record.barangay}" not found. Check spelling.`);
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
    // Read file as array buffer
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

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
      let barangays: Array<{ id: number; name: string; code: string }> = [];
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
          record_date: (row['Record Date'] || row['record_date'] || '').toString().trim(),
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
    let barangays: Array<{ id: number; name: string; code: string }> = [];
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
        record_date: (row['Record Date'] || row['record_date'] || '').toString().trim(),
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
  ];

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
    return 'Invalid file format. Please upload an Excel file (.xlsx or .xls)';
  }

  if (file.size > MAX_FILE_SIZE) {
    return 'File size exceeds 5MB limit';
  }

  return null;
}
