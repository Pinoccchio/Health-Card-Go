/**
 * Utility functions for safe report data handling
 * Provides defensive programming helpers for working with report API responses
 */

/**
 * Safely converts a value to a fixed decimal string
 * Handles null, undefined, and non-numeric values gracefully
 *
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string or fallback value
 */
export function safeToFixed(value: any, decimals: number = 1): string {
  if (value === null || value === undefined) {
    return '0.' + '0'.repeat(decimals);
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    return '0.' + '0'.repeat(decimals);
  }

  return num.toFixed(decimals);
}

/**
 * Ensures a value is an array
 * Converts objects, null, undefined to empty arrays
 *
 * @param value - The value to ensure is an array
 * @returns An array
 */
export function ensureArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return [];
  }

  // Convert object to array of values
  if (typeof value === 'object') {
    return Object.values(value);
  }

  // Single value - wrap in array
  return [value];
}

/**
 * Safely calculates a percentage with fallback
 * Handles division by zero and invalid values
 *
 * @param numerator - The numerator value
 * @param denominator - The denominator value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Percentage as number (0-100)
 */
export function safePercentage(numerator: any, denominator: any, decimals: number = 1): number {
  const num = typeof numerator === 'string' ? parseFloat(numerator) : numerator;
  const denom = typeof denominator === 'string' ? parseFloat(denominator) : denominator;

  if (
    num === null || num === undefined ||
    denom === null || denom === undefined ||
    isNaN(num) || isNaN(denom) ||
    !isFinite(num) || !isFinite(denom) ||
    denom === 0
  ) {
    return 0;
  }

  const percentage = (num / denom) * 100;
  return parseFloat(percentage.toFixed(decimals));
}

/**
 * Safely gets a numeric value with fallback
 *
 * @param value - The value to convert to number
 * @param fallback - Fallback value (default: 0)
 * @returns Number or fallback
 */
export function safeNumber(value: any, fallback: number = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    return fallback;
  }

  return num;
}

/**
 * Safely gets a string value with fallback
 *
 * @param value - The value to convert to string
 * @param fallback - Fallback value (default: 'N/A')
 * @returns String or fallback
 */
export function safeString(value: any, fallback: string = 'N/A'): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
}

/**
 * Formats a number with locale-specific thousand separators
 *
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places (optional)
 * @returns Formatted string
 */
export function formatNumber(value: any, decimals?: number): string {
  const num = safeNumber(value);

  if (decimals !== undefined) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return num.toLocaleString('en-US');
}

/**
 * Safely extracts summary value from report data
 *
 * @param data - Report data object
 * @param key - Summary key to extract
 * @param fallback - Fallback value
 * @returns Summary value or fallback
 */
export function getSummaryValue(data: any, key: string, fallback: any = 0): any {
  if (!data || !data.summary) {
    return fallback;
  }

  const value = data.summary[key];

  if (value === null || value === undefined) {
    return fallback;
  }

  return value;
}

/**
 * Safely extracts array data from report response
 *
 * @param data - Report data object
 * @param key - Data key to extract
 * @returns Array or empty array
 */
export function getReportArray<T = any>(data: any, key: string): T[] {
  if (!data) {
    return [];
  }

  return ensureArray<T>(data[key]);
}

/**
 * Type guard to check if report data has required structure
 *
 * @param data - Report data to validate
 * @returns True if data has valid structure
 */
export function hasValidReportData(data: any): boolean {
  return data !== null && data !== undefined && typeof data === 'object';
}

/**
 * Type guard to check if summary exists in report data
 *
 * @param data - Report data to validate
 * @returns True if summary exists
 */
export function hasSummary(data: any): data is { summary: Record<string, any> } {
  return hasValidReportData(data) && 'summary' in data && typeof data.summary === 'object';
}
