import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { logAuditAction, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/utils/auditLog';

/**
 * POST /api/appointments/[id]/complete
 * Complete an appointment (Healthcare Admin or Super Admin only)
 *
 * Business Rules:
 * - Only Healthcare Admins or Super Admins can complete appointments
 * - Healthcare Admins can only complete appointments for their assigned service
 * - Appointment must be in 'in_progress' status
 * - Updates appointment status to 'completed' and sets completion metadata
 * - Sends feedback request notification to patient
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

    // Only Healthcare Admins and Super Admins can complete appointments
    if (profile.role !== 'healthcare_admin' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only Healthcare Admins and Super Admins can complete appointments' },
        { status: 403 }
      );
    }

    // Get appointment with service details
    const adminClient = createAdminClient();
    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select(`
        *,
        services!inner(
          id,
          name,
          category
        ),
        patients!inner(
          id,
          user_id
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Healthcare Admins can only complete appointments for their assigned service
    if (profile.role === 'healthcare_admin') {
      if (!profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'No service assigned to your account' },
          { status: 403 }
        );
      }

      if (appointment.service_id !== profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'You can only complete appointments for your assigned service' },
          { status: 403 }
        );
      }
    }

    // Verify appointment can be completed (must be in_progress)
    if (appointment.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Cannot complete appointment with status '${appointment.status}'. Appointment must be in 'in_progress' status to be completed.` },
        { status: 400 }
      );
    }

    // Update appointment status to completed
    const now = new Date().toISOString();
    const { data: updatedAppointment, error: updateError } = await adminClient
      .from('appointments')
      .update({
        status: 'completed',
        completed_at: now,
        completed_by_id: profile.id,
        updated_at: now,
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete appointment' },
        { status: 500 }
      );
    }

    // Send notification to patient (prompt for feedback)
    await adminClient.from('notifications').insert({
      user_id: appointment.patients.user_id,
      type: 'feedback_request',
      title: 'Appointment Completed - Share Your Feedback',
      message: `Your appointment #${appointment.appointment_number} has been completed successfully! Please take a moment to share your experience with us.`,
      link: '/patient/feedback',
    });

    // Revalidate the appointments page cache
    revalidatePath('/healthcare-admin/appointments');

    // Log audit trail
    await logAuditAction({
      supabase,
      userId: profile.id, // Healthcare Admin or Super Admin who completed the appointment
      action: AUDIT_ACTIONS.APPOINTMENT_COMPLETED,
      entityType: AUDIT_ENTITIES.APPOINTMENT,
      entityId: appointment.id,
      changes: {
        before: { status: 'scheduled' },
        after: {
          status: 'completed',
          completed_at: updatedAppointment.completed_at,
        },
      },
      request,
    });

    return NextResponse.json({
      success: true,
      message: 'Appointment completed successfully',
      data: {
        appointment: updatedAppointment,
      },
    });

  } catch (error) {
    console.error('Appointment completion error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
