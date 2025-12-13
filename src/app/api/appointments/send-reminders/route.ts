import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatTimeBlock, TimeBlock } from '@/types/appointment';

/**
 * POST /api/appointments/send-reminders
 * Send automated appointment reminders to patients
 * Reminders sent 3 days before scheduled appointment
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Calculate reminder window (3 days from now)
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 3);
    const reminderDateStr = reminderDate.toISOString().split('T')[0];

    // Find appointments that need reminders
    // - Scheduled for 3 days from now
    // - Status: scheduled
    // - reminder_sent: false or null
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        time_block,
        appointment_number,
        patient_id,
        patients!inner(
          user_id,
          patient_number,
          profiles!inner(
            id,
            first_name,
            last_name,
            email
          )
        ),
        services(name)
      `)
      .eq('appointment_date', reminderDateStr)
      .eq('status', 'scheduled')
      .or('reminder_sent.is.null,reminder_sent.eq.false');

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      throw fetchError;
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No appointments require reminders at this time',
        reminders_sent: 0,
      });
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Send reminder for each appointment
    for (const appointment of appointments) {
      try {
        const patient = appointment.patients;
        const profile = patient.profiles;

        // Create notification
        const blockInfo = formatTimeBlock(appointment.time_block as TimeBlock);
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: profile.id,
            type: 'appointment_reminder',
            title: 'Appointment Reminder',
            message: `Hi ${profile.first_name}! This is a reminder that you have an appointment scheduled for ${new Date(appointment.appointment_date).toLocaleDateString()} in the ${blockInfo}. Your queue number is ${appointment.appointment_number}. ${appointment.services?.name ? `Service: ${appointment.services.name}.` : ''} Please arrive 15 minutes early.`,
            link: '/patient/appointments',
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
          errorCount++;
          results.push({
            appointment_id: appointment.id,
            patient_number: patient.patient_number,
            success: false,
            error: notifError.message,
          });
          continue;
        }

        // Mark appointment as reminder_sent
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ reminder_sent: true })
          .eq('id', appointment.id);

        if (updateError) {
          console.error('Error updating appointment:', updateError);
          errorCount++;
          results.push({
            appointment_id: appointment.id,
            patient_number: patient.patient_number,
            success: false,
            error: updateError.message,
          });
          continue;
        }

        successCount++;
        results.push({
          appointment_id: appointment.id,
          patient_number: patient.patient_number,
          patient_name: `${profile.first_name} ${profile.last_name}`,
          appointment_date: appointment.appointment_date,
          time_block: formatTimeBlock(appointment.time_block as TimeBlock),
          success: true,
        });

      } catch (error: any) {
        console.error('Error processing reminder:', error);
        errorCount++;
        results.push({
          appointment_id: appointment.id,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} reminder(s) successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      reminders_sent: successCount,
      errors: errorCount,
      details: results,
      reminder_date: reminderDateStr,
    });

  } catch (error: any) {
    console.error('Error in send-reminders API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/appointments/send-reminders
 * Preview appointments that would receive reminders (dry run)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Calculate reminder window (3 days from now)
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 3);
    const reminderDateStr = reminderDate.toISOString().split('T')[0];

    // Find appointments that need reminders
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        time_block,
        appointment_number,
        reminder_sent,
        patient_id,
        patients!inner(
          patient_number,
          profiles!inner(
            first_name,
            last_name,
            email
          )
        ),
        services(name)
      `)
      .eq('appointment_date', reminderDateStr)
      .eq('status', 'scheduled')
      .or('reminder_sent.is.null,reminder_sent.eq.false');

    if (fetchError) {
      throw fetchError;
    }

    const preview = appointments?.map(apt => ({
      appointment_id: apt.id,
      patient_number: apt.patients.patient_number,
      patient_name: `${apt.patients.profiles.first_name} ${apt.patients.profiles.last_name}`,
      email: apt.patients.profiles.email,
      appointment_date: apt.appointment_date,
      time_block: formatTimeBlock(apt.time_block as TimeBlock),
      queue_number: apt.appointment_number,
      service: apt.services?.name,
      reminder_sent: apt.reminder_sent,
    })) || [];

    return NextResponse.json({
      success: true,
      reminder_date: reminderDateStr,
      appointments_to_remind: preview.length,
      appointments: preview,
    });

  } catch (error: any) {
    console.error('Error in send-reminders preview:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
