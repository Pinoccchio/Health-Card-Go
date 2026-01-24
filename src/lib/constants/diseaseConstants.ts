/**
 * Disease type constants and helper functions
 * Used across the application for consistent disease name display
 * Updated to support role-based filtering
 */

export const DISEASE_TYPE_LABELS: Record<string, string> = {
  hiv_aids: 'HIV/AIDS',
  dengue: 'Dengue',
  malaria: 'Malaria',
  measles: 'Measles',
  animal_bite: 'Animal Bite',
  pregnancy_complications: 'Pregnancy Complications',
  custom_disease: 'Custom Disease',
  other: 'Other',
};

/**
 * Disease types accessible by Staff role
 * Excludes HIV/AIDS and Pregnancy Complications (handled by Healthcare Admins)
 */
export const STAFF_DISEASE_TYPES = [
  'dengue',
  'malaria',
  'measles',
  'animal_bite',
  'custom_disease',
] as const;

/**
 * Disease types for Healthcare Admin with HIV category
 */
export const HIV_ADMIN_DISEASE_TYPES = [
  'hiv_aids',
] as const;

/**
 * Disease types for Healthcare Admin with Pregnancy category
 */
export const PREGNANCY_ADMIN_DISEASE_TYPES = [
  'pregnancy_complications',
] as const;

/**
 * All disease types (for Super Admin and reports)
 */
export const ALL_DISEASE_TYPES = [
  'hiv_aids',
  'dengue',
  'malaria',
  'measles',
  'animal_bite',
  'pregnancy_complications',
  'custom_disease',
  'other',
] as const;

/**
 * Get disease types based on user role and admin category
 */
export function getDiseaseTypesForRole(
  role: string,
  adminCategory?: string | null
): readonly string[] {
  if (role === 'super_admin') {
    return ALL_DISEASE_TYPES;
  }

  if (role === 'staff') {
    return STAFF_DISEASE_TYPES;
  }

  if (role === 'healthcare_admin') {
    if (adminCategory === 'hiv') {
      return HIV_ADMIN_DISEASE_TYPES;
    }
    if (adminCategory === 'pregnancy') {
      return PREGNANCY_ADMIN_DISEASE_TYPES;
    }
    // Other healthcare admin categories don't manage diseases directly
    return [];
  }

  // Patients and other roles don't manage diseases
  return [];
}

/**
 * Color mapping for disease types
 * Used for badges, charts, and visual indicators
 */
export const DISEASE_COLORS: Record<string, string> = {
  hiv_aids: 'purple',
  dengue: 'red',
  malaria: 'yellow',
  measles: 'orange',
  animal_bite: 'amber',
  pregnancy_complications: 'pink',
  custom_disease: 'blue',
  other: 'gray',
};

/**
 * Get color for a disease type
 * Returns Tailwind-compatible color name for badges and indicators
 */
export function getDiseaseColor(diseaseType: string): string {
  return DISEASE_COLORS[diseaseType] || 'gray';
}

/**
 * Get display name for a disease
 * For custom diseases (type='custom_disease' or 'other'), returns the custom_disease_name with "(Custom Disease)" suffix
 * For standard diseases, returns the formatted label
 */
export function getDiseaseDisplayName(
  diseaseType: string,
  customDiseaseName: string | null | undefined
): string {
  if ((diseaseType === 'other' || diseaseType === 'custom_disease') && customDiseaseName) {
    return `${customDiseaseName} (Custom Disease)`;
  }
  return DISEASE_TYPE_LABELS[diseaseType] || diseaseType;
}
