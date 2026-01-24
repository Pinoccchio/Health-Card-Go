/**
 * Disease Severity Calculator
 *
 * Automatically calculates disease severity based on case count and barangay population.
 * Replaces manual severity entry in disease surveillance system.
 *
 * Client Requirements:
 * - Formula: (Number of cases / Population) × 100
 * - High Risk: ≥70%
 * - Medium Risk: 50-69%
 * - Low Risk: <50%
 *
 * @module severityCalculator
 */

/**
 * Valid severity levels for disease cases
 */
export type Severity = 'high_risk' | 'medium_risk' | 'low_risk';

/**
 * Calculate disease severity based on case count and barangay population
 *
 * @param caseCount - Number of disease cases reported
 * @param population - Barangay population (from barangays table)
 * @returns Severity level: 'high_risk', 'medium_risk', or 'low_risk'
 *
 * @example
 * ```typescript
 * // San Roque: 666 population, 500 cases
 * calculateSeverity(500, 666); // Returns 'high_risk' (75.08%)
 *
 * // Katualan: 611 population, 350 cases
 * calculateSeverity(350, 611); // Returns 'medium_risk' (57.28%)
 *
 * // Buenavista: 806 population, 300 cases
 * calculateSeverity(300, 806); // Returns 'low_risk' (37.22%)
 *
 * // Outside Zone: null population
 * calculateSeverity(100, null); // Returns 'low_risk' (fallback)
 * ```
 */
export function calculateSeverity(
  caseCount: number,
  population: number | null | undefined
): Severity {
  // Handle edge cases
  if (caseCount < 0) {
    console.warn('Negative case count provided, defaulting to low risk severity');
    return 'low_risk';
  }

  // Fallback for missing or invalid population data
  // This handles:
  // - Outside Zone (population is null)
  // - Database integrity issues
  // - Future barangays without population data
  if (!population || population <= 0) {
    console.warn(`Population data unavailable (value: ${population}), defaulting to low risk severity`);
    return 'low_risk';
  }

  // Calculate risk percentage
  const percentage = (caseCount / population) * 100;

  // Apply severity thresholds per client requirements
  if (percentage >= 70) {
    return 'high_risk'; // High risk: ≥70%
  }

  if (percentage >= 50) {
    return 'medium_risk'; // Medium risk: 50-69%
  }

  // Low risk: <50%
  // This includes all cases below 50%, even 0% (no cases)
  return 'low_risk';
}

/**
 * Get severity risk level label for display in UI
 *
 * @param severity - Severity level
 * @returns Human-readable risk level label
 *
 * @example
 * ```typescript
 * getSeverityLabel('high_risk');    // Returns 'High Risk'
 * getSeverityLabel('medium_risk');  // Returns 'Medium Risk'
 * getSeverityLabel('low_risk');     // Returns 'Low Risk'
 * ```
 */
export function getSeverityLabel(severity: Severity): string {
  const labels: Record<Severity, string> = {
    high_risk: 'High Risk',
    medium_risk: 'Medium Risk',
    low_risk: 'Low Risk',
  };

  return labels[severity] || 'Unknown';
}

/**
 * Get severity percentage for display
 *
 * @param caseCount - Number of disease cases
 * @param population - Barangay population
 * @returns Formatted percentage string or 'N/A' if population is unavailable
 *
 * @example
 * ```typescript
 * getSeverityPercentage(500, 666); // Returns '75.08%'
 * getSeverityPercentage(100, null); // Returns 'N/A'
 * ```
 */
export function getSeverityPercentage(
  caseCount: number,
  population: number | null | undefined
): string {
  if (!population || population <= 0 || caseCount < 0) {
    return 'N/A';
  }

  const percentage = (caseCount / population) * 100;
  return `${percentage.toFixed(2)}%`;
}

/**
 * Get severity color for UI display (badge, chart, etc.)
 *
 * @param severity - Severity level
 * @returns Tailwind CSS color class
 *
 * @example
 * ```typescript
 * getSeverityColor('high_risk');   // Returns 'red'
 * getSeverityColor('medium_risk'); // Returns 'orange'
 * getSeverityColor('low_risk');    // Returns 'yellow'
 * ```
 */
export function getSeverityColor(severity: Severity): string {
  const colors: Record<Severity, string> = {
    high_risk: 'red',
    medium_risk: 'orange',
    low_risk: 'yellow',
  };

  return colors[severity] || 'gray';
}
