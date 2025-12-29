/**
 * Disease type constants and helper functions
 * Used across the application for consistent disease name display
 */

export const DISEASE_TYPE_LABELS: Record<string, string> = {
  hiv_aids: 'HIV/AIDS',
  dengue: 'Dengue',
  malaria: 'Malaria',
  measles: 'Measles',
  rabies: 'Rabies',
  pregnancy_complications: 'Pregnancy Complications',
  other: 'Other',
};

/**
 * Get display name for a disease
 * For custom diseases (type='other'), returns the custom_disease_name
 * For standard diseases, returns the formatted label
 */
export function getDiseaseDisplayName(
  diseaseType: string,
  customDiseaseName: string | null | undefined
): string {
  if (diseaseType === 'other' && customDiseaseName) {
    return customDiseaseName;
  }
  return DISEASE_TYPE_LABELS[diseaseType] || diseaseType;
}
