/**
 * Service Access Guard Utilities
 * Checks if Healthcare Admins have access to specific features based on their assigned service properties
 */

interface ServiceProperties {
  id: number;
  name: string;
  requires_appointment: boolean;
}

/**
 * Fetch service properties for a given service ID
 */
export async function getServiceProperties(serviceId: number): Promise<ServiceProperties | null> {
  try {
    const res = await fetch(`/api/services/${serviceId}`);
    const data = await res.json();

    if (data.success && data.data) {
      return data.data;
    }

    return null;
  } catch (error) {
    console.error('Error fetching service properties:', error);
    return null;
  }
}

/**
 * Check if a Healthcare Admin has access to appointments
 * Pattern 5: ALL 3 services (12, 16, 17) have appointment access
 */
export async function canAccessAppointments(assignedServiceId: number | null): Promise<boolean> {
  if (!assignedServiceId) {
    return false;
  }

  // Pattern 5: Services 12, 16, 17, 24 all have appointment access
  return [12, 16, 17, 24].includes(assignedServiceId);
}

/**
 * Check if a Healthcare Admin should see walk-in queue
 * Pattern 5: ALL 3 services (12, 16, 17) have walk-in queue access
 */
export async function canAccessWalkInQueue(assignedServiceId: number | null): Promise<boolean> {
  if (!assignedServiceId) {
    return false;
  }

  // Pattern 5: Services 12, 16, 17, 24 all have walk-in queue access
  return [12, 16, 17, 24].includes(assignedServiceId);
}

/**
 * Generic service permission check
 * Returns an object with all permissions for the given service
 */
export async function getServicePermissions(assignedServiceId: number | null): Promise<{
  canViewAppointments: boolean;
  canViewWalkInQueue: boolean;
  serviceName: string | null;
}> {
  if (!assignedServiceId) {
    return {
      canViewAppointments: false,
      canViewWalkInQueue: false,
      serviceName: null,
    };
  }

  const service = await getServiceProperties(assignedServiceId);

  if (!service) {
    return {
      canViewAppointments: false,
      canViewWalkInQueue: false,
      serviceName: null,
    };
  }

  return {
    canViewAppointments: service.requires_appointment,
    canViewWalkInQueue: !service.requires_appointment,
    serviceName: service.name,
  };
}
