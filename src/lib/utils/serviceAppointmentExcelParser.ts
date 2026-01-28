/**
 * Excel/CSV Parser for Service Appointment Historical Data Import
 *
 * This module handles parsing and validation of Excel/CSV files containing
 * historical appointment data for HIV Testing & Counseling (service 16)
 * and Prenatal Checkup (service 17) services for SARIMA predictions.
 *
 * SIMPLIFIED (Jan 2025):
 * - Removed Status column (was misleading - all statuses were aggregated anyway)
 * - Now uses "Appointments Completed" directly
 * - Matches healthcard template pattern
 *
 * Supported formats: .xlsx, .xls, .csv
 * Max file size: 5MB (enforced in UI)
 * Max records per import: 1000 (enforced in API)
 */

import * as XLSX from 'xlsx';

/**
 * Normalizes date strings to YYYY-MM format for appointment_month
 * Handles various input formats from Excel/CSV
 */
function normalizeDateToMonth(dateValue: any): string {
  if (!dateValue) return '';

  const str = dateValue.toString().trim();

  // Already in YYYY-MM format
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(str)) {
    return str;
  }

  // Handle YYYY-MM-DD format (extract YYYY-MM)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str.substring(0, 7);
  }

  // Handle Excel serial date numbers
  if (!isNaN(Number(str)) && Number(str) > 10000) {
    const excelDate = XLSX.SSF.parse_date_code(Number(str));
    if (excelDate) {
      const year = excelDate.y;
      const month = String(excelDate.m).padStart(2, '0');
      return `${year}-${month}`;
    }
  }

  // Try to parse as a date string
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  // Return original if we can't parse it
  return str;
}

export interface ServiceAppointmentHistoricalRecord {
  appointment_month: string; // YYYY-MM format
  appointments_completed: number;
  barangay?: string;
  source?: string;
  notes?: string;
}

export interface ValidationError {
  row: number;
  errors: string[];
}

/**
 * Validates a single service appointment historical record
 * @param record - The record to validate
 * @param barangays - Array of valid barangays for lookup
 * @returns Array of error messages (empty if valid)
 */
