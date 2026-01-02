import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { logAuditAction, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/utils/auditLog';

/**
 * PATCH /api/appointments/[id]
 * Update appointment status (for walk-in queue management)
 *
 * Allowed transitions:
 * - checked_in -> in_progress (Start Consultation)
 * - in_progress -> completed (via /complete endpoint instead)
 * - scheduled -> checked_in (Regular appointments checking in)
 */
export async function PATCH(
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only Healthcare Admins and Super Admins can update appointments
    if (profile.role !== 'healthcare_admin' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only Healthcare Admins and Super Admins can update appointments' },
        { status: 403 }
      );
    }

    // Create admin client to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminClient = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get appointment
    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Healthcare Admins can only update appointments for their assigned service
    if (profile.role === 'healthcare_admin') {
      if (!profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'No service assigned to your account' },
          { status: 403 }
        );
      }

      if (appointment.service_id !== profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'You can only update appointments for your assigned service' },
          { status: 403 }
        );
      }
    }

    // Get request body
    const body = await request.json();
    const { status: newStatus, revert_to_history_id, reason } = body;

    // Check if this is a revert operation FIRST (before validating status)
    let isRevertOperation = false;
    let historyEntry = null;
    let targetStatus = newStatus; // Default to provided status

    if (revert_to_history_id) {
      // Validate the history entry exists and belongs to this appointment
      const { data: history, error: historyError } = await adminClient
        .from('appointment_status_history')
        .select('*')
        .eq('id', revert_to_history_id)
        .eq('appointment_id', appointmentId)
        .single();

      if (historyError || !history) {
        return NextResponse.json(
          { error: 'Invalid history entry for revert operation' },
          { status: 400 }
        );
      }

      // For revert operations, infer the target status from the history entry
      targetStatus = history.from_status;
      isRevertOperation = true;
      historyEntry = history;
    } else {
      // For normal status changes, status is required
      if (!newStatus) {
        return NextResponse.json(
          { error: 'Status is required' },
          { status: 400 }
        );
      }
    }

    // Validate status transition (skip for revert operations)
    if (!isRevertOperation) {
      // Prevent circular transitions (transitioning to the same status)
      if (appointment.status === targetStatus) {
        return NextResponse.json(
          {
            error: `Cannot transition to the same status. Appointment is already '${appointment.status}'.`,
            current: appointment.status,
          },
          { status: 400 }
        );
      }

      const validTransitions: Record<string, string[]> = {
        'checked_in': ['in_progress', 'cancelled'],
        'in_progress': ['completed', 'cancelled'],
        'scheduled': ['checked_in', 'cancelled'],
      };

      const allowedStatuses = validTransitions[appointment.status] || [];
      if (!allowedStatuses.includes(targetStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from '${appointment.status}' to '${targetStatus}'`,
            allowed: allowedStatuses,
            current: appointment.status,
          },
          { status: 400 }
        );
      }

      // Sequential consultation enforcement: Only allow one 'in_progress' at a time per service per date
      if (targetStatus === 'in_progress') {
        const { data: existingInProgress, error: checkError } = await adminClient
          .from('appointments')
          .select('id, appointment_number')
          .eq('service_id', appointment.service_id)
          .eq('appointment_date', appointment.appointment_date)
          .eq('status', 'in_progress')
          .neq('id', appointmentId)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking for in-progress appointments:', checkError);
          return NextResponse.json(
            { error: 'Failed to validate consultation state', details: checkError.message },
            { status: 500 }
          );
        }

        if (existingInProgress) {
          return NextResponse.json(
            {
              error: 'Another consultation is already in progress',
              message: `Queue #${existingInProgress.appointment_number} is currently being consulted. Please wait for it to complete before starting a new consultation.`,
              current_in_progress: existingInProgress.appointment_number
            },
            { status: 409 } // 409 Conflict
          );
        }
      }
    }

    // Prepare reversion metadata to pass to trigger
    let reversionMetadata = null;
    if (isRevertOperation && historyEntry) {
      reversionMetadata = {
        is_reversion: true,
        reverted_from_history_id: revert_to_history_id,
        reason: reason || 'Reverted to previous status',
        changed_by_id: profile.id  // Include user ID for trigger
      };
    } else {
      // For normal status changes, still include changed_by_id
      reversionMetadata = {
        is_reversion: false,
        changed_by_id: profile.id
      };
    }

    // Update appointment status
    const now = new Date().toISOString();
    const updateData: any = {
      status: targetStatus,
      updated_at: now,
      _reversion_metadata: reversionMetadata,
    };

    // Clear timestamps when reverting to earlier status
    if (isRevertOperation && revert_to_history_id) {
      if (targetStatus === 'scheduled') {
        updateData.checked_in_at = null;
        updateData.started_at = null;
        updateData.completed_at = null;
        updateData.completed_by_id = null;
      }
      else if (targetStatus === 'checked_in') {
        updateData.started_at = null;
        updateData.completed_at = null;
        updateData.completed_by_id = null;
      }
      else if (targetStatus === 'in_progress') {
        updateData.completed_at = null;
        updateData.completed_by_id = null;
      }
    }

    // Set timestamp based on new status
    if (targetStatus === 'checked_in' && !appointment.checked_in_at) {
      updateData.checked_in_at = now;
    }

    if (targetStatus === 'in_progress' && !appointment.started_at) {
      updateData.started_at = now;
    }

    if (targetStatus === 'completed' && !appointment.completed_at) {
      updateData.completed_at = now;
      updateData.completed_by_id = profile.id;
    }

    const { data: updatedAppointment, error: updateError } = await adminClient
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update appointment', details: updateError.message },
        { status: 500 }
      );
    }

    // Get patient data for notifications
    const { data: appointmentWithPatient } = await adminClient
      .from('appointments')
      .select('appointment_number, appointment_date, appointment_time, patients!inner(user_id)')
      .eq('id', appointmentId)
      .single();

    // Send notifications based on status change
    if (appointmentWithPatient) {
      const queueNumber = appointmentWithPatient.appointment_number;
      const patientUserId = appointmentWithPatient.patients.user_id;

      try {
        // Check-in notification
        if (targetStatus === 'checked_in' && !isRevertOperation) {
          await adminClient.from('notifications').insert({
            user_id: patientUserId,
            type: 'general',
            title: 'notifications.check_in_success.title',
            message: 'notifications.check_in_success.message',
            link: '/patient/appointments',
            data: `appointment_number=${queueNumber}`
          });
          console.log(`✅ [NOTIFICATION] Check-in notification sent for appointment #${queueNumber}`);
        }

        // Consultation started notification
        if (targetStatus === 'in_progress' && !isRevertOperation) {
          await adminClient.from('notifications').insert({
            user_id: patientUserId,
            type: 'general',
            title: 'notifications.consultation_started.title',
            message: 'notifications.consultation_started.message',
            link: '/patient/appointments',
            data: `appointment_number=${queueNumber}`
          });
          console.log(`✅ [NOTIFICATION] Consultation started notification sent for appointment #${queueNumber}`);
        }

        // Cancellation notification
        if (targetStatus === 'cancelled' && !isRevertOperation) {
          await adminClient.from('notifications').insert({
            user_id: patientUserId,
            type: 'cancellation',
            title: 'notifications.appointment_cancelled.title',
            message: 'notifications.appointment_cancelled.message',
            link: '/patient/appointments',
            data: `appointment_number=${queueNumber}|date=${appointmentWithPatient.appointment_date}|time=${appointmentWithPatient.appointment_time}|reason=${reason || ''}`
          });
          console.log(`✅ [NOTIFICATION] Cancellation notification sent for appointment #${queueNumber}`);
        }

        // Status revert notification
        if (isRevertOperation && historyEntry) {
          await adminClient.from('notifications').insert({
            user_id: patientUserId,
            type: 'general',
            title: 'notifications.appointment_status_updated.title',
            message: 'notifications.appointment_status_updated.message',
            link: '/patient/appointments',
            data: `appointment_number=${queueNumber}|new_status=${targetStatus}|reason=${reason || ''}`
          });
          console.log(`✅ [NOTIFICATION] Revert notification sent for appointment #${queueNumber}: ${appointment.status} → ${targetStatus}`);
        }
      } catch (notificationError) {
        // Log error but don't fail the status update
        console.error('❌ [NOTIFICATION ERROR] Failed to send notification:', notificationError);
      }
    }

    // Enhanced server logging for status changes
    console.log(`✅ [APPOINTMENT STATUS UPDATE] ID: ${appointmentId}, ${appointment.status} → ${targetStatus}, Queue #${appointment.appointment_number}, Date: ${appointment.appointment_date}, Time: ${appointment.appointment_time}${isRevertOperation ? ' (REVERT)' : ''}`);

    // Revalidate the appointments page cache
    revalidatePath('/healthcare-admin/appointments');

    // Log audit trail
    const auditAction = targetStatus === 'cancelled'
      ? AUDIT_ACTIONS.APPOINTMENT_CANCELLED
      : targetStatus === 'checked_in'
      ? AUDIT_ACTIONS.APPOINTMENT_CHECKED_IN
      : AUDIT_ACTIONS.APPOINTMENT_UPDATED;

    await logAuditAction({
      supabase,
      userId: profile.id,
      action: auditAction,
      entityType: AUDIT_ENTITIES.APPOINTMENT,
      entityId: appointmentId,
      changes: {
        before: { status: appointment.status },
        after: { status: targetStatus, is_reversion: isRevertOperation },
      },
      request,
    });

    return NextResponse.json({
      success: true,
      message: isRevertOperation
        ? `Status successfully reverted to ${newStatus}`
        : `Appointment status updated to ${newStatus}`,
      data: updatedAppointment,
    });

  } catch (error) {
    console.error('Appointment update error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
