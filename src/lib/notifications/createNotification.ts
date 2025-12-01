import { createClient } from '@/lib/supabase/server';

export type NotificationType =
  | 'appointment_reminder'
  | 'approval'
  | 'cancellation'
  | 'feedback_request'
  | 'general';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, string | number | Date>; // Dynamic data for translation interpolation
}

/**
 * Converts data object to string format for storage
 * Format: "key1=value1|key2=value2"
 */
function serializeNotificationData(data?: Record<string, string | number | Date>): string | null {
  if (!data || Object.keys(data).length === 0) return null;

  return Object.entries(data)
    .map(([key, value]) => {
      if (value instanceof Date) {
        return `${key}=${value.toISOString()}`;
      }
      return `${key}=${value}`;
    })
    .join('|');
}

/**
 * Creates a notification for a user with translation support
 * @param params Notification parameters
 * @returns Created notification or null if error
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Serialize data for translation interpolation
    const dataString = serializeNotificationData(params.data);

    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      data: dataString, // Store serialized data for translation
    });

    if (error) {
      console.error('Error creating notification:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Notification created for user ${params.userId}: ${params.title}`);
    return { success: true };
  } catch (error) {
    console.error('Unexpected error creating notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Creates a patient approval notification with translation support
 */
export async function createApprovalNotification(
  patientId: string,
  patientName: string,
  approverName: string
): Promise<{ success: boolean; error?: string }> {
  return createNotification({
    userId: patientId,
    type: 'approval',
    title: 'notifications.approval.title', // Translation key
    message: 'notifications.approval.message', // Translation key
    link: '/patient/dashboard',
    data: {
      patientName,
      approverName,
    },
  });
}

/**
 * Creates a patient rejection notification with translation support
 */
export async function createRejectionNotification(
  patientId: string,
  patientName: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  return createNotification({
    userId: patientId,
    type: 'general',
    title: 'notifications.rejection.title', // Translation key
    message: 'notifications.rejection.message', // Translation key
    link: '/patient/dashboard',
    data: {
      patientName,
      reason: reason || '',
    },
  });
}

/**
 * Creates an appointment reminder notification with translation support
 */
export async function createAppointmentReminderNotification(
  patientId: string,
  appointmentDate: Date,
  appointmentTime: string
): Promise<{ success: boolean; error?: string }> {
  return createNotification({
    userId: patientId,
    type: 'appointment_reminder',
    title: 'notifications.appointment_reminder.title', // Translation key
    message: 'notifications.appointment_reminder.message', // Translation key
    link: '/patient/appointments',
    data: {
      date: appointmentDate,
      time: appointmentTime,
    },
  });
}

/**
 * Creates an appointment cancellation notification with translation support
 */
export async function createCancellationNotification(
  patientId: string,
  appointmentDate: Date,
  appointmentTime: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  return createNotification({
    userId: patientId,
    type: 'cancellation',
    title: 'notifications.cancellation.title', // Translation key
    message: 'notifications.cancellation.message', // Translation key
    link: '/patient/appointments',
    data: {
      date: appointmentDate,
      time: appointmentTime,
      reason: reason || 'No reason provided',
    },
  });
}

/**
 * Creates a feedback request notification with translation support
 */
export async function createFeedbackRequestNotification(
  patientId: string,
  appointmentId: string
): Promise<{ success: boolean; error?: string }> {
  return createNotification({
    userId: patientId,
    type: 'feedback_request',
    title: 'notifications.feedback_request.title', // Translation key
    message: 'notifications.feedback_request.message', // Translation key
    link: `/patient/feedback?appointment=${appointmentId}`,
  });
}
