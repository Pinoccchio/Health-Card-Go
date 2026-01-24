/**
 * Color Utilities for Disease Visualization
 *
 * Provides consistent color mapping for standard diseases and generates
 * unique, consistent colors for custom diseases based on their names.
 */

// Standard disease color mapping
export const STANDARD_DISEASE_COLORS: Record<string, string> = {
  dengue: '#f59e0b',               // amber-500
  hiv_aids: '#ef4444',             // red-500
  malaria: '#14b8a6',              // teal-500
  measles: '#8b5cf6',              // violet-500
  rabies: '#ec4899',               // pink-500
  pregnancy_complications: '#f97316', // orange-500
};

/**
 * Get color for a disease type
 * Returns standard color if available, otherwise generates a consistent color
 * based on the custom disease name
 *
 * @param diseaseType - The disease_type from database ('dengue', 'hiv_aids', 'other', etc.)
 * @param customName - The custom_disease_name for 'other' type diseases
 * @returns Hex color string or HSL color string
 */
export function getDiseaseColor(diseaseType: string, customName?: string): string {
  // Return standard color if available
  if (STANDARD_DISEASE_COLORS[diseaseType]) {
    return STANDARD_DISEASE_COLORS[diseaseType];
  }

  // For 'other' diseases with custom names, generate color based on name
  if (diseaseType === 'other' && customName) {
    return generateConsistentColor(customName);
  }

  // Default gray for unknown types
  return '#6b7280'; // gray-500
}

/**
 * Generate a consistent color based on a text string
 * Uses a simple hash function to ensure the same text always produces the same color
 *
 * @param text - Input text (e.g., disease name)
 * @returns HSL color string
 */
export function generateConsistentColor(text: string): string {
  // Hash the text to get a consistent number
  const hash = text.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  // Convert hash to hue value (0-360)
  const hue = Math.abs(hash % 360);

  // Use consistent saturation and lightness for good visibility
  // 65% saturation and 55% lightness work well for charts
  return `hsl(${hue}, 65%, 55%)`;
}

/**
 * Get all unique colors from a dataset
 * Useful for generating color arrays for charts
 *
 * @param diseases - Array of disease objects with disease_type and custom_disease_name
 * @returns Array of color strings
 */
export function getDiseaseColors(diseases: Array<{ disease_type: string; custom_disease_name?: string }>): string[] {
  return diseases.map(disease =>
    getDiseaseColor(disease.disease_type, disease.custom_disease_name)
  );
}

/**
 * Create a color map for all unique disease types in a dataset
 * Useful for consistent coloring across multiple charts
 *
 * @param diseases - Array of disease objects
 * @returns Map of disease keys to colors
 */
export function createDiseaseColorMap(
  diseases: Array<{ disease_type: string; custom_disease_name?: string }>
): Record<string, string> {
  const colorMap: Record<string, string> = {};

  diseases.forEach(disease => {
    const key = (disease.disease_type === 'other' || disease.disease_type === 'custom_disease') && disease.custom_disease_name
      ? disease.custom_disease_name
      : disease.disease_type;

    if (!colorMap[key]) {
      colorMap[key] = getDiseaseColor(disease.disease_type, disease.custom_disease_name);
    }
  });

  return colorMap;
}
