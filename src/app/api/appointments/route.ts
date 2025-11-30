import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isValidBookingDate, isWeekday } from '@/lib/utils/timezone';

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

    // Validate 7-day advance booking (using Philippine timezone)
    if (!isValidBookingDate(appointment_date)) {
      return NextResponse.json(
        { error: 'Appointments must be booked at least 7 days in advance' },
        { status: 400 }
      );
    }

    // Validate weekday (Monday-Friday)
    const dayOfWeek = new Date(appointment_date + 'T00:00:00').getDay();
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

    // Use admin client to bypass RLS for nested joins on insert
    // Security: User is authenticated patient, creating their own appointment
    const adminClient = createAdminClient();

    // Create appointment with 'pending' status (awaiting doctor assignment)
    const { data: appointment, error: insertError } = await adminClient
      .from('appointments')
      .insert({
        patient_id: patient.id,
        service_id: service_id, // Links to service for category-based routing
        doctor_id: null, // Will be assigned later by admin
        appointment_date,
        appointment_time,
        appointment_number: nextQueueNumber,
        status: 'pending', // Start as pending until doctor is assigned
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

    // Create initial status history entry
    const { error: historyError } = await adminClient
      .from('appointment_status_history')
      .insert({
        appointment_id: appointment.id,
        change_type: 'status_change',
        from_status: null,
        to_status: 'pending',
        changed_by: user.id,
        reason: 'Patient booked appointment',
      });

    if (historyError) {
      console.error('Error creating appointment history:', historyError);
      // Don't fail the request if history creation fails
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

    // Use admin client to bypass RLS for nested profile queries
    // We've already verified authentication above, so this is safe
    const adminClient = createAdminClient();

    // Build query based on role using admin client
    let query = adminClient
      .from('appointments')
      .select(`
        *,
        patients(
          id,
          user_id,
          patient_number,
          medical_history,
          allergies,
          current_medications,
          accessibility_requirements,
          profiles(
            first_name,
            last_name,
            email,
            contact_number,
            date_of_birth,
            gender,
            barangay_id,
            emergency_contact
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
        ),
        services(
          id,
          name,
          category
        ),
        medical_records(
          id
        ),
        feedback(
          id
        )
      `)
      .order('appointment_date', { ascending: true });

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
      // Doctors see only appointments assigned to them
      console.log('🔍 [DOCTOR QUERY] User ID:', user.id);
      console.log('🔍 [DOCTOR QUERY] Profile ID:', profile.id);

      const { data: doctorRecord, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();

      console.log('🔍 [DOCTOR QUERY] Doctor Record:', doctorRecord);
      console.log('🔍 [DOCTOR QUERY] Doctor Error:', doctorError);

      if (!doctorRecord) {
        console.error('❌ [DOCTOR QUERY] No doctor record found for user_id:', user.id);
        return NextResponse.json({ error: 'Doctor record not found' }, { status: 404 });
      }

      console.log('✅ [DOCTOR QUERY] Found doctor_id:', doctorRecord.id);
      query = query.eq('doctor_id', doctorRecord.id);

      if (date) {
        console.log('🔍 [DOCTOR QUERY] Filtering by date:', date);
        query = query.eq('appointment_date', date);
      }

    } else if (profile.role === 'healthcare_admin') {
      // Healthcare admins see appointments based on their admin_category
      console.log('🔍 [HEALTHCARE ADMIN] Admin category:', profile.admin_category);

      if (profile.admin_category === 'general_admin') {
        // General admins can see ALL appointments
        console.log('✅ [HEALTHCARE ADMIN] General admin - viewing all appointments');

        if (patientId) {
          query = query.eq('patient_id', patientId);
        }
      } else {
        // Category-specific admins see only their category's appointments
        // Filter by service category matching admin category
        console.log('🔍 [HEALTHCARE ADMIN] Filtering by category:', profile.admin_category);

        // Get service IDs that match admin category
        const { data: categoryServices, error: servicesError } = await supabase
          .from('services')
          .select('id')
          .eq('category', profile.admin_category);

        if (servicesError) {
          console.error('❌ [HEALTHCARE ADMIN] Error fetching category services:', servicesError);
          return NextResponse.json(
            { error: 'Failed to fetch services for your category' },
            { status: 500 }
          );
        }

        if (!categoryServices || categoryServices.length === 0) {
          console.warn('⚠️ [HEALTHCARE ADMIN] No services found for category:', profile.admin_category);
          // Return empty array if no services match their category
          return NextResponse.json({
            success: true,
            data: [],
            count: 0,
            message: `No services configured for ${profile.admin_category} category`
          });
        }

        const serviceIds = categoryServices.map(s => s.id);
        console.log('✅ [HEALTHCARE ADMIN] Service IDs for category:', serviceIds);

        query = query.in('service_id', serviceIds);

        if (patientId) {
          query = query.eq('patient_id', patientId);
        }
      }

    } else if (profile.role === 'super_admin') {
      // Super admins see all appointments
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
    }

    // Apply common filters
    if (status) {
      // Support comma-separated status values for filtering multiple statuses
      const statusValues = status.split(',').map(s => s.trim());
      query = query.in('status', statusValues);
    }

    if (date && profile.role !== 'doctor') {
      query = query.eq('appointment_date', date);
    }

    console.log('🔍 [QUERY] Executing final query for role:', profile.role);
    const { data: appointments, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ [QUERY] Error fetching appointments:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    console.log('✅ [QUERY] Appointments found:', appointments?.length || 0);

    // Add has_medical_record and has_feedback fields based on joins
    const appointmentsWithRecordStatus = (appointments || []).map(appointment => {
      const hasMedicalRecord = appointment.medical_records && appointment.medical_records.length > 0;
      // Handle both single object and array responses from Supabase
      // PostgREST returns object for single record, array for multiple, null for none
      const hasFeedback = appointment.feedback
        ? (Array.isArray(appointment.feedback)
            ? appointment.feedback.length > 0
            : true)
        : false;

      // DEBUG: Log the mapping for each appointment
      console.log(`\n📋 [API MAPPING] ${appointment.services?.name}:`);
      console.log('  feedback array:', appointment.feedback);
      console.log('  feedback is null?', appointment.feedback === null);
      console.log('  feedback is array?', Array.isArray(appointment.feedback));
      console.log('  feedback.length:', appointment.feedback?.length);
      console.log('  CALCULATED has_feedback:', hasFeedback);

      return {
        ...appointment,
        has_medical_record: hasMedicalRecord,
        has_feedback: hasFeedback
      };
    });

    // DEBUG: Log final response data
    console.log('\n📤 [API RESPONSE] Sending response:');
    appointmentsWithRecordStatus.forEach((apt: any) => {
      console.log(`  ${apt.services?.name}: has_feedback = ${apt.has_feedback} (type: ${typeof apt.has_feedback})`);
    });

    return NextResponse.json({
      success: true,
      data: appointmentsWithRecordStatus,
    });

  } catch (error) {
    console.error('Appointments fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
