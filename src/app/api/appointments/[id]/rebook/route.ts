import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/appointments/[id]/rebook
 *
 * Fetches details of a cancelled appointment for rebooking.
 * Returns appointment data needed to pre-fill the booking form.
 *
 * Only accessible by the patient who owns the appointment.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch cancelled appointment with all necessary details
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        service_id,
        card_type,
        lab_location,
        appointment_date,
        appointment_time,
        time_block,
        reason,
        status,
        cancellation_reason,
        services:services(
          id,
          name,
          category
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Verify ownership - only patient who owns the appointment can rebook
    const { data: patient } = await supabase
      .from('patients')
      .select('user_id')
      .eq('id', appointment.patient_id)
      .single();

    if (!patient || patient.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only rebook your own appointments' },
        { status: 403 }
      );
    }

    // Verify appointment is cancelled
    if (appointment.status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Only cancelled appointments can be rebooked' },
        { status: 400 }
      );
    }

    // Return appointment data for pre-filling booking form
    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        service_id: appointment.service_id,
        service_name: appointment.services?.name,
        service_category: appointment.services?.category,
        card_type: appointment.card_type,
        lab_location: appointment.lab_location,
        previous_date: appointment.appointment_date,
        previous_time: appointment.appointment_time,
        previous_time_block: appointment.time_block,
        reason: appointment.reason,
        cancellation_reason: appointment.cancellation_reason,
      },
    });
  } catch (error) {
    console.error('Error fetching appointment for rebook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
