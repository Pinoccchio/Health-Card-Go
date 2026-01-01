import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/appointments/[id]/medical-records
 * Get medical records associated with a specific appointment
 *
 * Accessible by:
 * - Healthcare Admin (if appointment is for their assigned service)
 * - Super Admin (all appointments)
 * - Patient (if they own the appointment)
 */
export async function GET(
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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, admin_category, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log('👤 [PROFILE] User:', user.id, '| Role:', profile.role, '| Appointment ID:', appointmentId);

    // Use admin client to bypass RLS for nested joins
    // Security: Authentication verified above, role-based filtering applied below
    const adminClient = createAdminClient();

    // First, get the appointment to verify access
    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select('id, service_id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Role-based authorization
    if (profile.role === 'patient') {
      // Patients can only see records for their own appointments
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!patientRecord || patientRecord.id !== appointment.patient_id) {
        return NextResponse.json(
          { error: 'You can only view medical records for your own appointments' },
          { status: 403 }
        );
      }
    } else if (profile.role === 'healthcare_admin') {
      // Healthcare admins can only see records from appointments in their assigned service
      if (!profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'No service assigned to your account' },
          { status: 403 }
        );
      }

      if (appointment.service_id !== profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'You can only view medical records for appointments in your assigned service' },
          { status: 403 }
        );
      }
    } else if (profile.role !== 'super_admin') {
      // Only super_admin, healthcare_admin, and patient roles are allowed
      return NextResponse.json(
        { error: 'You do not have permission to view medical records' },
        { status: 403 }
      );
    }

    // Fetch medical records for this appointment
    const { data: records, error: recordsError } = await adminClient
      .from('medical_records')
      .select(`
        *,
        patients!inner(
          id,
          patient_number,
          user_id,
          profiles!inner(
            first_name,
            last_name,
            date_of_birth,
            gender,
            barangay_id
          )
        ),
        created_by:profiles!created_by_id(
          id,
          first_name,
          last_name
        ),
        appointments(
          id,
          appointment_number,
          appointment_date,
          appointment_time,
          status,
          service_id,
          services(
            id,
            name,
            category
          )
        )
      `)
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });

    if (recordsError) {
      console.error('Error fetching medical records:', recordsError);
      return NextResponse.json(
        { error: 'Failed to fetch medical records' },
        { status: 500 }
      );
    }

    console.log('📋 [MEDICAL RECORDS] Found', records?.length || 0, 'records for appointment', appointmentId);

    return NextResponse.json({
      success: true,
      data: records || [],
      count: records?.length || 0,
      appointment_id: appointmentId,
    });

  } catch (error) {
    console.error('Error in GET /api/appointments/[id]/medical-records:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
