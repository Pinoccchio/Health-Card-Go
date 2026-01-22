/**
 * Admin Authorization Helpers
 *
 * Centralized authorization utilities for Healthcare Admin access control.
 * Uses admin_category as the PRIMARY authorization field.
 */

import { AdminCategory } from '@/types/auth';

/**
 * Maps admin_category to the service IDs they can access
 *
 * Service Mappings:
 * - HealthCard Admin: Services 12-15 (Yellow Card 12,13 | Green Card 14,15)
 * - HIV Admin: Service 16 (Pink Card & HIV Testing)
 * - Pregnancy Admin: Service 17 (Prenatal Checkup)
 * - Laboratory Admin: TBD
 * - Immunization Admin: TBD
 */
export function getServiceIdsForCategory(category: AdminCategory | null | undefined): number[] {
  if (!category) return [];

  switch (category) {
    case 'healthcard':
      return [12, 13, 14, 15];
    case 'hiv':
      return [16];
    case 'pregnancy':
      return [17];
    case 'laboratory':
      return []; // TODO: Define laboratory service IDs
    case 'immunization':
      return []; // TODO: Define immunization service IDs
    default:
      return [];
  }
}

/**
 * Checks if a Healthcare Admin with the given category can access a specific service
 */
export function canAccessService(
  adminCategory: AdminCategory | null | undefined,
  serviceId: number
): boolean {
  const allowedServices = getServiceIdsForCategory(adminCategory);
  return allowedServices.includes(serviceId);
}

/**
 * Gets the admin category name for display purposes
 */
export function getAdminCategoryDisplayName(category: AdminCategory | null | undefined): string {
  if (!category) return 'Unknown';

  const names: Record<AdminCategory, string> = {
    healthcard: 'HealthCard Admin',
    hiv: 'HIV Admin',
    pregnancy: 'Pregnancy Admin',
    laboratory: 'Laboratory Admin',
    immunization: 'Immunization Admin',
  };

  return names[category] || category;
}

/**
 * Determines which healthcard types an admin can manage
 *
 * Returns:
 * - HealthCard Admin: ['food_handler', 'non_food'] (Yellow & Green cards)
 * - HIV Admin: ['pink'] (Pink cards only)
 * - Others: []
 */
export function getAllowedHealthCardTypes(
  adminCategory: AdminCategory | null | undefined
): ('food_handler' | 'non_food' | 'pink')[] {
  if (!adminCategory) return [];

  switch (adminCategory) {
    case 'healthcard':
      return ['food_handler', 'non_food']; // Yellow & Green cards
    case 'hiv':
      return ['pink']; // Pink cards
    default:
      return [];
  }
}

/**
 * Checks if an admin can import historical data for a specific healthcard type
 */
export function canImportHealthCardData(
  adminCategory: AdminCategory | null | undefined,
  healthcardType: 'food_handler' | 'non_food' | 'pink'
): boolean {
  const allowedTypes = getAllowedHealthCardTypes(adminCategory);
  return allowedTypes.includes(healthcardType);
}

/**
 * Validates if an admin category can access a specific service category
 */
export function validateServiceAccess(
  adminCategory: AdminCategory | null | undefined,
  targetServiceId: number
): { allowed: boolean; reason?: string } {
  if (!adminCategory) {
    return {
      allowed: false,
      reason: 'No admin category assigned',
    };
  }

  const allowedServices = getServiceIdsForCategory(adminCategory);

  if (allowedServices.length === 0) {
    return {
      allowed: false,
      reason: `No services defined for ${adminCategory} category`,
    };
  }

  if (!allowedServices.includes(targetServiceId)) {
    return {
      allowed: false,
      reason: `${getAdminCategoryDisplayName(adminCategory)} can only access services: ${allowedServices.join(', ')}`,
    };
  }

  return { allowed: true };
}
