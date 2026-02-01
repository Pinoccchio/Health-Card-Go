/**
 * Permission Helper Utilities
 * Dynamically generate permissions based on service characteristics
 */

export interface ServiceProperties {
  id: number;
  name: string;
  description?: string;
  duration_minutes?: number;
  category: 'healthcard' | 'hiv' | 'pregnancy' | 'laboratory' | 'immunization' | 'general';
  requires_appointment: boolean;
}

export interface Permission {
  id: string;
  text: string;
  granted: boolean; // true = CAN do, false = CANNOT do
  category: 'core' | 'appointment' | 'record' | 'data' | 'confidential';
  importance: 'high' | 'medium' | 'low';
}

export interface PermissionSet {
  can: Permission[];
  cannot: Permission[];
  warnings: string[];
  serviceName: string | null; // Actual service name from database
  serviceDescription: string | null; // Service description from database
  serviceType: string; // Generic classification (e.g., "Appointment-based Clinical Service")
  confidentialityLevel: 'high' | 'standard';
}

/**
 * Generate complete permission set for a service
 */
export function getServicePermissions(service: ServiceProperties | null): PermissionSet {
  if (!service) {
    return getUnassignedPermissions();
  }

  const hasAppointments = service.requires_appointment;

  const canPermissions: Permission[] = [];
  const cannotPermissions: Permission[] = [];
  const warnings: string[] = [];

  // Determine service type
  const serviceType = hasAppointments
    ? 'Appointment-based Service'
    : 'Walk-in Service';

  // CORE PERMISSIONS (always granted)
  canPermissions.push({
    id: 'view-dashboard',
    text: 'Access service-specific dashboard',
    granted: true,
    category: 'core',
    importance: 'high',
  });

  canPermissions.push({
    id: 'view-analytics',
    text: 'View analytics and reports for assigned service',
    granted: true,
    category: 'core',
    importance: 'medium',
  });

  // APPOINTMENT PERMISSIONS
  if (hasAppointments) {
    canPermissions.push({
      id: 'manage-appointments',
      text: 'View and manage appointment bookings',
      granted: true,
      category: 'appointment',
      importance: 'high',
    });

    canPermissions.push({
      id: 'check-in-patients',
      text: 'Check-in patients for appointments',
      granted: true,
      category: 'appointment',
      importance: 'high',
    });

    canPermissions.push({
      id: 'view-appointment-queue',
      text: 'View daily appointment queue',
      granted: true,
      category: 'appointment',
      importance: 'medium',
    });

    canPermissions.push({
      id: 'cancel-appointments',
      text: 'Cancel or reschedule appointments',
      granted: true,
      category: 'appointment',
      importance: 'medium',
    });
  } else {
    cannotPermissions.push({
      id: 'no-appointments',
      text: 'Manage appointment bookings (walk-in service)',
      granted: false,
      category: 'appointment',
      importance: 'high',
    });

    canPermissions.push({
      id: 'walk-in-registration',
      text: 'Register walk-in patients directly',
      granted: true,
      category: 'appointment',
      importance: 'high',
    });

    warnings.push('This is a walk-in service. Patients do not need appointments.');
  }

  // MEDICAL RECORD PERMISSIONS (not available for any current services)
  cannotPermissions.push({
    id: 'no-medical-records',
    text: 'Create medical records (not available)',
    granted: false,
    category: 'record',
    importance: 'high',
  });

  // HEALTH CARD PERMISSIONS
  if (service.category === 'healthcard') {
    canPermissions.push({
      id: 'generate-health-cards',
      text: 'Generate and print digital health cards with QR codes',
      granted: true,
      category: 'data',
      importance: 'high',
    });
  } else {
    cannotPermissions.push({
      id: 'no-health-cards',
      text: 'Generate health cards (Healthcard service only)',
      granted: false,
      category: 'data',
      importance: 'low',
    });
  }

  // LABORATORY PERMISSIONS
  if (service.category === 'laboratory') {
    canPermissions.push({
      id: 'manage-lab-results',
      text: 'Record and manage laboratory test results',
      granted: true,
      category: 'record',
      importance: 'high',
    });
  }

  // UNIVERSAL RESTRICTIONS
  cannotPermissions.push({
    id: 'no-create-admins',
    text: 'Create other admin accounts (Super Admin only)',
    granted: false,
    category: 'core',
    importance: 'high',
  });

  cannotPermissions.push({
    id: 'no-other-services',
    text: 'Access appointments/patients from other services',
    granted: false,
    category: 'core',
    importance: 'high',
  });

  cannotPermissions.push({
    id: 'no-system-settings',
    text: 'Modify system settings or configurations',
    granted: false,
    category: 'core',
    importance: 'medium',
  });

  return {
    can: canPermissions,
    cannot: cannotPermissions,
    warnings,
    serviceName: service.name,
    serviceDescription: service.description || null,
    serviceType,
    confidentialityLevel: 'standard',
  };
}

/**
 * Permissions for unassigned Healthcare Admin
 */
function getUnassignedPermissions(): PermissionSet {
  return {
    can: [
      {
        id: 'view-profile',
        text: 'View own profile',
        granted: true,
        category: 'core',
        importance: 'low',
      },
    ],
    cannot: [
      {
        id: 'no-dashboard-access',
        text: 'Access any service dashboards',
        granted: false,
        category: 'core',
        importance: 'high',
      },
      {
        id: 'no-patient-access',
        text: 'View or manage patients',
        granted: false,
        category: 'core',
        importance: 'high',
      },
      {
        id: 'no-appointment-access',
        text: 'View or manage appointments',
        granted: false,
        category: 'core',
        importance: 'high',
      },
    ],
    warnings: [
      'UNASSIGNED: This admin cannot access any service data until assigned to a specific service.',
    ],
    serviceName: null,
    serviceDescription: null,
    serviceType: 'Unassigned',
    confidentialityLevel: 'standard',
  };
}

/**
 * Get category label
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    healthcard: 'Health Card',
    hiv: 'HIV/AIDS',
    pregnancy: 'Maternal Health',
    laboratory: 'Laboratory',
    immunization: 'Immunization',
    general: 'General Health',
  };
  return labels[category] || 'General Health';
}

/**
 * Get color scheme for permission box
 */
export function getPermissionBoxColors(
  confidentialityLevel: 'high' | 'standard',
  serviceCategory?: string
): {
  bgColor: string;
  borderColor: string;
  headerBg: string;
  headerText: string;
  canIconColor: string;
  cannotIconColor: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
} {
  if (confidentialityLevel === 'high') {
    return {
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      headerBg: 'bg-purple-100',
      headerText: 'text-purple-900',
      canIconColor: 'text-purple-600',
      cannotIconColor: 'text-purple-400',
      warningBg: 'bg-purple-100',
      warningBorder: 'border-purple-400',
      warningText: 'text-purple-900',
    };
  }

  // Standard service colors
  return {
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    headerBg: 'bg-teal-100',
    headerText: 'text-teal-900',
    canIconColor: 'text-teal-600',
    cannotIconColor: 'text-teal-400',
    warningBg: 'bg-amber-50',
    warningBorder: 'border-amber-300',
    warningText: 'text-amber-900',
  };
}
