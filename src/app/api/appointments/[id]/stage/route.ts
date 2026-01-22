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

    // Check if user is healthcare admin or patient
    const isAdmin = profile.role === 'healthcare_admin';
    const isPatient = profile.role === 'patient';

    if (!isAdmin && !isPatient) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update appointment stages' },
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
      .select('*, service:services(id, name, category), card_type, patient_id')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // If patient, verify they own this appointment
    if (isPatient) {
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError || !patientData || appointment.patient_id !== patientData.id) {
        return NextResponse.json(
          { success: false, error: 'You can only update your own appointments' },
          { status: 403 }
        );
      }

      // Patients can ONLY update laboratory and results (stages 2, 3)
      if (!['laboratory', 'results'].includes(stage)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Patients can only update Laboratory and Results stages. Check-in, Check-up, and Releasing are managed by healthcare staff.',
          },
          { status: 403 }
        );
      }
    }

    // If healthcare admin, verify assigned to service and restrict to check_in/releasing only
    if (isAdmin) {
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

      // Healthcare admins can ONLY update check_in, checkup, and releasing (stages 1, 4, 5)
      if (!['check_in', 'checkup', 'releasing'].includes(stage)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Healthcare admins can only update Check-in, Check-up, and Releasing stages. Patients control the Laboratory stage.',
          },
          { status: 403 }
        );
      }
    }

    // Verify this is a health card service or Pink Card (Service 12 or Service 24 only)
    // Service 16 (HIV) and Service 17 (Pregnancy) do NOT have stage tracking
    const isHealthCardService = appointment.service?.category === 'healthcard';
    const isPinkCardService = appointment.service?.category === 'pink_card';

    if (!isHealthCardService && !isPinkCardService) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stage tracking is only available for Health Card and Pink Card appointments',
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

    // Note: Status history is automatically logged by database trigger (log_appointment_status_change)
    // No manual insert needed - trigger captures from_status, to_status, changed_by, and change_type

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
