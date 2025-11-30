import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/appointments/[id]/history
 * Get status change history for an appointment
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

    // Get user profile for authorization
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch appointment to verify access
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, patient_id')
      .eq('id', id)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Authorization: Check if user can view this appointment
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

    // Fetch status history with user details and doctor information
    // Use admin client to bypass RLS for cross-profile lookups
    // (We've already verified authentication and authorization above)
    const adminClient = createAdminClient();
    const { data: history, error: historyError } = await adminClient
      .from('appointment_status_history')
      .select(`
        *,
        changed_by_profile:profiles!changed_by(
          first_name,
          last_name,
          role
        ),
        old_doctor:doctors!old_doctor_id(
          id,
          profiles(
            first_name,
            last_name,
            specialization
          )
        ),
        new_doctor:doctors!new_doctor_id(
          id,
          profiles(
            first_name,
            last_name,
            specialization
          )
        )
      `)
      .eq('appointment_id', id)
      .order('changed_at', { ascending: false }); // Return newest first for correct "last entry" retrieval

    if (historyError) {
      console.error('Error fetching history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch status history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: history || [],
    });

  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
