/**
 * HealthCard Helper Utilities
 *
 * Utility functions for health card classification, service mapping,
 * and data transformation for SARIMA predictions.
 */

import {
  HealthCardType,
  SERVICE_TO_HEALTHCARD_TYPE,
  HEALTHCARD_TYPE_TO_SERVICES,
  HEALTHCARD_TYPE_LABELS,
  HEALTHCARD_TYPE_COLORS,
} from '@/types/healthcard';

// ============================================================================
// Service-to-HealthCard Type Mapping
// ============================================================================

/**
 * Get health card type from service ID
 *
 * @param serviceId - Service ID (12-15 for healthcard services)
 * @returns HealthCard type or null if not a healthcard service
 *
 * @example
 * getHealthCardType(12) // 'food_handler'
 * getHealthCardType(14) // 'non_food'
 * getHealthCardType(16) // null (HIV service)
 */
export function getHealthCardType(serviceId: number): HealthCardType | null {
  return SERVICE_TO_HEALTHCARD_TYPE[serviceId] || null;
}

/**
 * Check if service ID is a health card service
 *
 * @param serviceId - Service ID to check
 * @returns True if service is a healthcard service (12-15)
 *
 * @example
 * isHealthCardService(12) // true
 * isHealthCardService(16) // false
 */
export function isHealthCardService(serviceId: number): boolean {
  return serviceId in SERVICE_TO_HEALTHCARD_TYPE;
}

/**
 * Get all service IDs for a health card type
 *
 * @param type - HealthCard type
 * @returns Array of service IDs
 *
 * @example
 * getServiceIdsForType('food_handler') // [12, 13]
 */
export function getServiceIdsForType(type: HealthCardType): number[] {
  return HEALTHCARD_TYPE_TO_SERVICES[type] || [];
}

// ============================================================================
// Display Labels & Descriptions
// ============================================================================

/**
 * Get human-readable label for health card type
 *
 * @param type - HealthCard type
 * @returns Display label
 *
 * @example
 * getHealthCardTypeLabel('food_handler') // 'Food Handler'
 */
export function getHealthCardTypeLabel(type: HealthCardType): string {
  return HEALTHCARD_TYPE_LABELS[type] || type;
}

/**
 * Get detailed description for health card type
 *
 * @param type - HealthCard type
 * @returns Description text
 */
export function getHealthCardTypeDescription(type: HealthCardType): string {
  const descriptions: Record<HealthCardType, string> = {
    food_handler:
      'Health certification for food handlers, restaurant workers, and food service personnel. Required by law for anyone handling food in commercial establishments.',
    non_food:
      'Health certification for non-food industry workers requiring health clearance for employment or business permits.',
    pink:
      'Health certification for service and clinical workers requiring comprehensive health screening. Includes tests for communicable diseases and infection control.',
  };
  return descriptions[type] || '';
}

// ============================================================================
// Color Schemes for Charts
// ============================================================================

/**
 * Get color scheme for health card type
 *
 * @param type - HealthCard type
 * @returns Color object with primary, light, and dark shades
 */
export function getHealthCardTypeColor(type: HealthCardType): {
  primary: string;
  light: string;
  dark: string;
} {
  return HEALTHCARD_TYPE_COLORS[type];
}

/**
 * Get primary color for health card type (Chart.js compatible)
 *
 * @param type - HealthCard type
 * @returns RGB color string
 */
export function getHealthCardTypePrimaryColor(type: HealthCardType): string {
  return HEALTHCARD_TYPE_COLORS[type].primary;
}

/**
 * Get light (transparent) color for confidence intervals
 *
 * @param type - HealthCard type
 * @returns RGBA color string with transparency
 */
export function getHealthCardTypeLightColor(type: HealthCardType): string {
  return HEALTHCARD_TYPE_COLORS[type].light;
}

// ============================================================================
// Service Names & Metadata
// ============================================================================

/**
 * Get service name by ID
 *
 * @param serviceId - Service ID
 * @returns Service name
 */
export function getHealthCardServiceName(serviceId: number): string {
  const serviceNames: Record<number, string> = {
    12: 'Health Card Processing (Yellow/Green/Pink)',
    13: 'Food Handler Health Card Renewal (Yellow)',
    14: 'Non-Food Health Card Processing (Green)',
    15: 'Non-Food Health Card Renewal (Green)',
  };
  return serviceNames[serviceId] || 'Unknown Service';
}

/**
 * Check if service is a renewal service
 *
 * @param serviceId - Service ID
 * @returns True if renewal service (13 or 15)
 */
export function isRenewalService(serviceId: number): boolean {
  return serviceId === 13 || serviceId === 15;
}

/**
 * Check if service is a processing (new) service
 *
 * @param serviceId - Service ID
 * @returns True if processing service (12 or 14)
 */
export function isProcessingService(serviceId: number): boolean {
  return serviceId === 12 || serviceId === 14;
}

// ============================================================================
// Data Validation
// ============================================================================

/**
 * Validate health card type
 *
 * @param type - Type to validate
 * @returns True if valid health card type
 */
export function isValidHealthCardType(type: string): type is HealthCardType {
  return type === 'food_handler' || type === 'non_food' || type === 'pink';
}

