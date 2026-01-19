import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getPhilippineTime } from '@/lib/utils/timezone';

/**
 * Generate a cryptographically secure random password
 */
function generateSecurePassword(length = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  return password;
}

/**
 * Calculate time block based on appointment time
 * Operating Hours:
 * - AM Block: 8:00 AM - 12:59 PM (hours 8-12)
 * - PM Block: 1:00 PM - 4:59 PM (hours 13-16)
 *
 * @param timeString Time in HH:MM:SS or HH:MM format
 * @returns 'AM' or 'PM' time block
 */
function getTimeBlock(timeString: string): 'AM' | 'PM' {
  const [hours] = timeString.split(':').map(Number);

  // AM Block: 8:00-12:59 (hours 8-12)
  if (hours >= 8 && hours < 13) {
    return 'AM';
  }
  // PM Block: 13:00-16:59 (hours 13-16)
  if (hours >= 13 && hours < 17) {
    return 'PM';
  }

  // Outside operating hours - default based on time of day
  // If before noon, use AM; otherwise PM
  return hours < 12 ? 'AM' : 'PM';
}

/**
 * POST /api/admin/patients/walk-in
 * Create a walk-in patient registration (General Admin only)
 *
 * BUSINESS RULES:
 * - Only Healthcare Admins assigned to walk-in services can register walk-ins
 * - ALL walk-in patients get auth accounts (can claim later via password reset)
 * - Email format: walkin-{patient_number}@noreply.healthcard.local
 * - Auto-active status (no approval needed)
 * - Auto-complete appointment (status='completed')
 * - Booking number auto-generated (BKG-YYYYMMDD-XXXX)
 * - If disease data provided: Create disease record
 */
