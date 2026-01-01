import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPhilippineTime } from '@/lib/utils/timezone';

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
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get user profile and verify role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, assigned_service_id')
      .eq('id', user.id)
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

    // 4. Get today's date in Philippine Time
    const nowPHT = getPhilippineTime();
    const today = `${nowPHT.getUTCFullYear()}-${String(nowPHT.getUTCMonth() + 1).padStart(2, '0')}-${String(nowPHT.getUTCDate()).padStart(2, '0')}`;

    // 5. Fetch today's walk-in patients for this service
    // Only show active appointments (checked_in, in_progress) - not completed ones
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_number,
        appointment_date,
        appointment_time,
        time_block,
        status,
        checked_in_at,
        started_at,
        completed_at,
        created_at,
        patients!inner (
          id,
          patient_number,
          user_id,
          blood_type,
          allergies,
          current_medications,
          profiles!patients_user_id_fkey (
            first_name,
            last_name,
            email,
            contact_number,
            date_of_birth,
            gender,
            barangay_id,
            emergency_contact,
            barangays (
              id,
              name
            )
          )
        )
      `)
      .eq('service_id', profile.assigned_service_id)
      .eq('appointment_date', today)
      .in('status', ['checked_in', 'in_progress']) // Only show active walk-ins, not completed
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
      id: apt.id, // appointment ID for actions
      appointment_id: apt.id, // alias for clarity in frontend
      queue_number: apt.appointment_number,
      first_name: apt.patients?.profiles?.first_name || 'Unknown',
      last_name: apt.patients?.profiles?.last_name || 'Unknown',
      patient_number: apt.patients?.patient_number || 'N/A',
      email: apt.patients?.profiles?.email || '',
      contact_number: apt.patients?.profiles?.contact_number || 'N/A',
      date_of_birth: apt.patients?.profiles?.date_of_birth || '',
      gender: apt.patients?.profiles?.gender || '',
      barangay_id: apt.patients?.profiles?.barangay_id || null,
      barangay_name: apt.patients?.profiles?.barangays?.name || 'Unknown',
      emergency_contact: apt.patients?.profiles?.emergency_contact || null,
      blood_type: apt.patients?.blood_type || null,
      allergies: apt.patients?.allergies || null,
      current_medications: apt.patients?.current_medications || null,
      appointment_date: apt.appointment_date, // Actual appointment date
      appointment_time: apt.appointment_time,
      time_block: apt.time_block,
      checked_in_at: apt.checked_in_at,
      started_at: apt.started_at,
      completed_at: apt.completed_at,
      registered_at: apt.created_at,
      status: apt.status === 'in_progress' ? 'in_progress'
        : apt.status === 'checked_in' ? 'waiting'
        : 'completed', // Fallback for any completed appointments
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
