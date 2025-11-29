import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * POST /api/seed-users
 * Seeds test accounts from ACCOUNTS.txt into Supabase
 * Uses Service Role Key for admin privileges
 */
export async function POST() {
  try {
    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const results = {
      patients: [] as any[],
      doctors: [] as any[],
      errors: [] as any[],
    };

    // ========================================
    // SEED PATIENTS
    // ========================================
    const patientsToSeed = [
      {
        email: 'juan.delacruz@gmail.com',
        password: 'Juan@2025!',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        contact_number: '09171234567',
        barangay_id: 1, // San Nicolas
        status: 'active',
      },
      {
        email: 'maria.santos@gmail.com',
        password: 'Maria@2025!',
        first_name: 'Maria',
        last_name: 'Santos',
        contact_number: '09181234568',
        barangay_id: 2, // Assume barangay 2
        status: 'pending',
      },
      {
        email: 'pedro.gonzales@gmail.com',
        password: 'Pedro@2025!',
        first_name: 'Pedro',
        last_name: 'Gonzales',
        contact_number: '09191234569',
        barangay_id: 3, // Salvacion
        status: 'active',
      },
      {
        email: 'rosa.mendoza@gmail.com',
        password: 'Rosa@2025!',
        first_name: 'Rosa',
        last_name: 'Mendoza',
        contact_number: '09201234570',
        barangay_id: 4, // Quezon
        status: 'active',
      },
    ];

    for (const patient of patientsToSeed) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser.users.find((u) => u.email === patient.email);

        let userId: string;

        if (userExists) {
          userId = userExists.id;
          // Update password
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: patient.password,
          });
        } else {
          // Create auth user
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: patient.email,
            password: patient.password,
            email_confirm: true,
          });

          if (authError) throw authError;
          userId = authUser.user.id;
        }

        // Update or insert profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
          {
            id: userId,
            email: patient.email,
            first_name: patient.first_name,
            last_name: patient.last_name,
            contact_number: patient.contact_number,
            barangay_id: patient.barangay_id,
            role: 'patient',
            status: patient.status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (profileError) throw profileError;

        // Generate patient number
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const patientNumber = `PAT-${dateStr}-${randomNum}`;

        // Check if patient record exists
        const { data: existingPatient } = await supabaseAdmin
          .from('patients')
          .select('id, patient_number')
          .eq('user_id', userId)
          .single();

        if (!existingPatient) {
          // Create patient record
          const { error: patientError } = await supabaseAdmin.from('patients').insert({
            user_id: userId,
            patient_number: patientNumber,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (patientError) throw patientError;
        }

        results.patients.push({
          email: patient.email,
          status: patient.status,
          patient_number: existingPatient?.patient_number || patientNumber,
          success: true,
          action: userExists ? 'updated' : 'created',
        });
      } catch (error: any) {
        results.errors.push({
          type: 'patient',
          email: patient.email,
          error: error.message,
        });
      }
    }

    // ========================================
    // SEED DOCTORS
    // ========================================
    const doctorsToSeed = [
      {
        email: 'dr.mendoza@gmail.com',
        password: 'DrMendoza@2025!',
        first_name: 'Carlos',
        last_name: 'Mendoza',
        specialization: 'Cardiologist',
        license_number: 'PRC-DOC-003',
        contact_number: '09301234571',
      },
      {
        email: 'dr.cruz@gmail.com',
        password: 'DrCruz@2025!',
        first_name: 'Ana',
        last_name: 'Cruz',
        specialization: 'Obstetrician-Gynecologist',
        license_number: 'PRC-DOC-004',
        contact_number: '09311234572',
      },
      {
        email: 'dr.bautista@gmail.com',
        password: 'DrBautista@2025!',
        first_name: 'Ramon',
        last_name: 'Bautista',
        specialization: 'Internal Medicine',
        license_number: 'PRC-DOC-005',
        contact_number: '09321234573',
      },
    ];

    for (const doctor of doctorsToSeed) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser.users.find((u) => u.email === doctor.email);

        let userId: string;

        if (userExists) {
          userId = userExists.id;
          // Update password
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: doctor.password,
          });
        } else {
          // Create auth user
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: doctor.email,
            password: doctor.password,
            email_confirm: true,
          });

          if (authError) throw authError;
          userId = authUser.user.id;
        }

        // Update or insert profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
          {
            id: userId,
            email: doctor.email,
            first_name: doctor.first_name,
            last_name: doctor.last_name,
            contact_number: doctor.contact_number,
            specialization: doctor.specialization,
            license_number: doctor.license_number,
            role: 'doctor',
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (profileError) throw profileError;

        // Check if doctor record exists
        const { data: existingDoctor } = await supabaseAdmin
          .from('doctors')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!existingDoctor) {
          // Create doctor record with schedule
          const { error: doctorError } = await supabaseAdmin.from('doctors').insert({
            user_id: userId,
            schedule: {
              monday: { start: '08:00', end: '17:00' },
              tuesday: { start: '08:00', end: '17:00' },
              wednesday: { start: '08:00', end: '17:00' },
              thursday: { start: '08:00', end: '17:00' },
              friday: { start: '08:00', end: '17:00' },
            },
            max_patients_per_day: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (doctorError) throw doctorError;
        }

        results.doctors.push({
          email: doctor.email,
          name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
          specialization: doctor.specialization,
          success: true,
          action: userExists ? 'updated' : 'created',
        });
      } catch (error: any) {
        results.errors.push({
          type: 'doctor',
          email: doctor.email,
          error: error.message,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Seeding completed',
        results: {
          patients_created: results.patients.length,
          doctors_created: results.doctors.length,
          errors: results.errors.length,
          details: results,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      { error: 'Seeding failed', details: error.message },
      { status: 500 }
    );
  }
}
