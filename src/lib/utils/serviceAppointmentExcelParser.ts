/**
 * Excel Parser for Service Appointment Historical Data Import
 *
 * This module handles parsing and validation of Excel files containing
 * historical appointment data for HIV Testing & Counseling (service 16)
 * and Prenatal Checkup (service 17) services for SARIMA predictions.
 *
 * Supported formats: .xlsx, .xls
 * Max file size: 5MB (enforced in UI)
 * Max records per import: 1000 (enforced in API)
 */

import * as XLSX from 'xlsx';

export interface ServiceAppointmentHistoricalRecord {
  appointment_month: string; // YYYY-MM format
  status: 'completed' | 'cancelled' | 'no_show';
  appointment_count: number;
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

  // Validate status (required)
  if (!record.status) {
    errors.push('Status is required');
  } else if (!['completed', 'cancelled', 'no_show'].includes(record.status)) {
    errors.push('Status must be "completed", "cancelled", or "no_show"');
  }

  // Validate appointment_count (required, positive integer)
  if (record.appointment_count === undefined || record.appointment_count === null) {
    errors.push('Appointment Count is required');
  } else {
    const count = Number(record.appointment_count);
    if (!Number.isInteger(count) || count <= 0) {
      errors.push('Appointment Count must be a positive integer');
    } else if (count > 1000) {
      errors.push('Appointment Count cannot exceed 1000 per month');
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
    // Read file as array buffer
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

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

  // Expected headers
  const expectedHeaders = [
    'Appointment Month',
    'Status',
    'Appointment Count',
    'Barangay',
    'Source',
    'Notes',
  ];

  // Check header row
  const headerRow = jsonData[0] as string[];
  const normalizedHeaders = headerRow.map((h) => String(h || '').trim());

  // Validate required headers are present
  const requiredHeaders = ['Appointment Month', 'Status', 'Appointment Count'];
  const missingHeaders = requiredHeaders.filter(
    (h) => !normalizedHeaders.includes(h)
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required columns: ${missingHeaders.join(', ')}. Please use the template.`
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
      !row['Status'] &&
      !row['Appointment Count']
    ) {
      return;
    }

    // Map Excel columns to record fields
    const record: ServiceAppointmentHistoricalRecord = {
      appointment_month: (row['Appointment Month'] || '').toString().trim(),
      status: (row['Status'] || '').toString().trim().toLowerCase() as any,
      appointment_count: parseInt(row['Appointment Count'] || '0', 10),
      barangay: row['Barangay'] ? row['Barangay'].toString().trim() : undefined,
      source: row['Source'] ? row['Source'].toString().trim() : undefined,
      notes: row['Notes'] ? row['Notes'].toString().trim() : undefined,
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
  // Check file type
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
  ];

  if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
    return 'Invalid file type. Please upload an Excel file (.xlsx or .xls)';
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return 'File size exceeds 5MB limit. Please reduce the file size or split into multiple files.';
  }

  return null;
}
