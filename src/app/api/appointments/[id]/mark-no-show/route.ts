import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * POST /api/appointments/[id]/mark-no-show
 * Manually mark an appointment as no-show (Healthcare Admin or Super Admin only)
 *
 * Business Rules:
 * - Only Healthcare Admins or Super Admins can mark appointments as no-show
 * - Healthcare Admins can only mark no-show for appointments in their assigned service
 * - Appointment must be in 'scheduled', 'checked_in', or 'in_progress' status
 * - Increments patient's no_show_count
 * - If patient reaches 2 no-shows, suspends account for 1 month
 * - Sends notification to patient
 * - Logs to appointment_status_history
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with assigned service
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only Healthcare Admins and Super Admins can mark as no-show
    if (profile.role !== 'healthcare_admin' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only Healthcare Admins and Super Admins can mark appointments as no-show' },
        { status: 403 }
      );
    }

    // Get appointment with patient and service details
    const adminClient = createAdminClient();
    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select(`
        *,
        services!inner(
          id,
          name
        ),
        patients!inner(
          id,
          user_id,
          no_show_count
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Healthcare Admins can only mark no-show for appointments in their assigned service
    if (profile.role === 'healthcare_admin') {
      if (!profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'No service assigned to your account' },
          { status: 403 }
        );
      }

      if (appointment.service_id !== profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'You can only mark no-show for appointments in your assigned service' },
          { status: 403 }
        );
      }
    }

    // Verify appointment can be marked as no-show
    const validStatuses = ['scheduled', 'checked_in', 'in_progress'];
    if (!validStatuses.includes(appointment.status)) {
      return NextResponse.json(
        { error: `Cannot mark appointment as no-show. Current status is '${appointment.status}'. Only appointments with status 'scheduled', 'checked_in', or 'in_progress' can be marked as no-show.` },
        { status: 400 }
      );
    }

    // Get request body (optional reason)
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Step 1: Update appointment status to no-show
    const now = new Date().toISOString();
    const { data: updatedAppointment, error: updateError } = await adminClient
      .from('appointments')
      .update({
        status: 'no_show',
        updated_at: now,
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment to no-show:', updateError);
      return NextResponse.json(
        { error: 'Failed to mark appointment as no-show', details: updateError.message },
        { status: 500 }
      );
    }

    // Step 2: Increment patient's no_show_count atomically
    const { data: updatedPatient, error: patientUpdateError } = await adminClient
      .rpc('increment_patient_no_show_count', {
        p_patient_id: appointment.patient_id,
        p_last_no_show_at: now,
      })
      .single();

    const newNoShowCount = (updatedPatient as any)?.no_show_count || (appointment.patients.no_show_count || 0) + 1;

    if (patientUpdateError) {
      console.error('Error incrementing patient no-show count:', patientUpdateError);
      return NextResponse.json(
        { error: 'Appointment marked as no-show, but failed to update patient record', details: patientUpdateError.message },
        { status: 500 }
      );
    }

    // Step 3: Log to appointment_status_history
    await adminClient
      .from('appointment_status_history')
      .insert({
        appointment_id: appointmentId,
        change_type: 'no_show',
        from_status: appointment.status,
        to_status: 'no_show',
        changed_by: profile.id,
        reason: reason || 'Manually marked as no-show by healthcare admin',
        metadata: {
          manual: true,
          marked_by_role: profile.role,
          no_show_count: newNoShowCount,
        },
      });

    // Step 4: Send notification to patient
    const notificationMessage = newNoShowCount >= 2
      ? `Your appointment #${appointment.appointment_number} on ${appointment.appointment_date} was marked as no-show. This is strike ${newNoShowCount}/2. Your account has been suspended for 1 month.`
      : `Your appointment #${appointment.appointment_number} on ${appointment.appointment_date} was marked as no-show. This is strike ${newNoShowCount}/2.`;

    await adminClient
      .from('notifications')
      .insert({
        user_id: appointment.patients.user_id,
        type: 'cancellation',
        title: 'Appointment Marked as No Show',
        message: notificationMessage,
        link: '/patient/appointments',
      });

    // Step 5: Check if patient should be suspended (2 or more no-shows)
    let suspensionApplied = false;
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
        console.error('Error suspending profile:', suspensionError);
      }

      const { error: patientSuspensionError } = await adminClient
        .from('patients')
        .update({
          suspended_until: suspendedUntil.toISOString(),
        })
        .eq('id', appointment.patient_id);

      if (patientSuspensionError) {
        console.error('Error setting suspended_until for patient:', patientSuspensionError);
      } else {
        suspensionApplied = true;

        // Send suspension notification
        await adminClient
          .from('notifications')
          .insert({
            user_id: appointment.patients.user_id,
            type: 'general',
            title: 'Account Suspended Due to No-Shows',
            message: `Your account has been suspended for 1 month due to ${newNoShowCount} no-shows. The latest missed appointment was #${appointment.appointment_number} on ${appointment.appointment_date}. You can book appointments again on ${suspendedUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. If you believe this is an error, please contact the City Health Office.`,
            link: '/patient/dashboard',
            data: `appointment_number=${appointment.appointment_number}|no_show_count=${newNoShowCount}|suspended_until=${suspendedUntil.toISOString()}`
          });

        console.log(`✅ [MANUAL NO-SHOW] Patient ${appointment.patient_id} suspended until ${suspendedUntil.toISOString()}`);
      }
    }

    console.log(`✅ [MANUAL NO-SHOW] Appointment ${appointmentId} marked as no-show by ${profile.role} (Queue #${appointment.appointment_number}, No-show count: ${newNoShowCount}${suspensionApplied ? ', Account suspended' : ''})`);

    // Revalidate the appointments page cache
    revalidatePath('/healthcare-admin/appointments');

    return NextResponse.json({
      success: true,
      message: 'Appointment marked as no-show successfully',
      data: {
        appointment: updatedAppointment,
        no_show_count: newNoShowCount,
        suspension_applied: suspensionApplied,
      },
    });

  } catch (error) {
    console.error('Manual no-show marking error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
