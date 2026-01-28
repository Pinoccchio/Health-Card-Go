/**
 * Service Helper Utilities
 * Functions to enhance service display with admin category information
 */

export interface ServiceCategoryInfo {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

/**
 * Get friendly label for service category
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    healthcard: 'Healthcard',
    hiv: 'HIV/AIDS',
    pregnancy: 'Maternal Health',
    pink_card: 'Pink Card',
    laboratory: 'Laboratory',
    immunization: 'Immunization',
    child_immunization: 'Child Immunization',
    adult_vaccination: 'Adult Vaccination',
    general: 'General Health',
  };
  return labels[category] || 'General Health';
}

/**
 * Get admin role name for service category
 */
export function getAdminRoleLabel(category: string): string {
  const roles: Record<string, string> = {
    healthcard: 'Healthcard Administrator',
    hiv: 'HIV Administrator',
    pregnancy: 'Maternal Health Administrator',
    pink_card: 'Pink Card Administrator',
    laboratory: 'Laboratory Administrator',
    immunization: 'Immunization Administrator',
    child_immunization: 'Child Immunization Administrator',
    adult_vaccination: 'Adult Vaccination Administrator',
    general: 'General Administrator',
  };
  return roles[category] || 'Healthcare Administrator';
}

/**
 * Check if service category requires confidential handling
 */
export function isConfidentialCategory(category: string): boolean {
  return ['hiv', 'pregnancy'].includes(category.toLowerCase());
}

/**
 * Check if service is free (based on name)
 */
export function isFreeService(name: string): boolean {
  return name.toLowerCase().includes('(free)');
}

/**
 * Get category color scheme for consistent UI
 */
export function getCategoryColors(category: string): ServiceCategoryInfo {
  const colorSchemes: Record<string, ServiceCategoryInfo> = {
    healthcard: {
      label: 'Healthcard',
      color: '#10B981', // Emerald
      bgColor: 'bg-emerald-100',
      textColor: 'text-emerald-800',
      description: 'Health identification and records management',
    },
    hiv: {
      label: 'HIV/AIDS',
      color: '#9333EA', // Purple (privacy/sensitivity)
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      description: 'Confidential HIV testing and counseling',
    },
    pregnancy: {
      label: 'Maternal Health',
      color: '#EC4899', // Pink
      bgColor: 'bg-pink-100',
      textColor: 'text-pink-800',
      description: 'Confidential prenatal and postnatal care',
    },
    pink_card: {
      label: 'Pink Card',
      color: '#C026D3', // Fuchsia
      bgColor: 'bg-fuchsia-100',
      textColor: 'text-fuchsia-800',
      description: 'HIV-related health card issuance and renewal',
    },
    laboratory: {
      label: 'Laboratory',
      color: '#3B82F6', // Blue
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      description: 'Medical testing and diagnostics',
    },
    immunization: {
      label: 'Immunization',
      color: '#6366F1', // Indigo
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-800',
      description: 'Vaccination and immunization services',
    },
    child_immunization: {
      label: 'Child Immunization',
      color: '#6366F1', // Indigo
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-800',
      description: 'Childhood vaccination and immunization services',
    },
    adult_vaccination: {
      label: 'Adult Vaccination',
      color: '#06B6D4', // Cyan
      bgColor: 'bg-cyan-100',
      textColor: 'text-cyan-800',
      description: 'Adult vaccination services',
    },
    general: {
      label: 'General Health',
      color: '#6B7280', // Gray
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      description: 'General medical consultations',
    },
  };

  return colorSchemes[category] || colorSchemes.general;
}

/**
 * Get expected processing time for appointment confirmation
 */
export function getExpectedProcessingTime(category: string): string {
  // All categories: usually within 24 hours
  // Can be customized per category if needed in the future
  return 'Usually within 24 hours';
}

/**
 * Get privacy level description
 */
export function getPrivacyLevel(category: string): {
  level: 'high' | 'standard';
  description: string;
} {
  if (isConfidentialCategory(category)) {
    return {
      level: 'high',
      description: 'All records are encrypted and handled with strict confidentiality',
    };
  }

  return {
    level: 'standard',
    description: 'Records are securely stored and protected',
  };
}

/**
 * Get service category icon name (for Lucide React)
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    healthcard: 'FileText',
    hiv: 'AlertCircle',
    pregnancy: 'Baby',
    pink_card: 'CreditCard',
    laboratory: 'Briefcase',
    immunization: 'Syringe',
    child_immunization: 'Baby',
    adult_vaccination: 'Syringe',
    general: 'Heart',
  };
  return icons[category] || 'Heart';
}
