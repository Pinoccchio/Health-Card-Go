/**
 * Service Types
 *
 * Type definitions for healthcare services offered by the system.
 */

/**
 * Service categories available in the system
 * As of 2026-01-28: 6 core categories
 * - healthcard: Yellow/Green Card issuance (Service 12)
 * - hiv: HIV Testing & Counseling (Service 16)
 * - pregnancy: Prenatal Checkup (Service 17)
 * - child_immunization: Child Immunization (Service 19)
 * - adult_vaccination: Adult Vaccination (Service 20)
 * - pink_card: Pink Card Management (Service 24)
 * Removed: laboratory, education, general
 */
export type ServiceCategory =
  | 'healthcard'
  | 'hiv'
  | 'pregnancy'
  | 'child_immunization'
  | 'adult_vaccination'
  | 'pink_card';

/**
 * Service entity from database
 */
export interface Service {
  id: number;
  name: string;
  category: ServiceCategory;
  description: string | null;
  duration_minutes: number;
  requires_appointment: boolean;
  is_active: boolean;
  requirements: string[]; // JSONB array of requirement strings
  created_at: string;
  updated_at: string;
}

/**
 * Service form data for creating/updating services
 */
export interface ServiceFormData {
  name: string;
  category: ServiceCategory;
  description: string;
  duration_minutes: number | ''; // Allow empty string during editing to prevent NaN
  requires_appointment: boolean;
  is_active: boolean;
  requirements: string; // Comma-separated string for UI input
}

/**
 * Service with admin assignment information
 * Used in admin service management page
 */
export interface ServiceWithAdmins extends Service {
  admin_count?: number;
  assigned_admins?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

/**
 * Convert comma-separated requirements string to array
 */
export function parseRequirements(requirementsString: string): string[] {
  if (!requirementsString || requirementsString.trim() === '') {
    return [];
  }

  return requirementsString
    .split(',')
    .map(r => r.trim())
    .filter(r => r.length > 0);
}

/**
 * Convert requirements array to comma-separated string
 */
export function formatRequirements(requirements: string[]): string {
  if (!requirements || requirements.length === 0) {
    return '';
  }

  return requirements.join(', ');
}
