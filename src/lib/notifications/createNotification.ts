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
}

/**
 * Creates a notification for a user
 * @param params Notification parameters
 * @returns Created notification or null if error
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
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
 * Creates a patient approval notification
 */
export async function createApprovalNotification(
  patientId: string,
  patientName: string,
  approverName: string
): Promise<{ success: boolean; error?: string }> {
  return createNotification({
    userId: patientId,
    type: 'approval',
    title: 'Account Approved!',
    message: `Your patient account has been approved by ${approverName}. You can now book appointments and access all features.`,
    link: '/patient/dashboard',
  });
}

/**
 * Creates a patient rejection notification
 */
export async function createRejectionNotification(
  patientId: string,
  patientName: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const message = reason
    ? `Your patient registration has been rejected. Reason: ${reason}`
    : 'Your patient registration has been rejected. Please contact the health office for more information.';

  return createNotification({
    userId: patientId,
    type: 'general',
    title: 'Registration Update',
    message,
    link: '/patient/dashboard',
  });
}