/**
 * Parse health card type from string (case-insensitive)
 *
 * @param typeString - Type string to parse
 * @returns HealthCard type or null if invalid
 *
 * @example
 * parseHealthCardType('FOOD_HANDLER') // 'food_handler'
 * parseHealthCardType('food handler') // 'food_handler'
 * parseHealthCardType('invalid') // null
 */
export function parseHealthCardType(typeString: string): HealthCardType | null {
  const normalized = typeString.toLowerCase().replace(/\s+/g, '_');
  if (isValidHealthCardType(normalized)) {
    return normalized;
  }
  return null;
}

// ============================================================================
// Statistics Helpers
// ============================================================================

/**
 * Calculate total cards from statistics array
 *
 * @param statistics - Array of statistics
 * @returns Total card count
 */
export function calculateTotalCards(
  statistics: Array<{ card_count: number }>
): number {
  return statistics.reduce((sum, stat) => sum + stat.card_count, 0);
}

/**
 * Group statistics by health card type
 *
 * @param statistics - Array of statistics with healthcard_type field
 * @returns Object with totals per type
 */
export function groupByHealthCardType<T extends { healthcard_type: HealthCardType; card_count: number }>(
  statistics: T[]
): Record<HealthCardType, number> {
  return statistics.reduce(
    (acc, stat) => {
      acc[stat.healthcard_type] = (acc[stat.healthcard_type] || 0) + stat.card_count;
      return acc;
    },
    { food_handler: 0, non_food: 0, pink: 0 } as Record<HealthCardType, number>
  );
}

/**
 * Group statistics by barangay
 *
 * @param statistics - Array of statistics with barangay_id field
 * @returns Map of barangay_id to total cards
 */
export function groupByBarangay<T extends { barangay_id: number | null; card_count: number }>(
  statistics: T[]
): Map<number | null, number> {
  const grouped = new Map<number | null, number>();
  statistics.forEach((stat) => {
    const current = grouped.get(stat.barangay_id) || 0;
    grouped.set(stat.barangay_id, current + stat.card_count);
  });
  return grouped;
}

// ============================================================================
// Date Range Helpers
// ============================================================================

/**
 * Generate date range for SARIMA queries
 *
 * @param daysBack - Number of days of historical data
 * @param daysForecast - Number of days to forecast
 * @returns Object with start_date and end_date
 */
export function generateSARIMADateRange(
  daysBack: number = 30,
  daysForecast: number = 30
): {
  start_date: string;
  end_date: string;
  today: string;
} {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - daysBack);

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + daysForecast);

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    today: today.toISOString().split('T')[0],
  };
}

/**
 * Generate date range for monthly SARIMA predictions
 *
 * @param monthsBack - Number of months to look back
 * @param monthsForecast - Number of months to forecast
 * @returns Object with start_date and end_date
 */
export function generateSARIMADateRangeMonthly(
  monthsBack: number = 12,
  monthsForecast: number = 12
): {
  start_date: string;
  end_date: string;
  today: string;
} {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - monthsBack);

  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + monthsForecast);

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    today: today.toISOString().split('T')[0],
  };
}

/**
 * Check if date is in the future
 *
 * @param dateString - Date string (YYYY-MM-DD)
 * @returns True if date is after today
 */
export function isFutureDate(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * Format date for display
 *
 * @param dateString - Date string (YYYY-MM-DD)
 * @param locale - Locale for formatting (default: 'en-PH')
 * @returns Formatted date string
 *
 * @example
 * formatDate('2025-12-30') // 'December 30, 2025'
 */
export function formatDate(dateString: string, locale: string = 'en-PH'): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================================
// Prediction Confidence Helpers
// ============================================================================

/**
 * Get confidence level interpretation
 *
 * @param confidenceLevel - Confidence value (0-1)
 * @returns Interpretation label
 */
export function getConfidenceInterpretation(
  confidenceLevel: number
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (confidenceLevel >= 0.9) return 'excellent';
  if (confidenceLevel >= 0.75) return 'good';
  if (confidenceLevel >= 0.6) return 'fair';
  return 'poor';
}

/**
 * Get color for confidence level
 *
 * @param confidenceLevel - Confidence value (0-1)
 * @returns Tailwind color class
 */
export function getConfidenceColor(confidenceLevel: number): string {
  if (confidenceLevel >= 0.9) return 'text-green-600';
  if (confidenceLevel >= 0.75) return 'text-blue-600';
  if (confidenceLevel >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Format confidence level as percentage
 *
 * @param confidenceLevel - Confidence value (0-1)
 * @returns Formatted percentage string
 *
 * @example
 * formatConfidence(0.85) // '85%'
 */
export function formatConfidence(confidenceLevel: number): string {
  return `${Math.round(confidenceLevel * 100)}%`;
}

// ============================================================================
// Export All
// ============================================================================

export {
  SERVICE_TO_HEALTHCARD_TYPE,
  HEALTHCARD_TYPE_TO_SERVICES,
  HEALTHCARD_TYPE_LABELS,
  HEALTHCARD_TYPE_COLORS,
} from '@/types/healthcard';
