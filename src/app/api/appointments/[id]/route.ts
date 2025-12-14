import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { canCancelAppointment, getPhilippineTime, getHoursUntilAppointment } from '@/lib/utils/timezone';

/**
 * GET /api/appointments/[id]
 * Get a specific appointment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Use admin client to bypass RLS for nested joins
    // Security: Authentication verified above, authorization checked below for patients
    // RLS on appointments table still limits visibility to relevant appointments
    const adminClient = createAdminClient();

    // Fetch appointment with related data
    const { data: appointment, error: fetchError} = await adminClient
      .from('appointments')
      .select(`
        *,
        patients!inner(
          id,
          user_id,
          patient_number,
          profiles!inner(
            first_name,
            last_name,
            email,
            contact_number,
            date_of_birth,
            gender,
            barangay_id
          )
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Authorization check
    if (profile.role === 'patient') {
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (appointment.patient_id !== patientRecord?.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      data: appointment,
    });

  } catch (error) {
    console.error('Appointment fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Handle status reversion
 * Revert appointment status to a previous state in history
 */
async function handleStatusReversion(
  supabase: any,
  appointmentId: string,
  historyId: string,
  userId: string,
  reason?: string
) {
  // Fetch the history entry to revert to
  const { data: historyEntry, error: historyError } = await supabase
    .from('appointment_status_history')
    .select('*')
    .eq('id', historyId)
    .eq('appointment_id', appointmentId)
    .single();

  if (historyError || !historyEntry) {
    return NextResponse.json(
      { error: 'History entry not found' },
      { status: 404 }
    );
  }

  // Get user profile to check role for authorization
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!userProfile) {
    return NextResponse.json(
      { error: 'User profile not found' },
      { status: 404 }
    );
  }

  // Get current appointment
  const { data: currentAppointment } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single();

  if (!currentAppointment) {
    return NextResponse.json(
      { error: 'Appointment not found' },
      { status: 404 }
    );
  }

  const targetStatus = historyEntry.from_status || 'scheduled';

  // Business rule: Cannot revert completed appointments with medical records
  if (currentAppointment.status === 'completed') {
    const { data: medicalRecord } = await supabase
      .from('medical_records')
      .select('id')
      .eq('appointment_id', appointmentId)
      .limit(1);

    if (medicalRecord && medicalRecord.length > 0) {
      return NextResponse.json(
        { error: 'Cannot revert completed appointments that have medical records' },
        { status: 400 }
      );
    }
  }

  // Business rule: Cannot revert checked_in or in_progress if medical records exist
  // Protects against orphaning partially-written medical records
  if (currentAppointment.status === 'checked_in' || currentAppointment.status === 'in_progress') {
    const { data: medicalRecord } = await supabase
      .from('medical_records')
      .select('id')
      .eq('appointment_id', appointmentId)
      .limit(1);

    if (medicalRecord && medicalRecord.length > 0) {
      return NextResponse.json(
        { error: `Cannot revert ${currentAppointment.status} appointments that have medical records.` },
        { status: 400 }
      );
    }
  }

  // Business rule: Cannot revert cancelled appointments (terminal status)
  if (currentAppointment.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Cannot revert cancelled appointments' },
      { status: 400 }
    );
  }

  // Note: no_show appointments can be reverted at any time
  // The audit trail (is_reversion flag and reason field) provides accountability

  // Prepare update data - reset timestamps for reverted status
  const updateData: any = {
    status: targetStatus,
  };

  // Clear timestamps that shouldn't exist for the reverted status
  if (targetStatus === 'scheduled') {
    updateData.checked_in_at = null;
    updateData.started_at = null;
    updateData.completed_at = null;
  } else if (targetStatus === 'checked_in') {
    updateData.started_at = null;
    updateData.completed_at = null;
  } else if (targetStatus === 'in_progress') {
    updateData.completed_at = null;
  } else if (targetStatus === 'pending') {
    updateData.checked_in_at = null;
    updateData.started_at = null;
    updateData.completed_at = null;
  }

  // Use admin client to update
  const adminClient = createAdminClient();
  const { data: updatedAppointment, error: updateError } = await adminClient
    .from('appointments')
    .update(updateData)
    .eq('id', appointmentId)
    .select(`
      *,
      patients!inner(
        id,
        user_id,
        profiles!inner(
          first_name,
          last_name
        )
      )
    `)
    .single();

  if (updateError) {
    console.error('Error reverting status:', updateError);
    return NextResponse.json(
      { error: 'Failed to revert status' },
      { status: 500 }
    );
  }

  // Explicitly insert reversion history entry with correct user attribution
  // Trigger no longer automatically logs status changes, so we do it manually here
  await adminClient
    .from('appointment_status_history')
    .insert({
      appointment_id: appointmentId,
      change_type: 'status_change',
      from_status: currentAppointment.status,
      to_status: targetStatus,
      changed_by: userId, // Use the authenticated user ID, not patient!
      is_reversion: true,
      reverted_from_history_id: historyId,
      reason: reason || `Reverted from ${currentAppointment.status} to ${targetStatus}`,
    });

  // Send notification to patient about status reversion
  if (updatedAppointment) {
    const statusDisplay = targetStatus.replace(/_/g, ' ');
    const notificationMessage = reason
      ? `Your appointment status was reverted to "${statusDisplay}". Reason: ${reason}`
      : `Your appointment status was reverted to "${statusDisplay}"`;

    await adminClient.from('notifications').insert({
      user_id: updatedAppointment.patients.user_id,
      type: 'general',
      title: 'Appointment Status Updated',
      message: notificationMessage,
      link: '/patient/appointments',
    });
  }

  return NextResponse.json({
    success: true,
    data: updatedAppointment,
    message: `Status reverted to ${targetStatus}`,
  });
}

