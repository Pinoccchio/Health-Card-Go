import { createAdminClient } from '@/lib/supabase/server';
import { getPhilippineTime } from './timezone';

/**
 * Automatic No-Show Detection and Account Suspension
 *
 * Business Rules:
 * - Appointments are marked as no-show if patient doesn't arrive within 24 hours after scheduled date
 * - Each no-show increments the patient's no_show_count
 * - 2 no-shows → account suspended for 1 month
 * - Account automatically unsuspended when suspension period expires
 *
 * This function should be called daily via cron job (recommended: 1:00 AM PHT)
 */

interface NoShowStats {
  totalAppointmentsChecked: number;
  totalMarkedNoShow: number;
  totalPatientsSuspended: number;
  appointmentsMarked: Array<{
    appointmentId: string;
    patientId: string;
    appointmentDate: string;
    noShowCount: number;
  }>;
  patientsSuspended: Array<{
    patientId: string;
    suspendedUntil: string;
    noShowCount: number;
  }>;
}

export async function markNoShowsAndSuspend(): Promise<NoShowStats> {
  const adminClient = createAdminClient();

  const stats: NoShowStats = {
    totalAppointmentsChecked: 0,
    totalMarkedNoShow: 0,
    totalPatientsSuspended: 0,
    appointmentsMarked: [],
    patientsSuspended: [],
  };

  try {
    // Get current Philippine time
    const now = getPhilippineTime();

    // Calculate cutoff time (24 hours ago)
    const cutoffTime = new Date(now);
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    console.log('[markNoShowsAndSuspend] Starting no-show detection...', {
      currentTime: now.toISOString(),
      cutoffTime: cutoffTime.toISOString(),
    });

    // Query appointments that should be marked as no-show
    // Criteria:
    // 1. Status is 'scheduled' or 'checked_in' (not already completed/cancelled/no-show)
    // 2. Appointment date + 24 hours < now (patient had 24 hours to show up)
    const { data: overdueAppointments, error: fetchError } = await adminClient
      .from('appointments')
      .select(`
        id,
        patient_id,
        appointment_date,
        appointment_time,
        appointment_number,
        service_id,
        status,
        patients!inner(
          id,
          user_id,
          no_show_count,
          profiles!inner(
            first_name,
            last_name,
            email,
            status
          )
        ),
        services!inner(
          name
        )
      `)
      .in('status', ['scheduled', 'checked_in'])
      .lt('appointment_date', cutoffTime.toISOString().split('T')[0]); // Date comparison only

    if (fetchError) {
      console.error('[markNoShowsAndSuspend] Error fetching overdue appointments:', fetchError);
      throw fetchError;
    }

    stats.totalAppointmentsChecked = overdueAppointments?.length || 0;

    if (!overdueAppointments || overdueAppointments.length === 0) {
      console.log('[markNoShowsAndSuspend] No overdue appointments found');
      return stats;
    }

    console.log(`[markNoShowsAndSuspend] Found ${overdueAppointments.length} overdue appointments`);

    // Process each overdue appointment
    for (const appointment of overdueAppointments) {
      try {
        // 1. Mark appointment as no-show
        const { error: updateError } = await adminClient
          .from('appointments')
          .update({
            status: 'no_show',
            updated_at: now.toISOString(),
          })
          .eq('id', appointment.id);

        if (updateError) {
          console.error(`[markNoShowsAndSuspend] Error marking appointment ${appointment.id} as no-show:`, updateError);
          continue; // Skip to next appointment
        }

        // 2. Increment patient's no_show_count and update last_no_show_at
        // Use RPC to atomically increment the counter to avoid race conditions
        const { data: updatedPatient, error: patientUpdateError } = await adminClient
          .rpc('increment_patient_no_show_count', {
            p_patient_id: appointment.patient_id,
            p_last_no_show_at: now.toISOString(),
          })
          .single();

        const newNoShowCount = updatedPatient?.no_show_count || (appointment.patients.no_show_count || 0) + 1;

        if (patientUpdateError) {
          console.error(`[markNoShowsAndSuspend] Error updating patient ${appointment.patient_id} no-show count:`, patientUpdateError);
          continue;
        }

        // 3. Log to appointment_status_history
        await adminClient
          .from('appointment_status_history')
          .insert({
            appointment_id: appointment.id,
            change_type: 'no_show',
            from_status: appointment.status,
            to_status: 'no_show',
            changed_by: appointment.patients.user_id, // System change, but attribute to patient's user
            reason: 'Automatic no-show detection: Patient did not arrive within 24 hours after scheduled date',
            metadata: {
              automatic: true,
              detection_time: now.toISOString(),
              no_show_count: newNoShowCount,
            },
          });

        // 4. Send in-app notification to patient
        const notificationMessage = newNoShowCount >= 2
          ? `Your appointment on ${appointment.appointment_date} was marked as no-show. This is strike ${newNoShowCount}/2. Your account has been suspended.`
          : `Your appointment on ${appointment.appointment_date} was marked as no-show. This is strike ${newNoShowCount}/2.`;

        await adminClient
          .from('notifications')
          .insert({
            user_id: appointment.patients.user_id,
            type: 'cancellation',
            title: 'Appointment Marked as No Show',
            message: notificationMessage,
            link: '/patient/appointments',
          });

        stats.totalMarkedNoShow++;
        stats.appointmentsMarked.push({
          appointmentId: appointment.id,
          patientId: appointment.patient_id,
          appointmentDate: appointment.appointment_date,
          noShowCount: newNoShowCount,
        });

        console.log(`[markNoShowsAndSuspend] Marked appointment ${appointment.id} as no-show (patient no-show count: ${newNoShowCount})`);

        // 5. Check if patient should be suspended (2 or more no-shows)
        if (newNoShowCount >= 2) {
          // Suspend account for 1 month
          const suspendedUntil = new Date(now);
          suspendedUntil.setMonth(suspendedUntil.getMonth() + 1);

          const { error: suspensionError } = await adminClient
            .from('profiles')
            .update({
              status: 'suspended',
            })
            .eq('id', appointment.patients.user_id);

          if (suspensionError) {
            console.error(`[markNoShowsAndSuspend] Error suspending profile ${appointment.patients.user_id}:`, suspensionError);
          }

          const { error: patientSuspensionError } = await adminClient
            .from('patients')
            .update({
              suspended_until: suspendedUntil.toISOString(),
            })
            .eq('id', appointment.patient_id);

          if (patientSuspensionError) {
            console.error(`[markNoShowsAndSuspend] Error setting suspended_until for patient ${appointment.patient_id}:`, patientSuspensionError);
          } else {
            stats.totalPatientsSuspended++;
            stats.patientsSuspended.push({
              patientId: appointment.patient_id,
              suspendedUntil: suspendedUntil.toISOString(),
              noShowCount: newNoShowCount,
            });

            // Send suspension notification
            await adminClient
              .from('notifications')
              .insert({
                user_id: appointment.patients.user_id,
                type: 'general',
                title: 'Account Suspended Due to No-Shows',
                message: `Your account has been suspended for 1 month due to ${newNoShowCount} no-shows. You can book appointments again on ${suspendedUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. If you believe this is an error, please contact the City Health Office.`,
                link: '/patient/dashboard',
              });

            console.log(`[markNoShowsAndSuspend] Suspended patient ${appointment.patient_id} until ${suspendedUntil.toISOString()}`);
          }
        }

      } catch (appointmentError) {
        console.error(`[markNoShowsAndSuspend] Error processing appointment ${appointment.id}:`, appointmentError);
        continue; // Continue with next appointment
      }
    }

    console.log('[markNoShowsAndSuspend] Completed:', {
      totalChecked: stats.totalAppointmentsChecked,
      totalMarked: stats.totalMarkedNoShow,
      totalSuspended: stats.totalPatientsSuspended,
    });

    return stats;

  } catch (error) {
    console.error('[markNoShowsAndSuspend] Critical error:', error);
    throw error;
  }
}