export function validateServiceAppointmentRecord(
  record: ServiceAppointmentHistoricalRecord,
  barangays: Array<{ id: number; name: string; code: string }>
): string[] {
  const errors: string[] = [];

  // Validate appointment_month (required, YYYY-MM format)
  if (!record.appointment_month) {
    errors.push('Appointment Month is required');
  } else {
    // Check format YYYY-MM
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(record.appointment_month)) {
      errors.push('Invalid Appointment Month format. Use YYYY-MM (e.g., 2024-01)');
    } else {
      // Check if month is not in the future
      const [year, month] = record.appointment_month.split('-').map(Number);
      const recordDate = new Date(year, month - 1, 1);
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      if (recordDate > currentMonth) {
        errors.push('Appointment Month cannot be in the future');
      }
    }
  }

  // Validate appointments_completed (required, positive integer)
  if (record.appointments_completed === undefined || record.appointments_completed === null) {
    errors.push('Appointments Completed is required');
  } else {
    const count = Number(record.appointments_completed);
    if (!Number.isInteger(count) || count <= 0) {
      errors.push('Appointments Completed must be a positive integer');
    } else if (count > 1000) {
      errors.push('Appointments Completed cannot exceed 1000 per month');
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
 * Parses an Excel file and extracts service appointment historical records
 * @param file - The Excel file to parse
 * @param serviceId - Service ID (16 for HIV, 17 for Pregnancy)
 * @returns Promise with valid records and validation errors
 */
export async function parseServiceAppointmentExcel(
  file: File,
  serviceId: number
): Promise<{
  validRecords: ServiceAppointmentHistoricalRecord[];
  errors: ValidationError[];
}> {
  try {
    // Check if it's a CSV file - need different handling for encoding
    const isCSV = file.name.toLowerCase().endsWith('.csv');

    let workbook;
    if (isCSV) {
      // For CSV files, read as text with UTF-8 encoding to handle special characters
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
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return parseWorksheet(firstSheet, serviceId);
    }

    const worksheet = workbook.Sheets[sheetName];
    return parseWorksheet(worksheet, serviceId);
  } catch (error) {
    console.error('Excel parse error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to parse Excel file');
  }
}

/**
 * Parses a worksheet and extracts records
 * @param worksheet - XLSX worksheet object
 * @param serviceId - Service ID for validation context
 * @returns Object with valid records and errors
 */
async function parseWorksheet(
  worksheet: XLSX.WorkSheet,
  serviceId: number
): Promise<{
  validRecords: ServiceAppointmentHistoricalRecord[];
  errors: ValidationError[];
}> {
  // Convert worksheet to JSON (header row is first row)
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {
    header: 1, // Use array of arrays first to check headers
    raw: false, // Return formatted strings for dates
    defval: '', // Default value for empty cells
  });

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty');
  }

  // Expected headers (simplified - no Status column)
  const expectedHeaders = [
    'Appointment Month',
    'Appointments Completed',
    'Barangay',
    'Source',
    'Notes',
  ];

  // Check header row
  const headerRow = jsonData[0] as string[];
  const normalizedHeaders = headerRow.map((h) => String(h || '').trim());

  // Validate required headers are present (support multiple header formats)
  const hasDateColumn = normalizedHeaders.some(h =>
    ['Appointment Month', 'Record Date', 'appointment_month', 'record_date'].includes(h)
  );
  const hasCountColumn = normalizedHeaders.some(h =>
    ['Appointments Completed', 'appointments_completed'].includes(h)
  );

  if (!hasDateColumn || !hasCountColumn) {
    const missing = [];
    if (!hasDateColumn) missing.push('Record Date or Appointment Month');
    if (!hasCountColumn) missing.push('Appointments Completed');
    throw new Error(
      `Missing required columns: ${missing.join(', ')}. Please use the template.`
    );
  }

  // Fetch barangays for validation
  let barangays: Array<{ id: number; name: string; code: string }> = [];
  try {
    const response = await fetch('/api/barangays');
    const data = await response.json();
    if (data.success) {
      barangays = data.data || [];
    }
  } catch (err) {
    console.error('Failed to fetch barangays:', err);
    // Continue without barangay validation
  }

  // Parse data rows (skip header)
  const validRecords: ServiceAppointmentHistoricalRecord[] = [];
  const errors: ValidationError[] = [];

  // Convert to object array with proper headers
  const dataWithHeaders = XLSX.utils.sheet_to_json<any>(worksheet, {
    raw: false,
    defval: '',
  });

  dataWithHeaders.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because Excel is 1-indexed and we skip header

    // Skip completely empty rows
    if (
      !row['Appointment Month'] &&
      !row['Appointments Completed']
    ) {
      return;
    }

    // Map Excel/CSV columns to record fields
    // Support multiple header formats for flexibility
    const dateValue = row['Appointment Month'] || row['Record Date'] || row['appointment_month'] || row['record_date'] || '';
    const countValue = row['Appointments Completed'] || row['appointments_completed'] || '0';
    const barangayValue = row['Barangay'] || row['barangay'] || '';
    const sourceValue = row['Source'] || row['source'] || '';
    const notesValue = row['Notes'] || row['notes'] || '';

    const record: ServiceAppointmentHistoricalRecord = {
      appointment_month: normalizeDateToMonth(dateValue),
      appointments_completed: parseInt(countValue.toString() || '0', 10),
      barangay: barangayValue ? barangayValue.toString().trim() : undefined,
      source: sourceValue ? sourceValue.toString().trim() : undefined,
      notes: notesValue ? notesValue.toString().trim() : undefined,
    };

    // Validate record
    const validationErrors = validateServiceAppointmentRecord(record, barangays);

    if (validationErrors.length > 0) {
      errors.push({
        row: rowNumber,
        errors: validationErrors,
      });
    } else {
      validRecords.push(record);
    }
  });

  return { validRecords, errors };
}

/**
 * Validates the Excel file before parsing
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export function validateServiceAppointmentExcelFile(file: File): string | null {
  // Check file type (now supports CSV as well)
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv', // .csv (alternative MIME)
  ];

  if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
    return 'Invalid file type. Please upload an Excel or CSV file (.xlsx, .xls, or .csv)';
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return 'File size exceeds 5MB limit. Please reduce the file size or split into multiple files.';
  }

  return null;
}
