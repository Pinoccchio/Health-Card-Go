import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/appointments
 * Create a new appointment with automatic queue number assignment
 *
 * Business Rules:
 * - 7-day advance booking required
 * - One active appointment per patient
 * - Max 100 appointments per service per day
 * - Queue numbers: 1-100 per service per day
 * - Operating hours: 8 AM - 5 PM, Monday-Friday
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { service_id, appointment_date, appointment_time, reason } = body;

    // Validate required fields
    if (!service_id || !appointment_date || !appointment_time) {
      return NextResponse.json(
        { error: 'Service, date, and time are required' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only patients can book appointments
    if (profile.role !== 'patient') {
      return NextResponse.json(
        { error: 'Only patients can book appointments' },
        { status: 403 }
      );
    }

    // Check if patient is approved (status = 'active')
    if (profile.status !== 'active') {
      return NextResponse.json(
        { error: 'Your account must be approved before booking appointments' },
        { status: 403 }
      );
    }

    // Get patient record
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
    }

    // Validate service exists and requires appointment
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, category, requires_appointment, is_active')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    if (!service.is_active) {
      return NextResponse.json({ error: 'This service is not currently available' }, { status: 400 });
    }

    if (!service.requires_appointment) {
      return NextResponse.json(
        { error: 'This service does not require an appointment (walk-in only)' },
        { status: 400 }
      );
    }

    // Validate 7-day advance booking (using Philippine timezone UTC+8)
    const appointmentDate = new Date(appointment_date + 'T00:00:00+08:00');

    // Get current date in Philippine timezone
    const nowPhilippines = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const todayPhilippines = new Date(nowPhilippines.getFullYear(), nowPhilippines.getMonth(), nowPhilippines.getDate());

    const daysDifference = Math.ceil((appointmentDate.getTime() - todayPhilippines.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference < 7) {
      return NextResponse.json(
        { error: 'Appointments must be booked at least 7 days in advance' },
        { status: 400 }
      );
    }

    // Validate weekday (Monday-Friday)
    const dayOfWeek = appointmentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json(
        { error: 'Appointments are only available Monday through Friday' },
        { status: 400 }
      );
    }

    // Validate operating hours (8 AM - 5 PM)
    const timeParts = appointment_time.split(':');
    const hours = parseInt(timeParts[0]);
    if (hours < 8 || hours >= 17) {
      return NextResponse.json(
        { error: 'Appointments are only available between 8:00 AM and 5:00 PM' },
        { status: 400 }
      );
    }

    // Check for existing active appointment
    const { data: existingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patient.id)
      .in('status', ['scheduled', 'checked_in', 'in_progress'])
      .limit(1);

    if (existingAppointment && existingAppointment.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active appointment. Please cancel it before booking a new one.' },
        { status: 400 }
      );
    }

    // Get next queue number for this date and service
    // Each service has its own independent queue (1-100)
    const { data: maxQueueData } = await supabase
      .from('appointments')
      .select('appointment_number')
      .eq('appointment_date', appointment_date)
      .eq('service_id', service_id)
      .order('appointment_number', { ascending: false })
      .limit(1);

    const nextQueueNumber = maxQueueData && maxQueueData.length > 0
      ? maxQueueData[0].appointment_number + 1
      : 1;

    // Check if we've reached capacity (100 per day per service)
    if (nextQueueNumber > 100) {
      return NextResponse.json(
        { error: `This service is fully booked for ${appointment_date}. Please select another date.` },
        { status: 400 }
      );
    }

    // Create appointment
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        patient_id: patient.id,
        service_id: service_id, // Links to service for category-based routing
        doctor_id: null, // Will be assigned later
        appointment_date,
        appointment_time,
        appointment_number: nextQueueNumber,
        status: 'scheduled',
        reason,
      })
      .select(`
        *,
        patients!inner(
          id,
          user_id,
          profiles!inner(
            first_name,
            last_name,
            email
          )
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating appointment:', insertError);
      return NextResponse.json(
        { error: 'Failed to create appointment' },
        { status: 500 }
      );
    }

    // Create notification for patient
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'general',
      title: 'Appointment Confirmed',
      message: `Your appointment for ${service.name} on ${appointment_date} at ${appointment_time} has been confirmed. Queue number: ${nextQueueNumber}`,
      link: '/patient/appointments',
    });

    return NextResponse.json({
      success: true,
      data: appointment,
      message: 'Appointment booked successfully',
    });

  } catch (error) {
    console.error('Appointment booking error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/appointments
 * Get appointments based on user role
 *
 * Query params:
 * - status: filter by status
 * - date: filter by date
 * - patient_id: filter by patient (admin/doctor only)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const patientId = searchParams.get('patient_id');

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, admin_category')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Build query based on role
    let query = supabase
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
            last_name
          )
        )
      `)
      .order('appointment_date', { ascending: true })
      .order('appointment_number', { ascending: true });

    // Role-based filtering
    if (profile.role === 'patient') {
      // Patients see only their own appointments
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!patientRecord) {
        return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
      }

      query = query.eq('patient_id', patientRecord.id);

    } else if (profile.role === 'doctor') {
      // Doctors see all appointments (can be assigned to any)
      // Optionally filter by date to show today's queue
      if (date) {
        query = query.eq('appointment_date', date);
      }

    } else if (profile.role === 'healthcare_admin') {
      // Healthcare admins see appointments based on category
      // TODO: Implement category-based filtering when services are linked

    } else if (profile.role === 'super_admin') {
      // Super admins see all appointments
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
    }

    // Apply common filters
    if (status) {
      query = query.eq('status', status);
    }

    if (date && profile.role !== 'doctor') {
      query = query.eq('appointment_date', date);
    }

    const { data: appointments, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: appointments || [],
    });

  } catch (error) {
    console.error('Appointments fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
