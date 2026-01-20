import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/appointments/[id]/reschedule
 * Reschedule an appointment for retest (typically "back after 1 week" scenario)
 *
 * Body: { reason: string }
 * Access: Healthcare Admin assigned to service
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only healthcare admins can reschedule
    if (profile.role !== 'healthcare_admin') {
      return NextResponse.json(
        { success: false, error: 'Only healthcare admins can reschedule appointments' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Reschedule reason is required' },
        { status: 400 }
      );
    }

    // Get current appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*, service:services(id, name, category)')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify healthcare admin is assigned to this service
    if (
      profile.assigned_service_id &&
      appointment.service_id !== profile.assigned_service_id
    ) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this service' },
        { status: 403 }
      );
    }

    // Update appointment to rescheduled status
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'rescheduled',
        cancellation_reason: reason,
        appointment_stage: null, // Reset stage progression
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error rescheduling appointment:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to reschedule appointment' },
        { status: 500 }
      );
    }

    // Log status change in history
    const { error: historyError } = await supabase.from('appointment_status_history').insert({
      appointment_id: appointmentId,
      from_status: appointment.status,
      to_status: 'rescheduled',
      changed_by: user.id,
      change_type: 'reschedule',
      metadata: {
        reason: reason,
        previous_stage: appointment.appointment_stage,
        reschedule_type: 'retest_required',
      },
    });

    if (historyError) {
      console.error('[API] Error logging reschedule history:', historyError);
      // Don't fail the request, just log the error
    }

    // Recalculate queue numbers for remaining appointments on same day
    const { error: recalcError } = await supabase.rpc('recalculate_queue_numbers', {
      target_date: appointment.appointment_date,
      time_block_param: appointment.time_block,
    });

    if (recalcError) {
      console.error('[API] Error recalculating queue numbers:', recalcError);
      // Don't fail the request, just log the error
    }

    // Create notification for patient
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: appointment.patient_id,
      title: 'Appointment Rescheduled',
      message: `Your appointment on ${new Date(appointment.appointment_date).toLocaleDateString()} requires additional laboratory testing. Please book a new appointment for follow-up tests in approximately 1 week.`,
      type: 'appointment_reschedule',
      read: false,
      metadata: {
        appointment_id: appointmentId,
        reason: reason,
        reschedule_type: 'retest_required',
      },
    });

    if (notifError) {
      console.error('[API] Error creating notification:', notifError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: updatedAppointment,
    });
  } catch (error) {
    console.error('[API] Unexpected error rescheduling appointment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
