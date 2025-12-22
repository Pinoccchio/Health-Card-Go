import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/walk-in/queue
 * Fetch today's walk-in patients for the healthcare admin's assigned service
 *
 * Returns: List of walk-in patients registered today with their status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // 3. Verify user is Healthcare Admin
    if (profile.role !== 'healthcare_admin') {
      return NextResponse.json(
        { error: 'Access denied. Only Healthcare Admins can view walk-in queue.' },
        { status: 403 }
      );
    }

    if (!profile.assigned_service_id) {
      return NextResponse.json(
        { error: 'No service assigned to your account' },
        { status: 403 }
      );
    }

    // 4. Get today's date
    const today = new Date().toISOString().split('T')[0];

    // 5. Fetch today's walk-in patients for this service
    // Get appointments completed today for this service
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_number,
        appointment_date,
        appointment_time,
        status,
        created_at,
        patients!inner (
          id,
          patient_number,
          user_id,
          profiles!patients_user_id_fkey (
            first_name,
            last_name,
            contact_number,
            barangays (
              name
            )
          )
        )
      `)
      .eq('service_id', profile.assigned_service_id)
      .eq('appointment_date', today)
      .order('appointment_number', { ascending: true });

    if (appointmentsError) {
      console.error('Error fetching walk-in queue:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch walk-in queue', details: appointmentsError.message },
        { status: 500 }
      );
    }

    // 6. Transform data for frontend
    const walkInQueue = (appointments || []).map((apt: any) => ({
      id: apt.id,
      queue_number: apt.appointment_number,
      first_name: apt.patients?.profiles?.first_name || 'Unknown',
      last_name: apt.patients?.profiles?.last_name || 'Unknown',
      contact_number: apt.patients?.profiles?.contact_number || 'N/A',
      barangay_name: apt.patients?.profiles?.barangays?.name || 'Unknown',
      patient_number: apt.patients?.patient_number || 'N/A',
      registered_at: apt.created_at,
      status: apt.status === 'completed' ? 'completed' : 'waiting',
      appointment_time: apt.appointment_time,
    }));

    return NextResponse.json({
      success: true,
      data: walkInQueue,
      total: walkInQueue.length,
      date: today,
    });
  } catch (error) {
    console.error('Error in walk-in queue endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