export async function POST(request: NextRequest) {
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
      .select('role, admin_category, assigned_service_id')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. CRITICAL: Verify user is Healthcare Admin assigned to walk-in service
    // Pattern 5: Services 12, 16, 17 all support walk-in registration (dual access)
    // Legacy: Services 22, 23 remain for backward compatibility
    const isHealthcareAdmin = profile.role === 'healthcare_admin';
    const isGeneralAdmin = profile.admin_category === 'general' || profile.admin_category === 'general_admin';
    const isWalkInService = [12, 16, 17, 22, 23].includes(profile.assigned_service_id || -1);

    if (!isHealthcareAdmin || !(isGeneralAdmin || isWalkInService)) {
      return NextResponse.json(
        { error: 'Access denied. Only Healthcare Admins assigned to walk-in services can register walk-in patients.' },
        { status: 403 }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      barangay_id,
      contact_number,
      blood_type,
      allergies,
      current_medications,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_email,
      disease_type,
      create_user_account, // Optional: if true, use provided email/password
      email, // Optional: custom email for portal access
      password, // Optional: custom password for portal access
    } = body;

    // 5. Validate required fields
    if (!first_name || !last_name || !date_of_birth || !gender || !barangay_id || !contact_number || !emergency_contact_name || !emergency_contact_phone) {
      return NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, date_of_birth, gender, barangay_id, contact_number, emergency_contact_name, emergency_contact_phone' },
        { status: 400 }
      );
    }

    // 6. Generate patient number FIRST (needed for email)
    const { data: patientNumberData, error: patientNumberError} = await supabase
      .rpc('generate_patient_number');

    if (patientNumberError || !patientNumberData) {
      console.error('Error generating patient number:', patientNumberError);
      return NextResponse.json(
        { error: 'Failed to generate patient number' },
        { status: 500 }
      );
    }

    const patient_number = patientNumberData;

    // 6.5. Generate booking number using RPC (same pattern as patient_number)
    const { data: bookingNumberData, error: bookingNumberError } = await supabase
      .rpc('generate_booking_number');

    if (bookingNumberError || !bookingNumberData) {
      console.error('Error generating booking number:', bookingNumberError);
      return NextResponse.json(
        { error: 'Failed to generate booking number' },
        { status: 500 }
      );
    }

    const booking_number = bookingNumberData;

    // 7. Validate portal account fields if provided
    if (create_user_account) {
      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email and password are required when create_user_account is true' },
          { status: 400 }
        );
      }
      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 }
        );
      }
    }

    // 7.5. Create Supabase Admin client (service role) for all database operations
    // This bypasses RLS policies and is used for authorized admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 8. Create auth user for ALL walk-in patients
    // Two modes:
    // - Portal account (create_user_account=true): Use provided email/password for immediate access
    // - Quick walk-in (create_user_account=false/undefined): Auto-generate email/password (patient can claim later)
    const walkInEmail = create_user_account && email
      ? email
      : `walkin-${patient_number}@noreply.healthcard.local`;
    const walkInPassword = create_user_account && password
      ? password
      : generateSecurePassword();

    let user_id: string;

    try {
      // Create auth user using the admin client defined above
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: walkInEmail,
        password: walkInPassword,
        email_confirm: true, // Skip email verification
        user_metadata: {
          first_name,
          last_name,
          is_walk_in: !create_user_account, // Flag walk-in accounts (auto-generated credentials)
          has_portal_access: !!create_user_account, // Flag if given custom email/password
        },
      });

      if (authError || !authData.user) {
        console.error('❌ [AUTH USER CREATION ERROR]', {
          message: authError?.message,
          status: authError?.status,
          email: walkInEmail,
          patient_number,
        });
        return NextResponse.json(
          { error: 'Failed to create walk-in patient account', details: authError?.message },
          { status: 500 }
        );
      }

      user_id = authData.user.id;

      // Wait for database trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile with complete walk-in data
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name,
          last_name,
          date_of_birth,
          gender,
          contact_number,
          barangay_id,
          emergency_contact: {
            name: emergency_contact_name,
            phone: emergency_contact_phone,
            email: emergency_contact_email || null
          },
          role: 'patient',
          status: 'active', // Auto-approved for walk-in
          approved_at: new Date().toISOString(),
          approved_by: session.user.id,
        })
        .eq('id', user_id);

      if (profileUpdateError) {
        console.error('❌ [PROFILE UPDATE ERROR]', {
          message: profileUpdateError.message,
          code: profileUpdateError.code,
          details: profileUpdateError.details,
          hint: profileUpdateError.hint,
          user_id,
        });
        return NextResponse.json(
          { error: 'Failed to update walk-in patient profile', details: profileUpdateError.message },
          { status: 500 }
        );
      }

      console.log(`Walk-in patient account created: ${walkInEmail}`);
    } catch (accountError) {
      console.error('Error in walk-in account creation:', accountError);
      return NextResponse.json(
        { error: 'Failed to create walk-in patient account', details: accountError instanceof Error ? accountError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // 8. Create patient record using admin client to bypass RLS
    // Note: Using supabaseAdmin because RLS policy "Patients can insert own record"
    // requires user_id = auth.uid(), but we're inserting a different user's record
    const regDatePHT = getPhilippineTime();
    const registration_date = `${regDatePHT.getUTCFullYear()}-${String(regDatePHT.getUTCMonth() + 1).padStart(2, '0')}-${String(regDatePHT.getUTCDate()).padStart(2, '0')}`;

    const { data: patient, error: patientError } = await supabaseAdmin
      .from('patients')
      .insert({
        user_id: user_id, // Auth user ID (always set for walk-ins now)
        patient_number: patient_number,
        booking_number: booking_number, // Generated via RPC
        blood_type: blood_type || null,
        philhealth_number: null,
        medical_history: null,
        allergies: allergies ? [allergies] : null,
        current_medications: current_medications ? [current_medications] : null,
        accessibility_requirements: null,
        registration_date: registration_date,
        // booking_count auto-set to 1 by trigger
      })
      .select()
      .single();

    if (patientError) {
      console.error('❌ [PATIENT CREATION ERROR]', {
        message: patientError.message,
        code: patientError.code,
        details: patientError.details,
        hint: patientError.hint,
        user_id,
        patient_number,
      });
      return NextResponse.json({
        error: 'Failed to create patient record',
        details: patientError.message,
        hint: patientError.hint,
      }, { status: 500 });
    }

    // 9. Healthcare Admin completes the appointment (no doctor assignment needed)
    // Appointment completion is handled by Healthcare Admins now

    // 10. Auto-create completed appointment with valid operating hours
    const nowPHT = getPhilippineTime();
    const appointment_date = `${nowPHT.getUTCFullYear()}-${String(nowPHT.getUTCMonth() + 1).padStart(2, '0')}-${String(nowPHT.getUTCDate()).padStart(2, '0')}`;
    const currentHour = nowPHT.getUTCHours();

    // Use default times that always pass the CHECK constraint
    // Determine block based on current time, use standard times for each block
    let appointment_time: string;
    let time_block: 'AM' | 'PM';

    if (currentHour >= 8 && currentHour < 13) {
      // During AM hours (8:00-12:59) - use 08:00 AM as standard walk-in time
      appointment_time = '08:00:00';
      time_block = 'AM';
    } else if (currentHour >= 13 && currentHour < 17) {
      // During PM hours (13:00-16:59) - use 13:00 PM as standard walk-in time
      appointment_time = '13:00:00';
      time_block = 'PM';
    } else {
      // Outside operating hours (before 8 AM or after 5 PM) - default to 08:00 AM
      appointment_time = '08:00:00';
      time_block = 'AM';
    }

    // Use the healthcare admin's assigned service
    const service_id = profile.assigned_service_id;

    // Get next queue number for this service on this date (uses RPC function)
    // This ensures queue numbers are per-service, per-day (1-100 for each service)
    const { data: nextQueueNumber, error: queueError } = await supabase
      .rpc('get_next_queue_number', {
        p_appointment_date: appointment_date,
        p_service_id: service_id
      });

    if (queueError || !nextQueueNumber) {
      console.error('❌ [QUEUE NUMBER ERROR]', {
        message: queueError?.message,
        code: queueError?.code,
        details: queueError?.details,
        appointment_date,
        service_id,
      });
      return NextResponse.json(
        { error: 'Failed to generate queue number', details: queueError?.message },
        { status: 500 }
      );
    }

    const appointment_number = nextQueueNumber;

    // Use admin client for appointment insert to bypass RLS
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .insert({
        patient_id: patient.id,
        service_id: service_id,
        appointment_number: appointment_number, // Queue number
        appointment_date,
        appointment_time,
        time_block, // AM or PM block based on current time
        status: 'checked_in', // Walk-in patients start as checked-in, not completed
        reason: 'Walk-in patient',
        checked_in_at: new Date().toISOString(),
        // started_at will be set when healthcare admin clicks "Start Consultation"
        completed_by_id: session.user.id, // Track healthcare admin who registered the walk-in
        // completed_at will be set when healthcare admin marks as completed
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('❌ [APPOINTMENT CREATION ERROR]', {
        message: appointmentError.message,
        code: appointmentError.code,
        details: appointmentError.details,
        hint: appointmentError.hint,
        patient_id: patient.id,
        patient_number,
        service_id,
      });

      // CRITICAL FIX: Fail the entire request if appointment creation fails
      return NextResponse.json({
        error: 'Failed to create walk-in appointment',
        details: appointmentError.message,
        hint: appointmentError.hint,
        patientCreated: true, // Patient was created successfully
        patientId: patient.id,
        patientNumber: patient_number,
        message: 'Patient record was created, but appointment booking failed. Please try booking manually or contact support.',
      }, { status: 500 });
    }

    // Ensure appointment was created
    if (!appointment) {
      console.error('❌ [APPOINTMENT NULL] No appointment returned from insert');
      return NextResponse.json({
        error: 'Failed to create walk-in appointment - no data returned',
        patientCreated: true,
        patientId: patient.id,
        patientNumber: patient_number,
      }, { status: 500 });
    }

    // 11. If disease data provided, create disease record using admin client
    if (disease_type && appointment) {
      const { error: diseaseError } = await supabaseAdmin
        .from('diseases')
        .insert({
          patient_id: patient.id,
          medical_record_id: null, // Can be linked later when medical record is created
          disease_type: disease_type,
          diagnosis_date: appointment_date,
          barangay_id: barangay_id,
          status: 'active',
        });

      if (diseaseError) {
        console.error('Error creating disease record:', diseaseError);
        // Don't fail the entire request
      }
    }

    // 12. Return success response with booking number and account info
    return NextResponse.json({
      success: true,
      message: create_user_account
        ? 'Walk-in patient registered successfully with portal access'
        : 'Walk-in patient registered successfully with account',
      data: {
        patient_id: patient.id,
        patient_number: patient.patient_number,
        booking_number: patient.booking_number,
        booking_count: patient.booking_count,
        appointment_id: appointment?.id,
        name: `${first_name} ${last_name}`,
        user_account_created: true, // Always true now
        email: walkInEmail,
        has_portal_access: !!create_user_account,
      },
    });
  } catch (error) {
    console.error('Error in walk-in patient registration:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
