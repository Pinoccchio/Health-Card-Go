/**
 * Service Types
 *
 * Type definitions for healthcare services offered by the system.
 */

/**
 * Service categories available in the system
 */
export type ServiceCategory =
  | 'healthcard'
  | 'general'
  | 'hiv'
  | 'pregnancy'
  | 'immunization'
  | 'laboratory';

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
  requires_medical_record: boolean;
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
  requires_medical_record: boolean;
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
    first_name: string;
    last_name: string;
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
