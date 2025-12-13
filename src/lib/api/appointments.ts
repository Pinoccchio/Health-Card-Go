/**
 * Client-side API helper functions for appointment management
 */

export type AppointmentStatus =
  | 'pending'
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

interface UpdateStatusResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Update appointment status
 * @param appointmentId - The appointment ID
 * @param status - The new status
 * @param reason - Optional reason for the status change
 */
export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  reason?: string
): Promise<UpdateStatusResponse> {
  try {
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        ...(reason && { reason }),
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while updating appointment status',
    };
  }
}

/**
 * Check in a patient for their appointment
 * Sets status to 'checked_in' and records checked_in_at timestamp
 */
export async function checkInAppointment(
  appointmentId: string
): Promise<UpdateStatusResponse> {
  return updateAppointmentStatus(appointmentId, 'checked_in');
}

/**
 * Start a consultation/appointment
 * Sets status to 'in_progress' and records started_at timestamp
 */
export async function startAppointment(
  appointmentId: string
): Promise<UpdateStatusResponse> {
  return updateAppointmentStatus(appointmentId, 'in_progress');
}

/**
 * Mark an appointment as no-show
 * Sets status to 'no_show' with a reason
 */
export async function markNoShow(
  appointmentId: string,
  reason: string = 'Patient did not show up'
): Promise<UpdateStatusResponse> {
  return updateAppointmentStatus(appointmentId, 'no_show', reason);
}

/**
 * Complete an appointment with medical record
 * Note: This should use the /api/appointments/[id]/complete endpoint
 * @param appointmentId - The appointment ID
 * @param medicalRecord - Optional medical record data
 */
export async function completeAppointment(
  appointmentId: string,
  medicalRecord?: {
    category: string;
    diagnosis: string;
    prescription?: string;
    notes?: string;
  }
): Promise<UpdateStatusResponse> {
  try {
    const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(medicalRecord && { medical_record: medicalRecord }),
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error completing appointment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while completing appointment',
    };
  }
}

/**
 * Cancel an appointment
 * @param appointmentId - The appointment ID
 * @param reason - Reason for cancellation
 */
export async function cancelAppointment(
  appointmentId: string,
  reason: string
): Promise<UpdateStatusResponse> {
  try {
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancellation_reason: reason }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while cancelling appointment',
    };
  }
}

/**
 * Revert appointment to previous status
 * @param appointmentId - The appointment ID
 * @param historyId - The status history ID to revert to
 */
export async function revertAppointmentStatus(
  appointmentId: string,
  historyId: string
): Promise<UpdateStatusResponse> {
  try {
    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        revert_to_history_id: historyId,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error reverting appointment status:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while reverting appointment status',
    };
  }
}
