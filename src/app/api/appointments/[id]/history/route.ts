import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/appointments/[id]/history
 * Fetch the status change history for a specific appointment
 *
 * Returns: Array of status history entries with user details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;

    // 1. Verify authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user profile and verify role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, assigned_service_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. Only Healthcare Admins, Super Admins, and the patient can view history
    const allowedRoles = ['super_admin', 'healthcare_admin', 'patient'];
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Access denied. Only Healthcare Admins, Super Admins, and Patients can view appointment history.' },
        { status: 403 }
      );
    }

    // 4. Get the appointment to verify access
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, service_id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // 5. For Healthcare Admins, verify they have access to this service
    if (profile.role === 'healthcare_admin') {
      if (!profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'No service assigned to your account' },
          { status: 403 }
        );
      }

      if (appointment.service_id !== profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'You can only view history for appointments in your assigned service' },
          { status: 403 }
        );
      }
    }

    // 6. For Patients, verify this is their own appointment
    if (profile.role === 'patient') {
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (patientError || !patient) {
        return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 });
      }

      if (appointment.patient_id !== patient.id) {
        return NextResponse.json(
          { error: 'You can only view history for your own appointments' },
          { status: 403 }
        );
      }
    }

    // 7. Fetch status history with user details
    const { data: history, error: historyError } = await supabase
      .from('appointment_status_history')
      .select(`
        id,
        appointment_id,
        from_status,
        to_status,
        changed_at,
        reason,
        is_reversion,
        reverted_from_history_id,
        change_type,
        metadata,
        changed_by_profile:profiles!appointment_status_history_changed_by_fkey (
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq('appointment_id', appointmentId)
      .order('changed_at', { ascending: false });

    if (historyError) {
      console.error('Error fetching appointment history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch appointment history', details: historyError.message },
        { status: 500 }
      );
    }

    // 8. Transform data for frontend
    const transformedHistory = (history || []).map((entry: any) => ({
      id: entry.id,
      appointment_id: entry.appointment_id,
      from_status: entry.from_status,
      to_status: entry.to_status,
      changed_at: entry.changed_at,
      reason: entry.reason,
      is_reversion: entry.is_reversion,
      reverted_from_history_id: entry.reverted_from_history_id,
      change_type: entry.change_type,
      metadata: entry.metadata,
      changed_by_profile: entry.changed_by_profile ? {
        id: entry.changed_by_profile.id,
        first_name: entry.changed_by_profile.first_name,
        last_name: entry.changed_by_profile.last_name,
        role: entry.changed_by_profile.role,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: transformedHistory,
      total: transformedHistory.length,
    });

  } catch (error) {
    console.error('Error in appointment history endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
