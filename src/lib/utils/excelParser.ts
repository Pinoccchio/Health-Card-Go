/**
 * Excel Parser Utility for Disease Historical Data Import
 *
 * Parses Excel files containing disease statistics and validates data
 * before batch insertion into the database.
 */

import * as XLSX from 'xlsx';
import { DISEASE_TYPE_LABELS } from '@/lib/constants/diseaseConstants';

export interface HistoricalRecord {
  record_date: string;           // ISO date string (YYYY-MM-DD)
  disease_type: string;          // Must match DISEASE_TYPE_LABELS keys
  custom_disease_name?: string;  // Required if disease_type = 'other'
  case_count: number;            // Must be > 0
  // severity removed - now auto-calculated using formula: (cases/population) × 100
  barangay_id: number;           // FK to barangays table
  barangay_name?: string;        // For display only (not inserted)
  source?: string;               // Optional source reference
  notes?: string;                // Optional additional notes
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

export interface ParseResult {
  success: boolean;
  records: HistoricalRecord[];
  errors: ValidationError[];
  warnings: ValidationError[];
  totalRows: number;
  validRows: number;
}

/**
 * Parse Excel file and extract disease historical data
 */
export async function parseDiseasesExcel(
  file: File,
  barangays: Array<{ id: number; name: string; code: string }>
): Promise<ParseResult> {
  const result: ParseResult = {
    success: false,
    records: [],
    errors: [],
    warnings: [],
    totalRows: 0,
    validRows: 0,
  };

  try {
    console.log('📂 Starting Excel file parsing...');
    console.log(`   File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    console.log(`📊 Excel workbook loaded successfully`);
    console.log(`   Available sheets: ${workbook.SheetNames.join(', ')}`);

    // Look for the "Data" sheet specifically (template has Instructions, Data, Barangay List sheets)
    let sheetName = workbook.SheetNames.find(name => name === 'Data');

    if (sheetName) {
      console.log(`✅ Found "Data" sheet - using it for import`);
    } else {
      console.log(`⚠️  No "Data" sheet found, searching for valid data sheet...`);
      // Fallback: If no "Data" sheet, try to find first sheet with required columns
      for (const name of workbook.SheetNames) {
        const ws = workbook.Sheets[name];
        const testData = XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' });
        if (testData.length > 0 && testData[0]['Record Date']) {
          sheetName = name;
          console.log(`✅ Using sheet "${sheetName}" for data import`);
          break;
        }
      }
    }

    if (!sheetName) {
      console.error(`❌ No valid data sheet found in workbook`);
      result.errors.push({
        row: 0,
        field: 'file',
        message: 'Excel file must contain a "Data" sheet with the required columns. Please use the template file.',
      });
      return result;
    }

    const worksheet = workbook.Sheets[sheetName];
    console.log(`📋 Reading data from sheet: "${sheetName}"`);

    // Convert sheet to JSON (header row = 1)
    const data: any[] = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });

    result.totalRows = data.length;
    console.log(`📝 Parsed ${data.length} data rows from Excel`);

    if (data.length === 0) {
      console.error(`❌ No data rows found in sheet`);
      result.errors.push({
        row: 0,
        field: 'file',
        message: 'Excel file contains no data rows',
      });
      return result;
    }

    // Check for maximum rows limit (prevent excessive imports)
    if (data.length > 1000) {
      console.error(`❌ Too many rows: ${data.length} (max 1000)`);
      result.errors.push({
        row: 0,
        field: 'file',
        message: `Too many rows (${data.length}). Maximum 1000 rows per import.`,
      });
      return result;
    }

    // Validate required columns exist
    const requiredColumns = ['Record Date', 'Disease Type', 'Case Count', 'Barangay'];
    const firstRow = data[0];
    const availableColumns = Object.keys(firstRow);
    console.log(`🔍 Validating columns...`);
    console.log(`   Required: ${requiredColumns.join(', ')}`);
    console.log(`   Found: ${availableColumns.join(', ')}`);

    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
      console.error(`❌ Missing required columns: ${missingColumns.join(', ')}`);
      result.errors.push({
        row: 0,
        field: 'columns',
        message: `Missing required columns: ${missingColumns.join(', ')}. Please use the template file.`,
      });
      return result;
    }

    console.log(`✅ All required columns found`);
    console.log(`\n🔄 Starting row-by-row validation...`);

    // Parse each row
    for (let i = 0; i < data.length; i++) {
      const rowNum = i + 2; // +2 because Excel is 1-indexed and has header row
      const row = data[i];

      // Parse record
      const record: Partial<HistoricalRecord> = {};
      const rowErrors: ValidationError[] = [];

      // Parse Record Date
      try {
        const dateStr = row['Record Date'];
        if (!dateStr) {
          rowErrors.push({
            row: rowNum,
            field: 'Record Date',
            message: 'Record Date is required',
            value: dateStr,
          });
        } else {
          const parsedDate = convertExcelDateToISO(dateStr);
          if (!parsedDate) {
            rowErrors.push({
              row: rowNum,
              field: 'Record Date',
              message: 'Invalid date format. Use YYYY-MM-DD or Excel date.',
              value: dateStr,
            });
          } else {
            // Check date is not in the future
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const recordDate = new Date(parsedDate);

            if (recordDate > today) {
              rowErrors.push({
                row: rowNum,
                field: 'Record Date',
                message: 'Date cannot be in the future',
                value: parsedDate,
              });
            } else {
              record.record_date = parsedDate;
            }
          }
        }
      } catch (error) {
        rowErrors.push({
          row: rowNum,
          field: 'Record Date',
          message: 'Failed to parse date',
          value: row['Record Date'],
        });
      }

      // Parse Disease Type
      const diseaseType = row['Disease Type']?.toString().trim();
      if (!diseaseType) {
        rowErrors.push({
          row: rowNum,
          field: 'Disease Type',
          message: 'Disease Type is required',
        });
      } else {
        // Find matching disease type (case-insensitive)
        const validDiseaseType = Object.keys(DISEASE_TYPE_LABELS).find(
          key => DISEASE_TYPE_LABELS[key].toLowerCase() === diseaseType.toLowerCase()
        );

        if (!validDiseaseType) {
          rowErrors.push({
            row: rowNum,
            field: 'Disease Type',
            message: `Invalid disease type. Must be one of: ${Object.values(DISEASE_TYPE_LABELS).join(', ')}`,
            value: diseaseType,
          });
        } else {
          record.disease_type = validDiseaseType;
        }
      }

      // Parse Custom Disease Name (required if disease_type = 'other')
      const customDiseaseName = row['Custom Disease Name']?.toString().trim();
      if (record.disease_type === 'other' && !customDiseaseName) {
        rowErrors.push({
          row: rowNum,
          field: 'Custom Disease Name',
          message: 'Custom Disease Name is required when Disease Type is "Other"',
        });
      } else if (customDiseaseName) {
        record.custom_disease_name = customDiseaseName;
      }

      // Parse Case Count
      const caseCount = row['Case Count'];
      if (caseCount === undefined || caseCount === null || caseCount === '') {
        rowErrors.push({
          row: rowNum,
          field: 'Case Count',
          message: 'Case Count is required',
        });
      } else {
        const parsedCount = parseInt(caseCount.toString(), 10);
        if (isNaN(parsedCount) || parsedCount <= 0) {
          rowErrors.push({
            row: rowNum,
            field: 'Case Count',
            message: 'Case Count must be a positive integer',
            value: caseCount,
          });
        } else {
          record.case_count = parsedCount;
        }
      }

      // Severity removed - will be auto-calculated on backend using formula:
      // (Number of cases / Barangay population) × 100
      // High risk (critical): ≥70%, Medium risk (severe): 50-69%, Low risk (moderate): <50%

      // Parse Barangay
      const barangayName = row['Barangay']?.toString().trim();
      if (!barangayName) {
        rowErrors.push({
          row: rowNum,
          field: 'Barangay',
          message: 'Barangay is required',
        });
      } else {
        // Find barangay by name (case-insensitive)
        const barangay = barangays.find(
          b => b.name.toLowerCase() === barangayName.toLowerCase()
        );

        if (!barangay) {
          rowErrors.push({
            row: rowNum,
            field: 'Barangay',
            message: `Barangay "${barangayName}" not found. Check spelling or use barangay code.`,
            value: barangayName,
          });
        } else {
          record.barangay_id = barangay.id;
          record.barangay_name = barangay.name; // For display
        }
      }

      // Parse optional fields
      const source = row['Source']?.toString().trim();
      if (source) {
        record.source = source;
      }

      const notes = row['Notes']?.toString().trim();
      if (notes) {
        record.notes = notes;
      }

      // Add errors to result
      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
      } else {
        // All validations passed - add to valid records
        result.records.push(record as HistoricalRecord);
        result.validRows++;
      }
    }

    // Set success if at least some records are valid
    result.success = result.validRows > 0;

    console.log(`\n📊 Parsing Summary:`);
    console.log(`   Total Rows: ${result.totalRows}`);
    console.log(`   Valid Records: ${result.validRows}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Warnings: ${result.warnings.length}`);

    if (result.success) {
      console.log(`✅ Parsing completed successfully - ${result.validRows} records ready for import`);
    } else {
      console.error(`❌ Parsing failed - ${result.errors.length} validation errors found`);
      // Log first 5 errors for debugging
      result.errors.slice(0, 5).forEach(error => {
        console.error(`   Row ${error.row}: ${error.field} - ${error.message}`);
      });
    }

    return result;

  } catch (error) {
    console.error('Excel parse error:', error);
    result.errors.push({
      row: 0,
      field: 'file',
      message: error instanceof Error ? error.message : 'Failed to parse Excel file',
    });
    return result;
  }
}

/**
 * Convert Excel date to ISO string (YYYY-MM-DD)
 * Handles both Excel serial numbers and string dates
 */
export function convertExcelDateToISO(excelDate: any): string | null {
  if (!excelDate) return null;

  try {
    // If already a Date object
    if (excelDate instanceof Date) {
      return formatDateToISO(excelDate);
    }

    // If string in YYYY-MM-DD format
    if (typeof excelDate === 'string') {
      // Try YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
          return excelDate;
        }
      }

      // Try MM/DD/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(excelDate)) {
        const [month, day, year] = excelDate.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return formatDateToISO(date);
        }
      }

      // Try DD/MM/YYYY
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(excelDate)) {
        const [day, month, year] = excelDate.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return formatDateToISO(date);
        }
      }

      // Try parsing as date string
      const date = new Date(excelDate);
      if (!isNaN(date.getTime())) {
        return formatDateToISO(date);
      }
    }

    // If number (Excel serial date)
    if (typeof excelDate === 'number') {
      const date = XLSX.SSF.parse_date_code(excelDate);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }

    return null;
  } catch (error) {
    console.error('Date conversion error:', error);
    return null;
  }
}

/**
 * Format JavaScript Date to ISO string (YYYY-MM-DD)
 */
function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate a single historical record
 */
export function validateHistoricalRecord(
  record: Partial<HistoricalRecord>,
  barangays: Array<{ id: number; name: string }>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate record_date
  if (!record.record_date) {
    errors.push({
      row: 0,
      field: 'record_date',
      message: 'Record date is required',
    });
  } else {
    const recordDate = new Date(record.record_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (recordDate > today) {
      errors.push({
        row: 0,
        field: 'record_date',
        message: 'Record date cannot be in the future',
        value: record.record_date,
      });
    }
  }

  // Validate disease_type
  if (!record.disease_type) {
    errors.push({
      row: 0,
      field: 'disease_type',
      message: 'Disease type is required',
    });
  } else if (!(record.disease_type in DISEASE_TYPE_LABELS)) {
    errors.push({
      row: 0,
      field: 'disease_type',
      message: 'Invalid disease type',
      value: record.disease_type,
    });
  }

  // Validate custom_disease_name (required if type='other')
  if (record.disease_type === 'other' && !record.custom_disease_name) {
    errors.push({
      row: 0,
      field: 'custom_disease_name',
      message: 'Custom disease name is required for "Other" disease type',
    });
  }

  // Validate case_count
  if (!record.case_count) {
    errors.push({
      row: 0,
      field: 'case_count',
      message: 'Case count is required',
    });
  } else if (record.case_count <= 0) {
    errors.push({
      row: 0,
      field: 'case_count',
      message: 'Case count must be greater than 0',
      value: record.case_count,
    });
  }

  // Validate severity (optional, but must be valid if provided)
  if (record.severity) {
    const validSeverities = ['critical', 'severe', 'moderate', 'mild'];
    if (!validSeverities.includes(record.severity.toLowerCase())) {
      errors.push({
        row: 0,
        field: 'severity',
        message: 'Severity must be one of: critical, severe, moderate, mild',
        value: record.severity,
      });
    }
  }

  // Validate barangay_id
  if (!record.barangay_id) {
    errors.push({
      row: 0,
      field: 'barangay_id',
      message: 'Barangay is required',
    });
  } else {
    const barangayExists = barangays.some(b => b.id === record.barangay_id);
    if (!barangayExists) {
      errors.push({
        row: 0,
        field: 'barangay_id',
        message: 'Invalid barangay ID',
        value: record.barangay_id,
      });
    }
  }

  return errors;
}
