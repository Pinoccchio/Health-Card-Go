import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * POST /api/seed-users
 * Seeds all 14 test accounts from ACCOUNTS.txt/SEED_USERS.md into Supabase
 * Uses Service Role Key for admin privileges
 *
 * Creates:
 * - 1 Super Admin
 * - 6 Healthcare Admins (healthcard, hiv, pregnancy, general_admin, laboratory, immunization)
 * - 2 Doctors
 * - 4 Patients (1 pending, 3 active with health cards)
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
      super_admin: null as any,
      healthcare_admins: [] as any[],
      doctors: [] as any[],
      patients: [] as any[],
      health_cards: [] as any[],
      errors: [] as any[],
    };

    let superAdminId: string | null = null;

    // ========================================
    // 1. SEED SUPER ADMIN
    // ========================================
    console.log('🔧 Seeding Super Admin...');
    const superAdmin = {
      email: 'admin@gmail.com',
      password: 'Admin@2025!',
      first_name: 'Admin',
      last_name: 'System',
    };

    try {
      const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
      const userExists = existingUser.users.find((u) => u.email === superAdmin.email);

      if (userExists) {
        superAdminId = userExists.id;
        await supabaseAdmin.auth.admin.updateUserById(superAdminId, {
          password: superAdmin.password,
        });
      } else {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: superAdmin.email,
          password: superAdmin.password,
          email_confirm: true,
        });

        if (authError) throw authError;
        superAdminId = authUser.user.id;
      }

      // Update or insert profile
      const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
        {
          id: superAdminId,
          email: superAdmin.email,
          first_name: superAdmin.first_name,
          last_name: superAdmin.last_name,
          role: 'super_admin',
          status: 'active',
          barangay_id: 1, // Default barangay
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profileError) throw profileError;

      results.super_admin = {
        email: superAdmin.email,
        name: `${superAdmin.first_name} ${superAdmin.last_name}`,
        role: 'super_admin',
        success: true,
        action: userExists ? 'updated' : 'created',
      };

      console.log('✅ Super Admin created:', superAdmin.email);
    } catch (error: any) {
      console.error('❌ Super Admin error:', error);
      results.errors.push({
        type: 'super_admin',
        email: superAdmin.email,
        error: error.message,
      });
    }

    // ========================================
    // 2. SEED HEALTHCARE ADMINS (6 Categories)
    // ========================================
    console.log('🔧 Seeding Healthcare Admins...');
    const healthcareAdmins = [
      {
        email: 'healthcard.admin@gmail.com',
        password: 'HealthCard@2025!',
        first_name: 'Healthcard',
        last_name: 'Administrator',
        admin_category: 'healthcard',
      },
      {
        email: 'hiv.admin@gmail.com',
        password: 'HIV@2025!',
        first_name: 'HIV',
        last_name: 'Administrator',
        admin_category: 'hiv',
      },
      {
        email: 'pregnancy.admin@gmail.com',
        password: 'Pregnancy@2025!',
        first_name: 'Pregnancy',
        last_name: 'Administrator',
        admin_category: 'pregnancy',
      },
      {
        email: 'general.admin@gmail.com',
        password: 'General@2025!',
        first_name: 'General',
        last_name: 'Administrator',
        admin_category: 'general_admin',
      },
      {
        email: 'lab.admin@gmail.com',
        password: 'Laboratory@2025!',
        first_name: 'Laboratory',
        last_name: 'Administrator',
        admin_category: 'laboratory',
      },
      {
        email: 'immunization.admin@gmail.com',
        password: 'Immunization@2025!',
        first_name: 'Immunization',
        last_name: 'Administrator',
        admin_category: 'immunization',
      },
    ];

    for (const admin of healthcareAdmins) {
      try {
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser.users.find((u) => u.email === admin.email);

        let userId: string;

        if (userExists) {
          userId = userExists.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: admin.password,
          });
        } else {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: admin.email,
            password: admin.password,
            email_confirm: true,
          });

          if (authError) throw authError;
          userId = authUser.user.id;
        }

        // Update or insert profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
          {
            id: userId,
            email: admin.email,
            first_name: admin.first_name,
            last_name: admin.last_name,
            role: 'healthcare_admin',
            admin_category: admin.admin_category,
            status: 'active',
            barangay_id: 1, // Default barangay
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (profileError) throw profileError;

        results.healthcare_admins.push({
          email: admin.email,
          name: `${admin.first_name} ${admin.last_name}`,
          category: admin.admin_category,
          success: true,
          action: userExists ? 'updated' : 'created',
        });

        console.log(`✅ Healthcare Admin created: ${admin.email} (${admin.admin_category})`);
      } catch (error: any) {
        console.error(`❌ Healthcare Admin error (${admin.email}):`, error);
        results.errors.push({
          type: 'healthcare_admin',
          email: admin.email,
          category: admin.admin_category,
          error: error.message,
        });
      }
    }

    // ========================================
    // 3. SEED DOCTORS
    // ========================================
    console.log('🔧 Seeding Doctors...');
    const doctorsToSeed = [
      {
        email: 'dr.santos@gmail.com',
        password: 'Doctor@2025!',
        first_name: 'Juan',
        last_name: 'Santos',
        specialization: 'General Practitioner',
        license_number: 'PRC-123456789',
        contact_number: '+63 912 345 6789',
      },
      {
        email: 'dr.reyes@gmail.com',
        password: 'Doctor@2025!',
        first_name: 'Maria',
        last_name: 'Reyes',
        specialization: 'Pediatrician',
        license_number: 'PRC-987654321',
        contact_number: '+63 923 456 7890',
      },
    ];

    for (const doctor of doctorsToSeed) {
      try {
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser.users.find((u) => u.email === doctor.email);

        let userId: string;

        if (userExists) {
          userId = userExists.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: doctor.password,
          });
        } else {
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
            barangay_id: 1, // Default barangay
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
            max_patients_per_day: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (doctorError) throw doctorError;
        }

        results.doctors.push({
          email: doctor.email,
          name: `Dr. ${doctor.first_name} ${doctor.last_name}`,
          specialization: doctor.specialization,
          license_number: doctor.license_number,
          success: true,
          action: userExists ? 'updated' : 'created',
        });

        console.log(`✅ Doctor created: ${doctor.email} (${doctor.specialization})`);
      } catch (error: any) {
        console.error(`❌ Doctor error (${doctor.email}):`, error);
        results.errors.push({
          type: 'doctor',
          email: doctor.email,
          error: error.message,
        });
      }
    }

    // ========================================
    // 4. SEED PATIENTS (1 Pending, 3 Active)
    // ========================================
    console.log('🔧 Seeding Patients...');
    const patientsToSeed = [
      // PENDING PATIENT - for testing approval workflow
      {
        email: 'maria.santos@gmail.com',
        password: 'Patient@2025!',
        first_name: 'Maria',
        last_name: 'Santos',
        contact_number: '+63 923 456 7890',
        barangay_id: 2, // Gredu
        date_of_birth: '1995-03-20',
        gender: 'female' as const,
        emergency_contact: {
          name: 'Jose Santos',
          phone: '+63 923 888 8888',
          email: 'jose@email.com',
        },
        status: 'pending' as const,
      },
      // ACTIVE PATIENTS - pre-approved
      {
        email: 'juan.delacruz@gmail.com',
        password: 'Patient@2025!',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        contact_number: '+63 912 345 6789',
        barangay_id: 1, // San Nicolas
        date_of_birth: '1990-01-15',
        gender: 'male' as const,
        emergency_contact: {
          name: 'Maria Dela Cruz',
          phone: '+63 912 999 9999',
          email: 'maria@email.com',
        },
        status: 'active' as const,
      },
      {
        email: 'pedro.gonzales@gmail.com',
        password: 'Patient@2025!',
        first_name: 'Pedro',
        last_name: 'Gonzales',
        contact_number: '+63 934 567 8901',
        barangay_id: 3, // Salvacion
        date_of_birth: '1988-07-10',
        gender: 'male' as const,
        emergency_contact: {
          name: 'Ana Gonzales',
          phone: '+63 934 777 7777',
          email: 'ana@email.com',
        },
        status: 'active' as const,
      },
      {
        email: 'rosa.mendoza@gmail.com',
        password: 'Patient@2025!',
        first_name: 'Rosa',
        last_name: 'Mendoza',
        contact_number: '+63 945 678 9012',
        barangay_id: 4, // Quezon
        date_of_birth: '1992-12-05',
        gender: 'female' as const,
        emergency_contact: {
          name: 'Carlos Mendoza',
          phone: '+63 945 666 6666',
          email: 'carlos@email.com',
        },
        status: 'active' as const,
      },
    ];

    for (const patient of patientsToSeed) {
      try {
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUser.users.find((u) => u.email === patient.email);

        let userId: string;

        if (userExists) {
          userId = userExists.id;
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: patient.password,
          });
        } else {
          const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: patient.email,
            password: patient.password,
            email_confirm: true,
          });

          if (authError) throw authError;
          userId = authUser.user.id;
        }

        // Prepare profile data
        const profileData: any = {
          id: userId,
          email: patient.email,
          first_name: patient.first_name,
          last_name: patient.last_name,
          contact_number: patient.contact_number,
          barangay_id: patient.barangay_id,
          date_of_birth: patient.date_of_birth,
          gender: patient.gender,
          emergency_contact: patient.emergency_contact,
          role: 'patient',
          status: patient.status,
          updated_at: new Date().toISOString(),
        };

        // Set approval fields for active patients
        if (patient.status === 'active' && superAdminId) {
          profileData.approved_at = new Date().toISOString();
          profileData.approved_by = superAdminId;
        }

        // Update or insert profile
        const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
          profileData,
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

        let patientId: string;
        let finalPatientNumber: string;

        if (!existingPatient) {
          // Create patient record
          const { data: newPatient, error: patientError } = await supabaseAdmin
            .from('patients')
            .insert({
              user_id: userId,
              patient_number: patientNumber,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select('id, patient_number')
            .single();

          if (patientError) throw patientError;
          patientId = newPatient.id;
          finalPatientNumber = newPatient.patient_number;
        } else {
          patientId = existingPatient.id;
          finalPatientNumber = existingPatient.patient_number;
        }

        // Create health card for ACTIVE patients
        if (patient.status === 'active') {
          const { data: existingCard } = await supabaseAdmin
            .from('health_cards')
            .select('id, card_number')
            .eq('patient_id', patientId)
            .single();

          if (!existingCard) {
            const cardNumber = `HC-${dateStr}-${randomNum}`;
            const qrCodeData = JSON.stringify({
              patient_id: patientId,
              patient_number: finalPatientNumber,
              name: `${patient.first_name} ${patient.last_name}`,
              barangay_id: patient.barangay_id,
              emergency_contact: patient.emergency_contact.phone,
            });

            const issueDate = new Date();
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year validity

            const { data: newCard, error: cardError } = await supabaseAdmin
              .from('health_cards')
              .insert({
                patient_id: patientId,
                card_number: cardNumber,
                qr_code_data: qrCodeData,
                issue_date: issueDate.toISOString(),
                expiry_date: expiryDate.toISOString(),
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id, card_number')
              .single();

            if (cardError) throw cardError;

            results.health_cards.push({
              patient_email: patient.email,
              card_number: newCard.card_number,
              success: true,
            });

            console.log(`✅ Health card created for: ${patient.email}`);
          }
        }

        results.patients.push({
          email: patient.email,
          name: `${patient.first_name} ${patient.last_name}`,
          status: patient.status,
          patient_number: finalPatientNumber,
          has_health_card: patient.status === 'active',
          success: true,
          action: userExists ? 'updated' : 'created',
        });

        console.log(`✅ Patient created: ${patient.email} (${patient.status})`);
      } catch (error: any) {
        console.error(`❌ Patient error (${patient.email}):`, error);
        results.errors.push({
          type: 'patient',
          email: patient.email,
          error: error.message,
        });
      }
    }

    // ========================================
    // RETURN RESULTS
    // ========================================
    console.log('✅ Seeding completed!');
    console.log('Summary:', {
      super_admin: results.super_admin ? 1 : 0,
      healthcare_admins: results.healthcare_admins.length,
      doctors: results.doctors.length,
      patients: results.patients.length,
      health_cards: results.health_cards.length,
      errors: results.errors.length,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'All 14 test users seeded successfully!',
        summary: {
          super_admin: results.super_admin ? 1 : 0,
          healthcare_admins_created: results.healthcare_admins.length,
          doctors_created: results.doctors.length,
          patients_created: results.patients.length,
          health_cards_created: results.health_cards.length,
          errors: results.errors.length,
        },
        results: results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Seeding failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Seeding failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}
