import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
 * PATCH /api/appointments/[id]
 * Update appointment status (check-in, in_progress, completed, no_show)
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
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status transition
    const validStatuses = ['checked_in', 'in_progress', 'completed', 'no_show'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = { status };

    // Set timestamps based on status
    if (status === 'checked_in') {
      updateData.checked_in_at = new Date().toISOString();
    } else if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    // Assign doctor if in_progress and not already assigned
    if (status === 'in_progress' && profile.role === 'doctor') {
      const { data: doctorRecord } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (doctorRecord) {
        updateData.doctor_id = doctorRecord.id;
      }
    }

    // Update appointment
    const { data: appointment, error: updateError } = await supabase
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

      // Check 24-hour cancellation policy
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursDifference < 24) {
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
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error cancelling appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel appointment' },
        { status: 500 }
      );
    }

    // Recalculate queue numbers for remaining appointments on the same day
    const { error: recalcError } = await supabase.rpc('recalculate_queue_numbers', {
      cancelled_date: appointment.appointment_date,
      cancelled_number: appointment.appointment_number,
    }).catch(() => {
      // If function doesn't exist, manually recalculate
      return supabase
        .from('appointments')
        .select('id, appointment_number')
        .eq('appointment_date', appointment.appointment_date)
        .gt('appointment_number', appointment.appointment_number)
        .in('status', ['scheduled', 'checked_in'])
        .then(async ({ data: laterAppointments }) => {
          if (laterAppointments && laterAppointments.length > 0) {
            for (const apt of laterAppointments) {
              await supabase
                .from('appointments')
                .update({ appointment_number: apt.appointment_number - 1 })
                .eq('id', apt.id);
            }
          }
          return { error: null };
        });
    });

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