/**
 * PATCH /api/appointments/[id]
 * Update appointment (check-in, status updates)
 * Only admins can update
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only healthcare admins and super admins can update appointments
    if (!['healthcare_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only medical staff can update appointments' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { status, notes, revert_to_history_id, reason } = body;

    // Log incoming request
    console.log(`[PATCH /api/appointments/${id}] Request:`, {
      status,
      reason,
      revert_to_history_id,
      user_id: user.id,
      user_role: profile.role,
      timestamp: new Date().toISOString()
    });

    // Handle status reversion
    if (revert_to_history_id) {
      return handleStatusReversion(supabase, id, revert_to_history_id, user.id, reason);
    }

    // Build update object
    const updateData: any = {};

    // Handle status updates
    if (status) {
      // Validate status transition
      const validStatuses = ['pending', 'scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'];
      if (!validStatuses.includes(status)) {
        console.error(`[PATCH /api/appointments/${id}] Invalid status rejected: "${status}"`, {
          validStatuses,
          received: status
        });
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      // Business rule: Cannot mark future appointments as no_show
      if (status === 'no_show') {
        // Fetch current appointment data first before validating
        const { data: currentAppointmentData, error: fetchError } = await supabase
          .from('appointments')
          .select('status, appointment_date, checked_in_at, started_at')
          .eq('id', id)
          .single();

        if (fetchError || !currentAppointmentData) {
          return NextResponse.json(
            { error: 'Appointment not found' },
            { status: 404 }
          );
        }

        // Business rule: Cannot mark as no-show after patient has checked in
        // This prevents contradictory data (patient showed up but marked as no-show)
        if (currentAppointmentData.status === 'checked_in' || currentAppointmentData.status === 'in_progress') {
          return NextResponse.json(
            {
              error: 'Cannot mark as no-show after patient has checked in. Use "Undo Last Action" to revert the check-in if this was an error.'
            },
            { status: 400 }
          );
        }

        // Allow future no-show if environment variable is set to 'true' (for testing)
        const allowFutureNoShow = process.env.NEXT_PUBLIC_ALLOW_FUTURE_NO_SHOW === 'true';

        if (!allowFutureNoShow) {
          const philippineNow = getPhilippineTime();
          const appointmentDate = new Date(currentAppointmentData.appointment_date);

          // Set to midnight for date-only comparison
          philippineNow.setHours(0, 0, 0, 0);
          appointmentDate.setHours(0, 0, 0, 0);

          if (appointmentDate.getTime() > philippineNow.getTime()) {
            return NextResponse.json(
              { error: 'Cannot mark future appointments as no_show. Please wait until the appointment date.' },
              { status: 400 }
            );
          }
        }
      }

      updateData.status = status;

      // Set timestamps based on status
      if (status === 'checked_in') {
        updateData.checked_in_at = new Date().toISOString();
      } else if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();

        // BACKEND VALIDATION: Check if service requires medical record
        const { data: appointment } = await supabase
          .from('appointments')
          .select('service_id, services(requires_medical_record)')
          .eq('id', id)
          .single();

        const serviceRequiresMedicalRecord = appointment?.services?.requires_medical_record ?? true;

        if (serviceRequiresMedicalRecord) {
          // Service requires medical record - check if one exists
          const { data: existingMedicalRecord } = await supabase
            .from('medical_records')
            .select('id')
            .eq('appointment_id', id)
            .limit(1);

          if (!existingMedicalRecord || existingMedicalRecord.length === 0) {
            // Medical record is required but doesn't exist
            return NextResponse.json(
              {
                error: 'This service requires a medical record before completion. Please create a medical record first, or provide a reason for completing without documentation.',
              },
              { status: 400 }
            );
          }
        }
        // If service doesn't require medical record, allow completion without medical record
      }
    }

    // Ensure we have something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      );
    }

    // Get current appointment status before updating (for history logging)
    const { data: currentAppointment } = await supabase
      .from('appointments')
      .select('status')
      .eq('id', id)
      .single();

    const oldStatus = currentAppointment?.status;

    // Use admin client to bypass RLS for update operation
    // We've already verified authentication and authorization above
    const adminClient = createAdminClient();

    // Update appointment
    const { data: appointment, error: updateError } = await adminClient
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        patients!inner(
          id,
          user_id,
          profiles!inner(
            first_name,
            last_name
          )
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update appointment' },
        { status: 500 }
      );
    }

    // Explicitly insert status history entry with correct user attribution and reason
    // Trigger no longer automatically logs status changes, so we do it manually here
    if (appointment && status && oldStatus) {
      await adminClient
        .from('appointment_status_history')
        .insert({
          appointment_id: id,
          change_type: 'status_change',
          from_status: oldStatus,
          to_status: status,
          changed_by: user.id, // Use the authenticated user ID (admin), not patient!
          reason: reason || null, // Include reason if provided by user
        });
    }

    // Send notification to patient
    if (appointment && status === 'completed') {
      await supabase.from('notifications').insert({
        user_id: appointment.patients.user_id,
        type: 'general',
        title: 'Appointment Completed',
        message: 'Your appointment has been completed. You can now submit feedback.',
        link: '/patient/feedback',
      });
    }

    // Send "Appointment Confirmed" notification when pending appointment is approved
    if (appointment && status === 'scheduled' && oldStatus === 'pending') {
      await supabase.from('notifications').insert({
        user_id: appointment.patients.user_id,
        type: 'approval',
        title: 'Appointment Confirmed',
        message: `Your appointment on ${appointment.appointment_date} in the ${appointment.time_block} (${appointment.appointment_time}) has been confirmed. Queue number: ${appointment.appointment_number}`,
        link: '/patient/appointments',
      });
    }

    // Send "Checked In" notification when patient is checked in
    if (appointment && status === 'checked_in') {
      await supabase.from('notifications').insert({
        user_id: appointment.patients.user_id,
        type: 'general',
        title: 'Checked In Successfully',
        message: `You have been checked in for your appointment. Queue number: ${appointment.appointment_number}. Please wait for your name to be called.`,
        link: '/patient/appointments',
      });
    }

    // Send "Consultation Started" notification when consultation begins
    if (appointment && status === 'in_progress') {
      await supabase.from('notifications').insert({
        user_id: appointment.patients.user_id,
        type: 'general',
        title: 'Consultation Started',
        message: 'Your consultation has started. Your healthcare provider is ready to see you.',
        link: '/patient/appointments',
      });
    }

    // Send "No Show" notification when patient is marked as no-show
    if (appointment && status === 'no_show') {
      await supabase.from('notifications').insert({
        user_id: appointment.patients.user_id,
        type: 'cancellation',
        title: 'Appointment Marked as No Show',
        message: `Your appointment on ${appointment.appointment_date} was marked as not attended. If this was done in error, please contact us immediately.`,
        link: '/patient/appointments',
      });
    }

    // Send "Appointment Rejected" notification when admin rejects pending appointment
    if (appointment && status === 'cancelled' && oldStatus === 'pending' && reason) {
      await supabase.from('notifications').insert({
        user_id: appointment.patients.user_id,
        type: 'cancellation',
        title: 'Appointment Request Rejected',
        message: `Your appointment request has been rejected. Reason: ${reason}. Please contact us if you have questions.`,
        link: '/patient/appointments',
      });
    }

    // Log successful update
    console.log(`[PATCH /api/appointments/${id}] Status updated successfully:`, {
      appointment_id: id,
      appointment_number: appointment.appointment_number,
      patient_id: appointment.patient_id,
      old_status: currentAppointment.status,
      new_status: status || currentAppointment.status,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: appointment,
      message: 'Appointment updated successfully',
    });

  } catch (error) {
    console.error('Appointment update error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/appointments/[id]
 * Cancel appointment and recalculate queue numbers
 * Patients can only cancel 24+ hours before appointment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Use admin client to bypass RLS for nested joins
    // Security: Authentication verified above, authorization checked below for patients
    const adminClient = createAdminClient();

    // Get appointment
    const { data: appointment, error: fetchError } = await adminClient
      .from('appointments')
      .select(`
        *,
        patients!inner(
          id,
          user_id,
          profiles!inner(first_name, last_name)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Authorization check
    if (profile.role === 'patient') {
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (appointment.patient_id !== patientRecord?.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // POLICY CHANGE: Removed 24-hour cancellation restriction
      // Patients can now cancel anytime (better than no-show)
      // Late cancellations will trigger admin notifications below
    }

    // Get cancellation reason from request body
    const body = await request.json().catch(() => ({}));
    const cancellation_reason = body.reason || 'Cancelled by user';

    // Update appointment to cancelled
    const { data: updatedRows, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (updateError) {
      console.error('Error cancelling appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel appointment' },
        { status: 500 }
      );
    }

    // Check if any rows were actually updated (catches RLS policy issues)
    if (!updatedRows || updatedRows.length === 0) {
      console.error('Failed to cancel appointment - no rows updated (possible RLS issue)');
      return NextResponse.json(
        { error: 'Failed to cancel appointment. You may not have permission to cancel this appointment.' },
        { status: 403 }
      );
    }

    // Explicitly insert cancellation history entry
    // Trigger no longer automatically logs status changes, so we do it manually here
    await adminClient
      .from('appointment_status_history')
      .insert({
        appointment_id: id,
        change_type: 'status_change',
        from_status: appointment.status, // Previous status before cancellation
        to_status: 'cancelled',
        changed_by: user.id, // The person who cancelled (patient or admin)
        reason: cancellation_reason, // Include the cancellation reason
      });

    // Recalculate queue numbers for remaining appointments on the same day and service
    // Since queue numbers are now per-service, we only recalculate for the same service
    const { data: laterAppointments } = await supabase
      .from('appointments')
      .select('id, appointment_number')
      .eq('appointment_date', appointment.appointment_date)
      .eq('service_id', appointment.service_id)
      .gt('appointment_number', appointment.appointment_number)
      .in('status', ['scheduled', 'checked_in'])
      .order('appointment_number', { ascending: true });

    // Update queue numbers for appointments after the cancelled one
    if (laterAppointments && laterAppointments.length > 0) {
      for (const apt of laterAppointments) {
        await supabase
          .from('appointments')
          .update({ appointment_number: apt.appointment_number - 1 })
          .eq('id', apt.id);
      }
    }

    // Send cancellation notification to patient
    await supabase.from('notifications').insert({
      user_id: appointment.patients.user_id,
      type: 'cancellation',
      title: 'Appointment Cancelled',
      message: `Your appointment on ${appointment.appointment_date} has been cancelled.`,
      link: '/patient/appointments',
    });

    // NEW: Notify healthcare admin if cancellation is within 24 hours
    const hoursUntil = getHoursUntilAppointment(appointment.appointment_date, appointment.appointment_time);

    if (hoursUntil < 24) {
      // Get healthcare admin for this service
      const { data: healthcareAdmins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'healthcare_admin')
        .eq('assigned_service_id', appointment.service_id);

      if (healthcareAdmins && healthcareAdmins.length > 0) {
        // Determine urgency level and notification type
        let notificationTitle = '';
        let notificationType = 'late_cancellation';
        let notificationMessage = '';

        if (hoursUntil < 2) {
          // URGENT: Less than 2 hours
          notificationTitle = `🚨 URGENT: Last-minute cancellation (${Math.floor(hoursUntil * 60)} minutes notice)`;
          notificationType = 'urgent_cancellation';
          notificationMessage = `Patient cancelled appointment #${appointment.appointment_number} for ${appointment.services.name} on ${appointment.appointment_date}. Reason: ${cancellation_reason}. Slot may be available for walk-ins.`;
        } else if (hoursUntil < 24) {
          // Late cancellation (2-24 hours)
          notificationTitle = `⚠️ Late cancellation (${Math.floor(hoursUntil)} hours notice)`;
          notificationMessage = `Patient cancelled appointment #${appointment.appointment_number} for ${appointment.services.name} on ${appointment.appointment_date}. Reason: ${cancellation_reason}.`;
        }

        // Send notification to all healthcare admins assigned to this service
        const adminNotifications = healthcareAdmins.map(admin => ({
          user_id: admin.id,
          type: notificationType,
          title: notificationTitle,
          message: notificationMessage,
          link: '/healthcare-admin/appointments',
        }));

        await supabase.from('notifications').insert(adminNotifications);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
    });

  } catch (error) {
    console.error('Appointment cancellation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
