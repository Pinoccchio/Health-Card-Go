import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requiresEncryption, getTemplate, getAllTemplateTypes, type TemplateType } from '@/lib/config/medicalRecordTemplates';
import { CreateMedicalRecordData } from '@/types/medical-records';
import { encryptMedicalRecordData, decryptMedicalRecordData } from '@/lib/utils/encryption';
import { logAuditAction, AUDIT_ACTIONS, AUDIT_ENTITIES } from '@/lib/utils/auditLog';

/**
 * GET /api/medical-records
 * List medical records with filtering
 * ACCESS RESTRICTED: Medical records feature has been removed from patient and healthcare admin.
 * Only Super Admin and Staff retain access for oversight and disease surveillance.
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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, admin_category, assigned_service_id')
      .eq('id', user.id)
      .single();

    console.log('👤 [PROFILE] User:', user.id, '| Role:', profile?.role, '| Assigned Service:', profile?.assigned_service_id);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Block access for patient and healthcare_admin
    if (profile.role === 'patient' || profile.role === 'healthcare_admin') {
      return NextResponse.json(
        { error: 'Access denied. Medical records feature is no longer available for this role.' },
        { status: 403 }
      );
    }

    // Parse filters
    const patient_id = searchParams.get('patient_id');
    const appointment_id = searchParams.get('appointment_id');
    const category = searchParams.get('category');
    const template_type = searchParams.get('template_type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const date = searchParams.get('date'); // Specific date for filtering (YYYY-MM-DD)

    // Use admin client to bypass RLS for nested joins
    // Security: Authentication verified above, role-based filtering applied below
    const adminClient = createAdminClient();

    // Build query
    let query = adminClient
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
      .order('created_at', { ascending: false});

    // Role-based filtering
    if (profile.role === 'patient') {
      // Patients can only see their own records
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
      // Healthcare admins see records from appointments in their assigned service
      if (!profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'No service assigned to your account' },
          { status: 403 }
        );
      }

      // Filter medical records by appointments in the admin's assigned service
      // This aligns with appointment access control logic
      const { data: serviceAppointments } = await adminClient
        .from('appointments')
        .select('id')
        .eq('service_id', profile.assigned_service_id);

      console.log('📅 [HEALTHCARE ADMIN] Service query - Service ID:', profile.assigned_service_id, '| Appointments found:', serviceAppointments?.length || 0);
      if (serviceAppointments && serviceAppointments.length > 0) {
        console.log('📅 [HEALTHCARE ADMIN] Appointment IDs:', serviceAppointments.map(a => a.id));
      }

      if (serviceAppointments && serviceAppointments.length > 0) {
        const appointmentIds = serviceAppointments.map((a) => a.id);
        query = query.in('appointment_id', appointmentIds);
      } else {
        // No appointments in this service yet, return empty results
        console.log('⚠️ [HEALTHCARE ADMIN] No appointments found for service - returning empty records');
        return NextResponse.json({
          success: true,
          records: [],
          total: 0,
          count: 0,
          has_records: false,
        });
      }
    } else if (profile.role === 'staff') {
      // Staff can view medical records when filtering by patient_id or appointment_id (for disease surveillance)
      // This allows them to check if patients have existing records
      if (!patient_id && !appointment_id) {
        return NextResponse.json({
          success: true,
          records: [],
          total: 0,
          count: 0,
          has_records: false,
          message: 'Please specify patient_id or appointment_id to view medical records.'
        });
      }
    }
    // Super admins can see all records (no filter)

    // Apply additional filters
    if (patient_id) {
      query = query.eq('patient_id', patient_id);
    }
    if (appointment_id) {
      query = query.eq('appointment_id', appointment_id);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (template_type) {
      query = query.eq('template_type', template_type);
    }
    if (date) {
      // Filter by specific date (matches records created on this date)
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
    } else {
      // Use start_date and end_date only if date is not specified
      if (start_date) {
        query = query.gte('created_at', start_date);
      }
      if (end_date) {
        query = query.lte('created_at', end_date);
      }
    }

    const { data: records, error: fetchError } = await query;

    console.log('📊 [RECORDS QUERY] Fetched:', records?.length || 0, 'records | Errors:', fetchError?.message || 'none');

    if (fetchError) {
      console.error('❌ [QUERY ERROR] Failed to fetch medical records:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch medical records' },
        { status: 500 }
      );
    }

    // Decrypt encrypted records before returning
    const encryptedCount = (records || []).filter(r => r.is_encrypted).length;
    console.log('🔐 [DECRYPTION] Processing', (records || []).length, 'records | Encrypted:', encryptedCount);

    const decryptedRecords = await Promise.all(
      (records || []).map(async (record) => {
        if (record.is_encrypted && typeof record.record_data === 'string') {
          try {
            const decryptedData = await decryptMedicalRecordData(record.record_data);
            return { ...record, record_data: decryptedData };
          } catch (error) {
            console.error('❌ [DECRYPTION FAILED] Record ID:', record.id, '| Error:', error);
            // Return record with encrypted data flag for UI to handle
            return { ...record, decryption_failed: true };
          }
        }
        return record;
      })
    );

    console.log('✅ [RESPONSE] Returning:', {
      total: decryptedRecords.length,
      encrypted_records: decryptedRecords.filter(r => r.is_encrypted).length,
      has_records: decryptedRecords.length > 0,
      role: profile.role,
      service_assigned: profile.assigned_service_id
    });

    return NextResponse.json({
      success: true,
      records: decryptedRecords,
      total: decryptedRecords.length,
      count: decryptedRecords.length, // For backward compatibility
      has_records: decryptedRecords.length > 0,
    });

  } catch (error) {
    console.error('Medical records fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/medical-records
 * Create a new medical record
 * Accessible by Healthcare Admins and Super Admins
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with assigned service
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Block access for patient and healthcare_admin
    if (profile.role === 'patient' || profile.role === 'healthcare_admin') {
      return NextResponse.json(
        { error: 'Access denied. Medical records feature is no longer available for this role.' },
        { status: 403 }
      );
    }

    // Only Super Admins and Staff can create medical records (for oversight and disease surveillance)
    if (!['super_admin', 'staff'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only Super Admins and Staff can create medical records' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: CreateMedicalRecordData = await request.json();
    const { patient_id, appointment_id, template_type, category, record_data } = body;

    // Validate required fields
    if (!patient_id || !template_type || !category || !record_data) {
      return NextResponse.json(
        { error: 'Missing required fields: patient_id, template_type, category, record_data' },
        { status: 400 }
      );
    }

    // Validate template_type is valid
    const validTemplateTypes = getAllTemplateTypes();
    if (!validTemplateTypes.includes(template_type as TemplateType)) {
      return NextResponse.json(
        {
          error: `Invalid template_type. Must be one of: ${validTemplateTypes.join(', ')}`,
          provided: template_type,
          valid_types: validTemplateTypes
        },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for nested joins
    const adminClient = createAdminClient();

    // For Healthcare Admins, validate service assignment
    if (profile.role === 'healthcare_admin') {
      if (!profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'No service assigned to your account' },
          { status: 403 }
        );
      }

      // If appointment_id is provided, verify it matches the Healthcare Admin's assigned service
      if (appointment_id) {
        const { data: appointment, error: appointmentError } = await adminClient
          .from('appointments')
          .select('service_id')
          .eq('id', appointment_id)
          .single();

        if (appointmentError || !appointment) {
          return NextResponse.json(
            { error: 'Appointment not found' },
            { status: 404 }
          );
        }

        if (appointment.service_id !== profile.assigned_service_id) {
          return NextResponse.json(
            { error: 'You can only create medical records for appointments in your assigned service' },
            { status: 403 }
          );
        }
      }
    }

    const { data: patient, error: patientError } = await adminClient
      .from('patients')
      .select('id, user_id')
      .eq('id', patient_id)
      .single();

    if (patientError || !patient) {
      console.error('Patient lookup error:', patientError);
      return NextResponse.json({
        error: 'Patient not found',
        details: patientError?.message
      }, { status: 404 });
    }

    // Get patient profile separately
    const { data: patientProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('first_name, last_name, barangay_id')
      .eq('id', patient.user_id)
      .single();

    if (profileError || !patientProfile) {
      console.error('Profile lookup error:', profileError);
      return NextResponse.json({
        error: 'Patient profile not found',
        details: profileError?.message
      }, { status: 404 });
    }

    // Verify appointment exists (if provided)
    if (appointment_id) {
      const { data: appointment } = await supabase
        .from('appointments')
        .select('id, patient_id, status')
        .eq('id', appointment_id)
        .single();

      if (!appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
      }

      if (appointment.patient_id !== patient_id) {
        return NextResponse.json(
          { error: 'Appointment does not belong to this patient' },
          { status: 400 }
        );
      }
    }

    // LAYER 2: API-side duplicate detection
    // Check for recent duplicates (same patient + template + category within last 30 seconds)
    // This catches accidental double-clicks while allowing legitimate multiple records
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();

    const { data: recentRecords, error: duplicateCheckError } = await adminClient
      .from('medical_records')
      .select('id, created_at, appointment_id')
      .eq('patient_id', patient_id)
      .eq('template_type', template_type)
      .eq('category', category)
      .gte('created_at', thirtySecondsAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (duplicateCheckError) {
      console.error('Duplicate check error:', duplicateCheckError);
      // Don't fail the request if duplicate check fails, just log it
    }

    if (recentRecords && recentRecords.length > 0) {
      const existingRecord = recentRecords[0];
      const timeDiff = Math.floor((Date.now() - new Date(existingRecord.created_at).getTime()) / 1000);

      console.warn('Duplicate medical record detected:', {
        existing_id: existingRecord.id,
        existing_created_at: existingRecord.created_at,
        time_difference_seconds: timeDiff,
        patient_id,
        template_type,
        category,
      });

      return NextResponse.json(
        {
          error: `A medical record was just created ${timeDiff} seconds ago. This appears to be a duplicate submission. Please refresh the page to view the existing record.`,
          duplicate: true,
          existing_record_id: existingRecord.id,
          created_at: existingRecord.created_at,
        },
        { status: 409 } // Conflict status code
      );
    }

    // LAYER 3: Appointment-linked validation
    // If appointment_id is provided, check if a record already exists for this appointment
    if (appointment_id) {
      const { data: appointmentRecords } = await adminClient
        .from('medical_records')
        .select('id')
        .eq('appointment_id', appointment_id)
        .limit(1);

      if (appointmentRecords && appointmentRecords.length > 0) {
        console.warn('Medical record already exists for appointment:', {
          appointment_id,
          existing_record_id: appointmentRecords[0].id,
        });

        return NextResponse.json(
          {
            error: 'A medical record already exists for this appointment.',
            duplicate: true,
            existing_record_id: appointmentRecords[0].id,
          },
          { status: 409 }
        );
      }
    }

    // Get template to check encryption requirement
    const template = getTemplate(template_type as TemplateType);
    if (!template) {
      return NextResponse.json(
        { error: 'Invalid template type' },
        { status: 400 }
      );
    }
    const shouldEncrypt = template.requiresEncryption;

    // Encrypt sensitive data (HIV and Pregnancy records)
    let dataToStore: any = record_data;
    if (shouldEncrypt) {
      try {
        // Encrypt the entire record_data object
        dataToStore = await encryptMedicalRecordData(record_data);
      } catch (error) {
        console.error('Encryption error:', error);
        return NextResponse.json(
          { error: 'Failed to encrypt sensitive data' },
          { status: 500 }
        );
      }
    }

    // Create medical record (adminClient already defined above)
    const { data: medicalRecord, error: createError } = await adminClient
      .from('medical_records')
      .insert({
        patient_id,
        appointment_id: appointment_id || null,
        created_by_id: profile.id, // Healthcare Admin or Super Admin
        category,
        template_type,
        record_data: dataToStore, // Store encrypted or plain data
        is_encrypted: shouldEncrypt,
      })
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
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating medical record:', createError);
      return NextResponse.json(
        { error: 'Failed to create medical record' },
        { status: 500 }
      );
    }

    // Disease surveillance integration
    // If template has diseaseTypes and diagnosis is recorded, create disease case
    if (template.diseaseTypes && record_data.diagnosis) {
      const diagnosis = record_data.diagnosis.toLowerCase();
      const diseaseType = template.diseaseTypes.find(dt =>
        diagnosis.includes(dt.toLowerCase().replace('_', ' '))
      );

      if (diseaseType && patientProfile) {
        // Create disease case for surveillance
        await adminClient.from('diseases').insert({
          patient_id,
          medical_record_id: medicalRecord.id,
          barangay_id: patientProfile.barangay_id,
          disease_type: diseaseType,
          diagnosis_date: new Date().toISOString().split('T')[0],
          severity: record_data.severity || 'moderate',
          status: 'active',
        });
      }
    }

    // Note: Appointment completion should be done via POST /api/appointments/[id]/complete
    // This endpoint only creates medical records and links them to appointments
    // The appointment completion flow handles status updates, notifications, and history logging

    // Log audit trail
    await logAuditAction({
      supabase,
      userId: profile.id, // Healthcare Admin or Super Admin who created the record
      action: AUDIT_ACTIONS.MEDICAL_RECORD_CREATED,
      entityType: AUDIT_ENTITIES.MEDICAL_RECORD,
      entityId: medicalRecord.id,
      changes: {
        before: null,
        after: {
          patient_id: medicalRecord.patient_id,
          template_type: medicalRecord.template_type,
          category: medicalRecord.category,
          is_encrypted: medicalRecord.is_encrypted,
          appointment_id: medicalRecord.appointment_id,
        },
      },
      request,
    });

    return NextResponse.json({
      success: true,
      data: medicalRecord,
      message: 'Medical record created successfully',
    });

  } catch (error) {
    console.error('Medical record creation error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
