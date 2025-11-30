import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/patients/doctor-patients
 * Fetch unique patients from doctor's appointments
 * Security: Only returns patients the authenticated doctor has appointments with
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a doctor
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Forbidden: Only doctors can access this endpoint' },
        { status: 403 }
      );
    }

    // Get doctor record
    const { data: doctorRecord } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!doctorRecord) {
      return NextResponse.json({ error: 'Doctor record not found' }, { status: 404 });
    }

    // Parse query parameters
    const search = searchParams.get('search') || '';
    const barangay_id = searchParams.get('barangay_id');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Use admin client for complex joins
    const adminClient = createAdminClient();

    // Get unique patient IDs from doctor's appointments
    const { data: appointments, error: appointmentsError } = await adminClient
      .from('appointments')
      .select('patient_id')
      .eq('doctor_id', doctorRecord.id);

    if (appointmentsError) {
      console.error('Error fetching appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // Extract unique patient IDs
    const patientIds = [...new Set(appointments.map(a => a.patient_id))];

    // Build query for patients with profiles and barangays
    let query = adminClient
      .from('patients')
      .select(`
        *,
        profiles!inner(
          id,
          first_name,
          last_name,
          email,
          contact_number,
          date_of_birth,
          gender,
          barangay_id,
          emergency_contact,
          status,
          barangays(
            id,
            name,
            code
          )
        )
      `, { count: 'exact' })
      .in('id', patientIds);

    // Apply search filter (name or patient number)
    if (search) {
      query = query.or(
        `patient_number.ilike.%${search}%,profiles.first_name.ilike.%${search}%,profiles.last_name.ilike.%${search}%`
      );
    }

    // Apply barangay filter
    if (barangay_id) {
      query = query.eq('profiles.barangay_id', barangay_id);
    }

    // Apply status filter
    if (status) {
      if (status === 'inactive') {
        // Include both inactive and rejected statuses
        query = query.in('profiles.status', ['inactive', 'rejected']);
      } else {
        query = query.eq('profiles.status', status);
      }
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: patients, error: patientsError, count } = await query;

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    // Get last appointment date for each patient
    const patientsWithLastVisit = await Promise.all(
      (patients || []).map(async (patient) => {
        const { data: lastAppointment } = await adminClient
          .from('appointments')
          .select('appointment_date, appointment_time, status')
          .eq('patient_id', patient.id)
          .eq('doctor_id', doctorRecord.id)
          .order('appointment_date', { ascending: false })
          .limit(1)
          .single();

        return {
          ...patient,
          last_visit: lastAppointment ? {
            date: lastAppointment.appointment_date,
            time: lastAppointment.appointment_time,
            status: lastAppointment.status,
          } : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: patientsWithLastVisit,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Doctor patients fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