/**
 * Check if a patient's suspension period has expired and auto-unsuspend
 * This can be called during booking validation to automatically reinstate accounts
 */
export async function checkAndUnsuspendPatient(patientId: string, userId: string): Promise<boolean> {
  const adminClient = createAdminClient();

  try {
    // Get patient's suspension data
    const { data: patient, error: fetchError } = await adminClient
      .from('patients')
      .select('suspended_until')
      .eq('id', patientId)
      .single();

    if (fetchError || !patient) {
      return false;
    }

    // Check if suspension has expired
    if (patient.suspended_until) {
      const now = getPhilippineTime();
      const suspendedUntil = new Date(patient.suspended_until);

      if (now >= suspendedUntil) {
        // Suspension has expired - unsuspend the account
        const { error: profileError } = await adminClient
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', userId);

        const { error: patientError } = await adminClient
          .from('patients')
          .update({ suspended_until: null })
          .eq('id', patientId);

        if (!profileError && !patientError) {
          // Send reinstatement notification
          await adminClient
            .from('notifications')
            .insert({
              user_id: userId,
              type: 'general',
              title: 'Account Suspension Lifted',
              message: 'Your account suspension has been lifted. You can now book appointments. Please ensure you attend scheduled appointments to avoid future suspensions.',
              link: '/patient/book-appointment',
            });

          console.log(`[checkAndUnsuspendPatient] Auto-unsuspended patient ${patientId}`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('[checkAndUnsuspendPatient] Error:', error);
    return false;
  }
}
