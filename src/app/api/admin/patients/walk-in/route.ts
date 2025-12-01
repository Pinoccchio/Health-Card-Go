import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * POST /api/admin/patients/walk-in
 * Create a walk-in patient registration (General Admin only)
 *
 * BUSINESS RULES:
 * - Only general_admin can register walk-in patients (403 for others)
 * - user_id = NULL for walk-in patients (no user account)
 * - Auto-active status (no approval needed)
 * - Auto-complete appointment (status='completed')
 * - Booking number auto-generated (BKG-YYYYMMDD-XXXX)
 * - If disease data provided: Create disease record
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

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
      .select('role_id, admin_category')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // 3. CRITICAL: Verify user is Healthcare Admin with general_admin category
    if (profile.role_id !== 2 || profile.admin_category !== 'general_admin') {
      return NextResponse.json(
        { error: 'Access denied. Only General Admins can register walk-in patients.' },
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
      email,
      blood_type,
      allergies,
      current_medications,
      emergency_contact,
      disease_type,
      create_user_account,
      password,
    } = body;

    // 5. Validate required fields
    if (!first_name || !last_name || !date_of_birth || !gender || !barangay_id || !contact_number || !emergency_contact) {
      return NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, date_of_birth, gender, barangay_id, contact_number, emergency_contact' },
        { status: 400 }
      );
    }

    // 6. Create patient profile (FIRST create profile if create_user_account is true)
    let user_id = null;
    let patient_number = null;

    if (create_user_account && email && password) {
      try {
        // Validate email and password are provided
        if (!email || !password) {
          return NextResponse.json(
            { error: 'Email and password are required when creating a user account' },
            { status: 400 }
          );
        }

        // Create a Supabase Admin client using service role key
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });

        // Create auth user with admin privileges (no email verification required)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // Skip email verification
          user_metadata: {
            first_name: first_name,
            last_name: last_name,
          },
        });

        if (authError || !authData.user) {
          console.error('Error creating auth user:', authError);
          return NextResponse.json(
            { error: 'Failed to create user account', details: authError?.message },
            { status: 500 }
          );
        }

        user_id = authData.user.id;

        // Wait a moment for the database trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 500));

        // Update the profile with patient-specific data and set status to 'active'
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({
            first_name: first_name,
            last_name: last_name,
            date_of_birth: date_of_birth,
            gender: gender,
            contact_number: contact_number,
            barangay_id: barangay_id,
            role_id: 4, // Patient role
            status: 'active', // Auto-approved for walk-in
            approved_at: new Date().toISOString(),
            approved_by: session.user.id, // Admin who created the account
          })
          .eq('id', user_id);

        if (profileUpdateError) {
          console.error('Error updating profile:', profileUpdateError);
          // Don't fail the entire request, but log the error
        }

        console.log(`User account created successfully for walk-in patient: ${email}`);
      } catch (accountError) {
        console.error('Error in account creation process:', accountError);
        return NextResponse.json(
          { error: 'Failed to create user account', details: accountError instanceof Error ? accountError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // 7. Generate patient number using database function (atomic, thread-safe)
    const { data: patientNumberData, error: patientNumberError } = await supabase
      .rpc('generate_patient_number');

    if (patientNumberError || !patientNumberData) {
      console.error('Error generating patient number:', patientNumberError);
      return NextResponse.json(
        { error: 'Failed to generate patient number' },
        { status: 500 }
      );
    }

    patient_number = patientNumberData;

    // 8. Create patient record (user_id = NULL for walk-in)
    // The booking_number will be auto-generated by the database trigger
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({
        user_id: user_id, // NULL for walk-in patients
        patient_number: patient_number,
        first_name,
        last_name,
        date_of_birth,
        gender,
        barangay_id,
        contact_number,
        email: email || null,
        blood_type: blood_type || null,
        allergies: allergies || null,
        current_medications: current_medications || null,
        emergency_contact,
        registration_date: new Date().toISOString().split('T')[0],
        // booking_number auto-generated by trigger
        // booking_count auto-set to 1 by trigger
      })
      .select()
      .single();

    if (patientError) {
      console.error('Error creating patient:', patientError);
      return NextResponse.json({ error: 'Failed to create patient record', details: patientError.message }, { status: 500 });
    }

    // 9. Get a doctor (first available or assign to current admin)
    const { data: doctors } = await supabase
      .from('profiles')
      .select('id')
      .eq('role_id', 3)
      .limit(1);

    const doctor_id = doctors && doctors.length > 0 ? doctors[0].id : session.user.id;

    // 10. Auto-create completed appointment
    const appointment_date = new Date().toISOString().split('T')[0];
    const appointment_time = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM format

    // Get appointment count for today to determine appointment number
    const { data: todayAppointments } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('appointment_date', appointment_date);

    const appointment_number = ((todayAppointments as any)?.count || 0) + 1;

    // Generate appointment number
    const { data: appointmentCountData } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true });

    const appointmentCount = (appointmentCountData as any)?.count || 0;
    const appointment_number_formatted = `A${year}${String(appointmentCount + 1).padStart(6, '0')}`;

    // Get a general service (or first service available)
    const { data: services } = await supabase
      .from('services')
      .select('id')
      .eq('category', 'general')
      .eq('is_active', true)
      .limit(1);

    const service_id = services && services.length > 0 ? services[0].id : 1; // Default to service ID 1 if none found

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        patient_id: patient.id,
        doctor_id: doctor_id,
        service_id: service_id,
        appointment_number: appointment_number, // Queue number
        appointment_date,
        appointment_time,
        status: 'completed', // Auto-complete for walk-in
        checked_in_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError);
      // Don't fail the entire request, but log the error
    }

    // 11. If disease data provided, create disease record
    if (disease_type && appointment) {
      const { error: diseaseError } = await supabase
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

    // 12. Return success response with booking number
    return NextResponse.json({
      success: true,
      message: user_id
        ? 'Walk-in patient registered successfully with user account'
        : 'Walk-in patient registered successfully',
      data: {
        patient_id: patient.id,
        patient_number: patient.patient_number,
        booking_number: patient.booking_number,
        booking_count: patient.booking_count,
        appointment_id: appointment?.id,
        name: `${first_name} ${last_name}`,
        user_account_created: !!user_id,
        email: user_id ? email : undefined,
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
