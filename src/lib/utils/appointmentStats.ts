/**
 * Shared appointment statistics calculation utility
 * Ensures consistent statistics across all user roles (patient, healthcare admin, super admin)
 */

export interface AppointmentStatistics {
  total: number;
  pending: number;
  scheduled: number;
  checked_in: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export function calculateAppointmentStatistics(
  appointments: Array<{ status: string }>
): AppointmentStatistics {
  return {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    scheduled: appointments.filter((a) => a.status === 'scheduled').length,
    checked_in: appointments.filter((a) => a.status === 'checked_in').length,
    in_progress: appointments.filter((a) => a.status === 'in_progress').length,
    completed: appointments.filter((a) => a.status === 'completed').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    no_show: appointments.filter((a) => a.status === 'no_show').length,
  };
}
