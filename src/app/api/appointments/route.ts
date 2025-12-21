import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isValidBookingDate, isWeekday } from '@/lib/utils/timezone';
import { checkAndUnsuspendPatient } from '@/lib/utils/appointmentUtils';
import {
  TimeBlock,
  TIME_BLOCKS,
  getBlockCapacity,
  getBlockDefaultTime,
  isValidTimeBlock,
  formatTimeBlock,
  type CreateAppointmentRequest,
} from '@/types/appointment';

/**
 * POST /api/appointments
 * Create a new appointment with automatic queue number assignment
 *
 * Business Rules:
 * - 7-day advance booking required
 * - Maximum 2 active appointments per patient (can book 2 different services)
 * - AM Block: 50 appointments max (8:00 AM - 12:00 PM)
 * - PM Block: 50 appointments max (1:00 PM - 5:00 PM)
 * - Total: 100 appointments per service per day
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
    const { service_id, appointment_date, time_block, reason } = body as CreateAppointmentRequest;

    // Validate required fields
    if (!service_id || !appointment_date || !time_block) {
      return NextResponse.json(
        { error: 'Service, date, and time block are required' },
        { status: 400 }
      );
    }

    // Validate time_block value
    if (!isValidTimeBlock(time_block)) {
      return NextResponse.json(
        { error: 'Invalid time block. Please select AM or PM.' },
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

    // Get patient record with suspension data
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, no_show_count, suspended_until')
      .eq('user_id', user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
    }

    // Check if patient is suspended
    if (profile.status === 'suspended') {
      // Try to auto-unsuspend if suspension period has expired
      const wasUnsuspended = await checkAndUnsuspendPatient(patient.id, user.id);

      if (!wasUnsuspended) {
        // Still suspended - block booking
        if (patient.suspended_until) {
          const suspendedUntil = new Date(patient.suspended_until);
          const daysRemaining = Math.ceil((suspendedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          return NextResponse.json(
            {
              error: 'Your account is suspended due to multiple no-shows',
              suspended_until: patient.suspended_until,
              days_remaining: daysRemaining,
              message: `Your account will be automatically reinstated on ${suspendedUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. If you believe this is an error, please contact the City Health Office.`,
            },
            { status: 403 }
          );
        } else {
          return NextResponse.json(
            { error: 'Your account is suspended. Please contact the City Health Office.' },
            { status: 403 }
          );
        }
      }
      // If successfully unsuspended, continue with booking
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

    // Set appointment_time based on time_block
    // AM: 08:00:00, PM: 13:00:00 (hidden from users, used for backend operations)
    const appointment_time = getBlockDefaultTime(time_block);

    // Check for existing active appointments (limit: 2 concurrent appointments)
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('id, service_id')
      .eq('patient_id', patient.id)
      .in('status', ['scheduled', 'checked_in', 'in_progress']);

    if (existingAppointments && existingAppointments.length >= 2) {
      return NextResponse.json(
        { error: 'You have reached the maximum of 2 active appointments. Please complete or cancel one before booking another.' },
        { status: 400 }
      );
    }

    // Check if patient already has an active appointment for this specific service
    if (existingAppointments && existingAppointments.some(apt => apt.service_id === service_id)) {
      return NextResponse.json(
        { error: 'You already have an active appointment for this service. Please cancel it if you need to reschedule.' },
        { status: 400 }
      );
    }

    // Get next queue number atomically using database function (prevents race conditions)
    // Each service has its own independent queue (1-100)
    const { data: nextQueueNumber, error: queueError } = await supabase
      .rpc('get_next_queue_number', {
        p_appointment_date: appointment_date,
        p_service_id: service_id
      });

    if (queueError || nextQueueNumber === null) {
      console.error('Error getting next queue number:', queueError);
      return NextResponse.json(
        { error: 'Failed to assign queue number' },
        { status: 500 }
      );
    }

    // Check if we've reached daily capacity (100 per day per service)
    if (nextQueueNumber > 100) {
      return NextResponse.json(
        { error: `This service is fully booked for ${appointment_date}. Please select another date.` },
        { status: 400 }
      );
    }

    // Check block-specific capacity (50 per block)
    const blockCapacity = getBlockCapacity(time_block);
    const { data: blockAppointments } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_date', appointment_date)
      .eq('service_id', service_id)
      .eq('time_block', time_block)
      .in('status', ['pending', 'scheduled', 'checked_in', 'in_progress']);

    if (blockAppointments && blockAppointments.length >= blockCapacity) {
      const blockInfo = formatTimeBlock(time_block);
      return NextResponse.json(
        { error: `The ${blockInfo} is fully booked for ${appointment_date}. Please select another time block or date.` },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for nested joins on insert
    // Security: User is authenticated patient, creating their own appointment
    const adminClient = createAdminClient();

    // Create appointment with 'pending' status (awaiting admin confirmation)
    const { data: appointment, error: insertError } = await adminClient
      .from('appointments')
      .insert({
        patient_id: patient.id,
        service_id: service_id, // Links to service for category-based routing
        appointment_date,
        appointment_time, // Default time for the block (08:00 or 13:00)
        time_block, // User-selected time block (AM or PM)
        appointment_number: nextQueueNumber,
        status: 'pending', // Start as pending until confirmed by admin
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
    const blockInfo = formatTimeBlock(time_block);
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'general',
      title: 'Booking Received',
      message: `Your appointment request for ${service.name} on ${appointment_date} in the ${blockInfo} has been received and is pending admin review. You'll be notified once it's confirmed.`,
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
 * - patient_id: filter by patient (admin only)
 * - page: page number (default: 1)
 * - limit: records per page (default: 20, max: 100)
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
    const search = searchParams.get('search')?.trim() || '';

    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, assigned_service_id')
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
            emergency_contact,
            barangays(name)
          )
        ),
        services(
          id,
          name,
          category
        ),
        completed_by_profile:profiles!completed_by_id(
          id,
          first_name,
          last_name
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

    } else if (profile.role === 'healthcare_admin') {
      // Healthcare admins see appointments for their assigned service only
      console.log('🔍 [HEALTHCARE ADMIN] Assigned service ID:', profile.assigned_service_id);

      if (!profile.assigned_service_id) {
        console.warn('⚠️ [HEALTHCARE ADMIN] No service assigned to this admin');
        // Return empty array if no service assigned
        return NextResponse.json({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          message: 'No service assigned to your account. Please contact an administrator.'
        });
      }

      // Filter by assigned service ID
      console.log('✅ [HEALTHCARE ADMIN] Filtering by service_id:', profile.assigned_service_id);
      query = query.eq('service_id', profile.assigned_service_id);

      if (patientId) {
        query = query.eq('patient_id', patientId);
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

    if (date) {
      query = query.eq('appointment_date', date);
    }

    // Declare search variables outside if block so they're accessible to count query
    let matchingPatientIds: string[] = [];

    // Apply search filter
    if (search) {
      console.log('🔍 [SEARCH] Search query:', search);

      // Check if search is a number (queue number search)
      const searchAsNumber = parseInt(search);
      const isNumericSearch = !isNaN(searchAsNumber);

      // Search for matching patients by name or patient number
      // Query profiles directly (not with nested joins) to avoid PostgREST syntax issues
      const matchingPatientIdsSet = new Set<string>();
      const searchWords = search.trim().split(/\s+/);

      console.log('🔍 [SEARCH] Search words:', searchWords);

      if (searchWords.length > 1) {
        // Multi-word: search each word separately and combine results
        console.log('🔍 [SEARCH] Multi-word search, searching for each word separately');
        for (const word of searchWords) {
          // Search profiles by name or email
          const { data: matchingProfiles } = await adminClient
            .from('profiles')
            .select('id')
            .eq('role', 'patient')
            .or(`first_name.ilike.%${word}%,last_name.ilike.%${word}%,email.ilike.%${word}%`);

          if (matchingProfiles && matchingProfiles.length > 0) {
            console.log(`🔍 [SEARCH] Word "${word}" matched ${matchingProfiles.length} profiles`);
            const profileUserIds = matchingProfiles.map(p => p.id);

            // Get patient IDs for these profiles (patients.user_id -> profiles.id)
            const { data: patientsFromProfiles } = await adminClient
              .from('patients')
              .select('id')
              .in('user_id', profileUserIds);

            if (patientsFromProfiles && patientsFromProfiles.length > 0) {
              console.log(`🔍 [SEARCH] Found ${patientsFromProfiles.length} patients from profiles`);
              patientsFromProfiles.forEach(p => matchingPatientIdsSet.add(p.id));
            }
          }

          // Also search patient_number
          const { data: patientNumberMatches } = await adminClient
            .from('patients')
            .select('id')
            .ilike('patient_number', `%${word}%`);

          if (patientNumberMatches && patientNumberMatches.length > 0) {
            console.log(`🔍 [SEARCH] Word "${word}" matched ${patientNumberMatches.length} patient numbers`);
            patientNumberMatches.forEach(p => matchingPatientIdsSet.add(p.id));
          }
        }
      } else {
        // Single-word: same logic
        console.log('🔍 [SEARCH] Single-word search');

        // Search profiles by name or email
        const { data: matchingProfiles } = await adminClient
          .from('profiles')
          .select('id')
          .eq('role', 'patient')
          .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);

        if (matchingProfiles && matchingProfiles.length > 0) {
          console.log(`🔍 [SEARCH] Found ${matchingProfiles.length} matching profiles`);
          const profileUserIds = matchingProfiles.map(p => p.id);

          // Get patient IDs for these profiles
          const { data: patientsFromProfiles } = await adminClient
            .from('patients')
            .select('id')
            .in('user_id', profileUserIds);

          if (patientsFromProfiles && patientsFromProfiles.length > 0) {
            console.log(`🔍 [SEARCH] Found ${patientsFromProfiles.length} patients from profiles`);
            patientsFromProfiles.forEach(p => matchingPatientIdsSet.add(p.id));
          }
        }

        // Also search patient_number
        const { data: patientNumberMatches } = await adminClient
          .from('patients')
          .select('id')
          .ilike('patient_number', `%${search}%`);

        if (patientNumberMatches && patientNumberMatches.length > 0) {
          console.log(`🔍 [SEARCH] Found ${patientNumberMatches.length} patient numbers`);
          patientNumberMatches.forEach(p => matchingPatientIdsSet.add(p.id));
        }
      }

      // Convert Set to Array
      matchingPatientIds = Array.from(matchingPatientIdsSet);

      if (matchingPatientIds.length > 0) {
        console.log('🔍 [SEARCH] Total unique patients found:', matchingPatientIds.length);
        console.log('🔍 [SEARCH] Patient IDs:', matchingPatientIds);
      } else {
        console.log('⚠️ [SEARCH] No matching patients found for query:', search);
      }

      // Build OR conditions for search
      const searchConditions: string[] = [];

      // Queue number search (if numeric)
      if (isNumericSearch) {
        searchConditions.push(`appointment_number.eq.${searchAsNumber}`);
      }

      // Patient ID matches
      if (matchingPatientIds.length > 0) {
        searchConditions.push(`patient_id.in.(${matchingPatientIds.join(',')})`);
      }

      // Reason contains search term
      searchConditions.push(`reason.ilike.%${search}%`);

      // Apply OR filter if we have any conditions
      if (searchConditions.length > 0) {
        query = query.or(searchConditions.join(','));
        console.log('🔍 [SEARCH] Applied conditions:', searchConditions.length);
      } else {
        // No matches found - force empty result
        query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        console.log('🔍 [SEARCH] No matches found, returning empty result');
      }
    }

    console.log('🔍 [QUERY] Executing final query for role:', profile.role);
    console.log('🔍 [PAGINATION] Page:', page, 'Limit:', limit, 'Offset:', offset);

    // Get total count for pagination with a separate simple query (no nested joins)
    // This is necessary because Supabase returns null count with complex nested selects + head: true
    let countQuery = adminClient
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    // Apply the SAME role-based filters to count query
    if (profile.role === 'patient') {
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (patientRecord) {
        countQuery = countQuery.eq('patient_id', patientRecord.id);
      }
    } else if (profile.role === 'healthcare_admin') {
      // Healthcare admins see appointments for their assigned service only
      if (profile.assigned_service_id) {
        countQuery = countQuery.eq('service_id', profile.assigned_service_id);
      } else {
        // No service assigned, count will be 0
        countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000'); // Force 0 results
      }
      if (patientId) {
        countQuery = countQuery.eq('patient_id', patientId);
      }
    } else if (profile.role === 'super_admin') {
      if (patientId) {
        countQuery = countQuery.eq('patient_id', patientId);
      }
    }

    // Apply common filters to count query
    if (status) {
      const statusValues = status.split(',').map(s => s.trim());
      countQuery = countQuery.in('status', statusValues);
    }
    if (date) {
      countQuery = countQuery.eq('appointment_date', date);
    }

    // Apply search filter to count query (same logic as main query)
    if (search) {
      const searchAsNumber = parseInt(search);
      const isNumericSearch = !isNaN(searchAsNumber);

      // Use the same matching patient IDs from earlier search
      const countSearchConditions: string[] = [];

      if (isNumericSearch) {
        countSearchConditions.push(`appointment_number.eq.${searchAsNumber}`);
      }
      if (matchingPatientIds.length > 0) {
        countSearchConditions.push(`patient_id.in.(${matchingPatientIds.join(',')})`);
      }
      countSearchConditions.push(`reason.ilike.%${search}%`);

      if (countSearchConditions.length > 0) {
        countQuery = countQuery.or(countSearchConditions.join(','));
      } else {
        countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    // Execute count query
    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      console.error('❌ [COUNT QUERY] Error:', countError);
    }

    console.log('✅ [COUNT QUERY] Total count:', totalCount);

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: appointments, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ [QUERY] Error fetching appointments:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch appointments' },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((totalCount || 0) / limit);
    console.log('✅ [QUERY] Appointments found:', appointments?.length || 0, 'of', totalCount, 'total');

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
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Appointments fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
