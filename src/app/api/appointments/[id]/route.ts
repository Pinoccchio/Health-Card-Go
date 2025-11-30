import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { canCancelAppointment, getPhilippineTime } from '@/lib/utils/timezone';

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

    // Fetch appointment with related data
    const { data: appointment, error: fetchError } = await supabase
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
            barangay_id,
            barangays(name)
          )
        ),
        doctors(
          id,
          user_id,
          profiles(
            first_name,
            last_name,
            specialization
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

  return NextResponse.json({
    success: true,
    data: updatedAppointment,
    message: `Status reverted to ${targetStatus}`,
  });
}

/**
 * PATCH /api/appointments/[id]
 * Update appointment (assign doctor, check-in, status updates)
 * Only doctors and admins can update
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

    // Only doctors, healthcare admins, and super admins can update appointments
    if (!['doctor', 'healthcare_admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only medical staff can update appointments' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { status, notes, doctor_id, revert_to_history_id, reason } = body;

    // Handle status reversion
    if (revert_to_history_id) {
      return handleStatusReversion(supabase, id, revert_to_history_id, user.id, reason);
    }

    // Build update object
    const updateData: any = {};

    // Handle doctor assignment (healthcare admin action)
    if (doctor_id !== undefined) {
      if (!['healthcare_admin', 'super_admin'].includes(profile.role)) {
        return NextResponse.json(
          { error: 'Only admins can assign doctors' },
          { status: 403 }
        );
      }

      // Allow null to unassign doctor
      if (doctor_id !== null) {
        // Only validate if assigning a doctor (not unassigning)
        const { data: doctorExists } = await supabase
          .from('doctors')
          .select('id')
          .eq('id', doctor_id)
          .single();

        if (!doctorExists) {
          return NextResponse.json(
            { error: 'Invalid doctor ID' },
            { status: 400 }
          );
        }
      }

      updateData.doctor_id = doctor_id;
    }

    // Handle status updates
    if (status) {
      // Validate status transition
      const validStatuses = ['checked_in', 'in_progress', 'completed', 'no_show'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status' },
          { status: 400 }
        );
      }

      // Business rule: Cannot mark future appointments as no_show
      if (status === 'no_show') {
        const philippineNow = getPhilippineTime();
        const appointmentDate = new Date(appointment.appointment_date);

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

      updateData.status = status;

      // Set timestamps based on status
      if (status === 'checked_in') {
        updateData.checked_in_at = new Date().toISOString();
      } else if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      // Assign doctor if in_progress and not already assigned
      if (status === 'in_progress' && profile.role === 'doctor' && !doctor_id) {
        const { data: doctorRecord } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (doctorRecord) {
          updateData.doctor_id = doctorRecord.id;
        }
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
          changed_by: user.id, // Use the authenticated user ID (doctor/admin), not patient!
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

    // Get appointment
    const { data: appointment, error: fetchError } = await supabase
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

      // Check 24-hour cancellation policy (using Philippine timezone)
      if (!canCancelAppointment(appointment.appointment_date, appointment.appointment_time)) {
        return NextResponse.json(
          { error: 'Appointments can only be cancelled at least 24 hours in advance' },
          { status: 400 }
        );
      }
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

    // Send cancellation notification
    await supabase.from('notifications').insert({
      user_id: appointment.patients.user_id,
      type: 'cancellation',
      title: 'Appointment Cancelled',
      message: `Your appointment on ${appointment.appointment_date} has been cancelled.`,
      link: '/patient/appointments',
    });

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
