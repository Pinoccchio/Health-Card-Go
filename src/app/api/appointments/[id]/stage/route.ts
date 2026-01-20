import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/appointments/[id]/stage
 * Update appointment stage for HealthCard appointments
 *
 * Body: { stage: 'check_in' | 'laboratory' | 'results' | 'checkup' | 'releasing' }
 * Access: Healthcare Admin assigned to service
 */
export async function PUT(
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

    // Only healthcare admins can update stages
    if (profile.role !== 'healthcare_admin') {
      return NextResponse.json(
        { success: false, error: 'Only healthcare admins can update appointment stages' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { stage, notes } = body;

    // Validate stage
    const validStages = ['check_in', 'laboratory', 'results', 'checkup', 'releasing'];
    if (!stage || !validStages.includes(stage)) {
      return NextResponse.json(
        { success: false, error: 'Invalid stage. Must be one of: ' + validStages.join(', ') },
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

    // Verify this is a health card service
    const healthCardCategories = ['healthcard'];
    if (!healthCardCategories.includes(appointment.service?.category)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stage tracking is only available for Health Card appointments',
        },
        { status: 400 }
      );
    }

    // Verify appointment is checked in
    if (appointment.status !== 'checked_in' && appointment.status !== 'in_progress') {
      return NextResponse.json(
        {
          success: false,
          error: 'Appointment must be checked in before updating stages',
        },
        { status: 400 }
      );
    }

    // Validate sequential progression
    const stageOrder = ['check_in', 'laboratory', 'results', 'checkup', 'releasing'];
    const currentStageIndex = appointment.appointment_stage
      ? stageOrder.indexOf(appointment.appointment_stage)
      : -1;
    const newStageIndex = stageOrder.indexOf(stage);

    if (newStageIndex !== currentStageIndex + 1 && stage !== appointment.appointment_stage) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Stages must be progressed sequentially. Current: ' +
            (appointment.appointment_stage || 'none') +
            ', Requested: ' +
            stage,
        },
        { status: 400 }
      );
    }

    // Update appointment stage
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        appointment_stage: stage,
        status: stage === 'releasing' ? 'in_progress' : appointment.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('[API] Error updating appointment stage:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update appointment stage' },
        { status: 500 }
      );
    }

    // Log stage transition in status history
    const { error: historyError } = await supabase.from('appointment_status_history').insert({
      appointment_id: appointmentId,
      from_status: appointment.status,
      to_status: updatedAppointment.status,
      changed_by: user.id,
      change_type: 'status_change',
      metadata: {
        previous_stage: appointment.appointment_stage,
        new_stage: stage,
        notes: notes || null,
        change_reason: 'stage_progression',
      },
    });

    if (historyError) {
      console.error('[API] Error logging stage history:', historyError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({
      success: true,
      message: `Appointment stage updated to ${stage}`,
      data: updatedAppointment,
    });
  } catch (error) {
    console.error('[API] Unexpected error updating appointment stage:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
