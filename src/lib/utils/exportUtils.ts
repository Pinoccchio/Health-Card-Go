/**
 * Shared Export Utilities
 * Provides standardized CSV and Excel export functionality across all roles
 */

import * as XLSX from 'xlsx';

/**
 * Escapes a field value for CSV format
 * Handles commas, quotes, and newlines
 */
export function escapeCSVField(field: any): string {
  if (field === null || field === undefined) return '';

  const stringValue = String(field);

  // If the field contains comma, newline, or quote, wrap it in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Generates a CSV file from data array
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param excludeColumns - Columns to exclude from export
 */
export function generateCSV(
  data: any[],
  filename: string,
  excludeColumns: string[] = ['id', 'created_at', 'updated_at']
): void {
  if (!data || data.length === 0) {
    alert('No data available to export');
    return;
  }

  // Get column headers (exclude specified columns)
  const columns = Object.keys(data[0]).filter(key => !excludeColumns.includes(key));

  // Create CSV header row
  const headers = columns.map(col => col.replace(/_/g, ' ').toUpperCase());

  // Create CSV data rows
  const rows = data.map((row: any) =>
    columns.map(col => {
      const value = row[col];
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'object') return JSON.stringify(value);
      return escapeCSVField(value);
    })
  );

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates an Excel file with multiple sheets
 * @param data - Object with sheet names as keys and data arrays as values
 * @param filename - Name of the file (without extension)
 * @param excludeColumns - Columns to exclude from export
 */
export function generateExcel(
  data: {
    summary?: Record<string, any>;
    tableData?: any[];
    statusBreakdown?: any[];
    serviceBreakdown?: any[];
    trendData?: any[];
    diseaseBreakdown?: any[];
    severityBreakdown?: any[];
    barangayBreakdown?: any[];
    ratingDistribution?: any[];
  },
  filename: string,
  excludeColumns: string[] = ['id']
): void {
  const workbook = XLSX.utils.book_new();

  // Add Summary Sheet
  if (data.summary) {
    const summaryData = Object.entries(data.summary).map(([key, value]) => ({
      'Metric': key.replace(/_/g, ' ').toUpperCase(),
      'Value': value
    }));
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  }

  // Add Main Data Sheet
  if (data.tableData && data.tableData.length > 0) {
    const cleanedData = data.tableData.map((row: any) => {
      const cleanRow: any = {};
      Object.entries(row).forEach(([key, value]) => {
        if (!excludeColumns.includes(key)) {
          const cleanKey = key.replace(/_/g, ' ').toUpperCase();
          if (value === null || value === undefined) {
            cleanRow[cleanKey] = '';
          } else if (typeof value === 'boolean') {
            cleanRow[cleanKey] = value ? 'Yes' : 'No';
          } else if (typeof value === 'object') {
            cleanRow[cleanKey] = JSON.stringify(value);
          } else {
            cleanRow[cleanKey] = value;
          }
        }
      });
      return cleanRow;
    });
    const dataSheet = XLSX.utils.json_to_sheet(cleanedData);
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');
  }

  // Add Status Breakdown Sheet (if available)
  if (data.statusBreakdown && data.statusBreakdown.length > 0) {
    const statusSheet = XLSX.utils.json_to_sheet(data.statusBreakdown);
    XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Breakdown');
  }

  // Add Service Breakdown Sheet (if available)
  if (data.serviceBreakdown && data.serviceBreakdown.length > 0) {
    const serviceSheet = XLSX.utils.json_to_sheet(data.serviceBreakdown);
    XLSX.utils.book_append_sheet(workbook, serviceSheet, 'Service Breakdown');
  }

  // Add Disease Breakdown Sheet (if available)
  if (data.diseaseBreakdown && data.diseaseBreakdown.length > 0) {
    const diseaseSheet = XLSX.utils.json_to_sheet(data.diseaseBreakdown);
    XLSX.utils.book_append_sheet(workbook, diseaseSheet, 'Disease Breakdown');
  }

  // Add Severity Breakdown Sheet (if available)
  if (data.severityBreakdown && data.severityBreakdown.length > 0) {
    const severitySheet = XLSX.utils.json_to_sheet(data.severityBreakdown);
    XLSX.utils.book_append_sheet(workbook, severitySheet, 'Severity Breakdown');
  }

  // Add Barangay Breakdown Sheet (if available)
  if (data.barangayBreakdown && data.barangayBreakdown.length > 0) {
    const barangaySheet = XLSX.utils.json_to_sheet(data.barangayBreakdown);
    XLSX.utils.book_append_sheet(workbook, barangaySheet, 'Barangay Breakdown');
  }

  // Add Rating Distribution Sheet (if available)
  if (data.ratingDistribution && data.ratingDistribution.length > 0) {
    const ratingSheet = XLSX.utils.json_to_sheet(data.ratingDistribution);
    XLSX.utils.book_append_sheet(workbook, ratingSheet, 'Rating Distribution');
  }

  // Add Trend Data Sheet (if available)
  if (data.trendData && data.trendData.length > 0) {
    const trendSheet = XLSX.utils.json_to_sheet(data.trendData);
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'Trend Data');
  }

  // Generate and download Excel file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Formats a filename with timestamp
 * @param prefix - File prefix (e.g., 'admin_report', 'appointments_export')
 * @param extension - File extension without dot (e.g., 'csv', 'xlsx')
 */
export function formatFileName(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Formats data value for display in exports
 * Handles null, undefined, booleans, objects, etc.
 */
export function formatValue(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
