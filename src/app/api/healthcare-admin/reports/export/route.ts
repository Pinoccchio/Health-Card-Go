import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getDiseaseDisplayName } from '@/lib/constants/diseaseConstants';

/**
 * POST /api/healthcare-admin/reports/export
 *
 * Export report data as CSV or PDF
 *
 * Access: Healthcare Admin only (service-specific)
 *
 * Request Body:
 * {
 *   type: 'appointments' | 'patients' | 'diseases',
 *   format: 'csv' | 'pdf',
 *   start_date: 'YYYY-MM-DD',
 *   end_date: 'YYYY-MM-DD',
 *   barangay_id?: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role and assigned service
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        role,
        first_name,
        last_name,
        assigned_service_id,
        services:assigned_service_id (
          id,
          name,
          requires_appointment,
          requires_medical_record
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only healthcare_admin can access
    if (profile.role !== 'healthcare_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Healthcare Admin access required' },
        { status: 403 }
      );
    }

    // Check if admin has an assigned service
    if (!profile.assigned_service_id) {
      return NextResponse.json(
        { error: 'No service assigned to your account' },
        { status: 403 }
      );
    }

    const service = profile.services as any;

    // Parse request body
    const body = await request.json();
    const { type, format, start_date, end_date, barangay_id } = body;

    console.log('[HEALTHCARE ADMIN REPORTS - EXPORT] Export requested:', {
      user_id: user.id,
      email: user.email,
      service_name: service?.name,
      export_type: type,
      export_format: format,
      date_range: start_date && end_date ? `${start_date} to ${end_date}` : 'not provided',
      barangay_id: barangay_id || 'all',
    });

    // Validate required fields
    if (!type || !format) {
      return NextResponse.json(
        { error: 'type and format are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['appointments', 'patients', 'diseases', 'comprehensive'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats = ['csv', 'pdf', 'excel'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    // Create admin client to bypass RLS for data fetching
    // This is safe because we've already verified user role and service assignment above
    const adminClient = createAdminClient();

    // Check permissions based on type
    if (type === 'appointments' && !service.requires_appointment) {
      return NextResponse.json(
        { error: 'Your assigned service does not handle appointments' },
        { status: 403 }
      );
    }

    if (type === 'diseases' && !service.requires_medical_record) {
      return NextResponse.json(
        { error: 'Your assigned service does not have access to medical records' },
        { status: 403 }
      );
    }

    // Fetch data based on type
    let data: any[] = [];
    let filename = '';

    if (type === 'appointments') {
      // Fetch appointments with patient_id only (no nested joins)
      let query = supabase
        .from('appointments')
        .select('id, appointment_number, appointment_date, appointment_time, status, reason, created_at, patient_id')
        .eq('service_id', profile.assigned_service_id)
        .order('appointment_date', { ascending: false });

      if (start_date && end_date) {
        query = query.gte('appointment_date', start_date).lte('appointment_date', end_date);
      }

      const { data: appointments, error: fetchError } = await query;

      if (fetchError) {
        console.error('[EXPORT] Error fetching appointments:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch appointments data' },
          { status: 500 }
        );
      }

      console.log('[EXPORT] Appointments fetched:', { count: appointments?.length || 0 });

      // Get unique patient IDs and fetch patient details
      const patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];

      if (patientIds.length > 0) {
        // Convert patient_id → user_id
        const { data: patientRecords } = await supabase
          .from('patients')
          .select('id, patient_number, user_id')
          .in('id', patientIds);

        const userIds = patientRecords?.map(p => p.user_id) || [];

        // Fetch profiles with barangay info
        let profilesQuery = supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            email,
            contact_number,
            barangay_id,
            barangays (
              name
            )
          `)
          .in('id', userIds);

        if (barangay_id) {
          profilesQuery = profilesQuery.eq('barangay_id', parseInt(barangay_id));
        }

        const { data: profiles } = await profilesQuery;

        // Create lookup maps
        const patientMap = new Map(patientRecords?.map(p => [p.id, p]) || []);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        console.log('[EXPORT] Patients fetched:', { count: patientRecords?.length || 0 });
        console.log('[EXPORT] Profiles fetched:', { count: profiles?.length || 0 });

        // Map appointments with patient/profile data
        data = appointments?.map(appt => {
          const patient = patientMap.get(appt.patient_id);
          const profile = patient ? profileMap.get(patient.user_id) : null;
          const barangay = profile?.barangays as any;

          return {
            'Appointment #': appt.appointment_number,
            'Date': appt.appointment_date,
            'Time': appt.appointment_time,
            'Patient Number': patient?.patient_number || 'N/A',
            'Patient Name': profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'N/A',
            'Email': profile?.email || 'N/A',
            'Contact': profile?.contact_number || 'N/A',
            'Barangay': barangay?.name || 'N/A',
            'Status': appt.status,
            'Reason': appt.reason || 'N/A',
          };
        }) || [];
      }

      filename = `appointments_${service.name.replace(/\s+/g, '_')}_${start_date || 'all'}_to_${end_date || 'all'}`;

    } else if (type === 'patients') {
      // Fetch patients who used this service
      let patientIds: string[] = [];

      if (service.requires_appointment) {
        // Get from appointments
        let appointmentsQuery = supabase
          .from('appointments')
          .select('patient_id')
          .eq('service_id', profile.assigned_service_id);

        if (start_date && end_date) {
          appointmentsQuery = appointmentsQuery
            .gte('appointment_date', start_date)
            .lte('appointment_date', end_date);
        }

        const { data: appointments } = await appointmentsQuery;
        patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];
      } else if (service.requires_medical_record) {
        // Get from medical records (Pattern 3: Walk-in + Medical Records)
        // Use admin client to bypass RLS policies
        let medRecordsQuery = adminClient
          .from('medical_records')
          .select('patient_id')
          .eq('created_by_id', user.id);

        if (start_date && end_date) {
          medRecordsQuery = medRecordsQuery
            .gte('created_at', start_date)
            .lte('created_at', `${end_date}T23:59:59`);
        }

        const { data: medRecords } = await medRecordsQuery;
        patientIds = [...new Set(medRecords?.map(m => m.patient_id) || [])];
      } else {
        // Pattern 4: Walk-in seminars/events (e.g., Health Education Seminar)
        // Track attendance via appointments - only count completed seminars
        let appointmentsQuery = supabase
          .from('appointments')
          .select('patient_id')
          .eq('service_id', profile.assigned_service_id)
          .eq('status', 'completed'); // Only completed seminars count as attendance

        if (start_date && end_date) {
          appointmentsQuery = appointmentsQuery
            .gte('appointment_date', start_date)
            .lte('appointment_date', end_date);
        }

        const { data: appointments } = await appointmentsQuery;
        patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];
      }

      if (patientIds.length > 0) {
        // Convert patient_id → user_id
        const { data: patientRecords } = await supabase
          .from('patients')
          .select('id, patient_number, user_id')
          .in('id', patientIds);

        const userIds = patientRecords?.map(p => p.user_id) || [];

        console.log('[EXPORT] Patient records fetched for patients export:', {
          patient_ids: patientIds.length,
          patient_records: patientRecords?.length || 0,
          user_ids: userIds.length
        });

        // Create patient lookup map for later
        const patientMap = new Map(patientRecords?.map(p => [p.user_id, p]) || []);

        let patientsQuery = supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            email,
            contact_number,
            status,
            date_of_birth,
            gender,
            created_at,
            barangays (
              name
            )
          `)
          .in('id', userIds)
          .eq('role', 'patient');

        if (barangay_id) {
          patientsQuery = patientsQuery.eq('barangay_id', parseInt(barangay_id));
        }

        const { data: patients, error: fetchError } = await patientsQuery;

        if (fetchError) {
          console.error('[EXPORT] Error fetching patients:', fetchError);
          return NextResponse.json(
            { error: 'Failed to fetch patients data' },
            { status: 500 }
          );
        }

        data = patients?.map(patient => {
          const patientData = patientMap.get(patient.id);
          const barangay = patient.barangays as any;

          return {
            'Patient Number': patientData?.patient_number || 'N/A',
            'Name': `${patient.first_name} ${patient.last_name}`,
            'Email': patient.email,
            'Contact': patient.contact_number || 'N/A',
            'Date of Birth': patient.date_of_birth || 'N/A',
            'Gender': patient.gender || 'N/A',
            'Barangay': barangay?.name || 'N/A',
            'Status': patient.status,
            'Registration Date': new Date(patient.created_at).toLocaleDateString(),
          };
        }) || [];
      }

      filename = `patients_${service.name.replace(/\s+/g, '_')}_${start_date || 'all'}_to_${end_date || 'all'}`;

    } else if (type === 'diseases') {
      // Fetch disease cases - use admin client to bypass RLS
      let medRecordsQuery = adminClient
        .from('medical_records')
        .select('id')
        .eq('created_by_id', user.id);

      if (start_date && end_date) {
        medRecordsQuery = medRecordsQuery
          .gte('created_at', start_date)
          .lte('created_at', `${end_date}T23:59:59`);
      }

      const { data: medicalRecords } = await medRecordsQuery;
      const medRecordIds = medicalRecords?.map(mr => mr.id) || [];

      if (medRecordIds.length > 0) {
        let diseasesQuery = adminClient
          .from('diseases')
          .select(`
            id,
            disease_type,
            custom_disease_name,
            diagnosis_date,
            severity,
            status,
            patients:patient_id (
              patient_number,
              profiles:user_id (
                first_name,
                last_name
              )
            ),
            barangays (
              name
            )
          `)
          .in('medical_record_id', medRecordIds);

        if (barangay_id) {
          diseasesQuery = diseasesQuery.eq('barangay_id', parseInt(barangay_id));
        }

        const { data: diseases, error: fetchError } = await diseasesQuery;

        if (fetchError) {
          console.error('[EXPORT] Error fetching diseases:', fetchError);
          return NextResponse.json(
            { error: 'Failed to fetch disease cases data' },
            { status: 500 }
          );
        }

        data = diseases?.map(disease => {
          const patientData = disease.patients as any;
          const profileData = patientData?.profiles as any;
          const barangay = disease.barangays as any;

          return {
            'Disease Type': getDiseaseDisplayName(disease.disease_type, disease.custom_disease_name),
            'Diagnosis Date': disease.diagnosis_date,
            'Severity': disease.severity || 'N/A',
            'Status': disease.status,
            'Patient Number': patientData?.patient_number || 'N/A',
            'Patient Name': `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim(),
            'Barangay': barangay?.name || 'N/A',
          };
        }) || [];
      }

      filename = `disease_cases_${service.name.replace(/\s+/g, '_')}_${start_date || 'all'}_to_${end_date || 'all'}`;
    } else if (type === 'comprehensive') {
      // Fetch all data types for comprehensive export
      console.log('[EXPORT] Fetching comprehensive export data...');

      const comprehensiveData: any = {
        summary: {},
        appointments: [],
        patients: [],
        diseases: [],
      };

      // Fetch appointments data (if service requires appointments)
      if (service.requires_appointment && start_date && end_date) {
        // Use same logic as appointments export above
        let appointmentsQuery = supabase
          .from('appointments')
          .select('id, appointment_number, appointment_date, appointment_time, status, reason, patient_id')
          .eq('service_id', profile.assigned_service_id)
          .gte('appointment_date', start_date)
          .lte('appointment_date', end_date)
          .order('appointment_date', { ascending: false });

        const { data: appointments } = await appointmentsQuery;
        const patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];

        if (patientIds.length > 0) {
          const { data: patientRecords } = await supabase
            .from('patients')
            .select('id, patient_number, user_id')
            .in('id', patientIds);

          const userIds = patientRecords?.map(p => p.user_id) || [];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email, contact_number, barangay_id, barangays(name)')
            .in('id', userIds);

          const patientMap = new Map(patientRecords?.map(p => [p.id, p]) || []);
          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          comprehensiveData.appointments = appointments?.map(appt => {
            const patient = patientMap.get(appt.patient_id);
            const profile = patient ? profileMap.get(patient.user_id) : null;
            const barangay = profile?.barangays as any;

            return {
              'Appointment #': appt.appointment_number,
              'Date': appt.appointment_date,
              'Time': appt.appointment_time,
              'Patient Number': patient?.patient_number || 'N/A',
              'Patient Name': profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'N/A',
              'Email': profile?.email || 'N/A',
              'Contact': profile?.contact_number || 'N/A',
              'Barangay': barangay?.name || 'N/A',
              'Status': appt.status,
              'Reason': appt.reason || 'N/A',
            };
          }) || [];

          // Calculate summary stats
          comprehensiveData.summary.total_appointments = appointments?.length || 0;
          comprehensiveData.summary.completed_appointments = appointments?.filter(a => a.status === 'completed').length || 0;
          comprehensiveData.summary.scheduled_appointments = appointments?.filter(a => a.status === 'scheduled').length || 0;
          comprehensiveData.summary.cancelled_appointments = appointments?.filter(a => a.status === 'cancelled').length || 0;
        }
      }

      // Fetch patients data
      let patientIdsForExport: string[] = [];

      if (service.requires_appointment && start_date && end_date) {
        // Pattern 1 & 2: Get patients from appointments
        const { data: appointments } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('service_id', profile.assigned_service_id)
          .gte('appointment_date', start_date)
          .lte('appointment_date', end_date);
        patientIdsForExport = [...new Set(appointments?.map(a => a.patient_id) || [])];
      } else if (service.requires_medical_record && start_date && end_date) {
        // Pattern 3: Walk-in + Medical Records - Get patients from medical records
        const { data: medRecords } = await adminClient
          .from('medical_records')
          .select('patient_id')
          .eq('created_by_id', user.id)
          .gte('created_at', start_date)
          .lte('created_at', `${end_date}T23:59:59`);
        patientIdsForExport = [...new Set(medRecords?.map(m => m.patient_id) || [])];
      } else if (!service.requires_appointment && !service.requires_medical_record && start_date && end_date) {
        // Pattern 4: Walk-in seminars/events (e.g., Health Education Seminar)
        // Track attendance via completed appointments
        const { data: appointments } = await supabase
          .from('appointments')
          .select('patient_id')
          .eq('service_id', profile.assigned_service_id)
          .eq('status', 'completed')
          .gte('appointment_date', start_date)
          .lte('appointment_date', end_date);
        patientIdsForExport = [...new Set(appointments?.map(a => a.patient_id) || [])];
      }

      if (patientIdsForExport.length > 0) {
        const { data: patientRecords } = await supabase
          .from('patients')
          .select('id, patient_number, user_id')
          .in('id', patientIdsForExport);

        const userIds = patientRecords?.map(p => p.user_id) || [];
        const patientMap = new Map(patientRecords?.map(p => [p.user_id, p]) || []);

        const { data: patients } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, contact_number, status, date_of_birth, gender, created_at, barangays(name)')
          .in('id', userIds)
          .eq('role', 'patient');

        comprehensiveData.patients = patients?.map(patient => {
          const patientData = patientMap.get(patient.id);
          const barangay = patient.barangays as any;

          return {
            'Patient Number': patientData?.patient_number || 'N/A',
            'Name': `${patient.first_name} ${patient.last_name}`,
            'Email': patient.email,
            'Contact': patient.contact_number || 'N/A',
            'Date of Birth': patient.date_of_birth || 'N/A',
            'Gender': patient.gender || 'N/A',
            'Barangay': barangay?.name || 'N/A',
            'Status': patient.status,
            'Registration Date': new Date(patient.created_at).toLocaleDateString(),
          };
        }) || [];

        comprehensiveData.summary.total_patients = patients?.length || 0;
        comprehensiveData.summary.active_patients = patients?.filter(p => p.status === 'active').length || 0;
      }

      // Fetch disease data (comprehensive export includes all available data)
      if (start_date && end_date) {
        const { data: medicalRecords } = await adminClient
          .from('medical_records')
          .select('id')
          .eq('created_by_id', user.id)
          .gte('created_at', start_date)
          .lte('created_at', `${end_date}T23:59:59`);

        const medRecordIds = medicalRecords?.map(mr => mr.id) || [];

        if (medRecordIds.length > 0) {
          const { data: diseases, error: diseasesFetchError } = await adminClient
            .from('diseases')
            .select(`
              disease_type,
              custom_disease_name,
              diagnosis_date,
              severity,
              status,
              patients:patient_id (
                patient_number,
                profiles:user_id (
                  first_name,
                  last_name
                )
              ),
              barangays (
                name
              )
            `)
            .in('medical_record_id', medRecordIds);

          if (diseasesFetchError) {
            console.error('[EXPORT - COMPREHENSIVE] Error fetching diseases:', diseasesFetchError);
          }

          comprehensiveData.diseases = diseases?.map(disease => {
            const patientData = disease.patients as any;
            const profileData = patientData?.profiles as any;
            const barangay = disease.barangays as any;

            return {
              'Disease Type': getDiseaseDisplayName(disease.disease_type, disease.custom_disease_name),
              'Diagnosis Date': disease.diagnosis_date,
              'Severity': disease.severity || 'N/A',
              'Status': disease.status,
              'Patient Number': patientData?.patient_number || 'N/A',
              'Patient Name': `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim(),
              'Barangay': barangay?.name || 'N/A',
            };
          }) || [];

          comprehensiveData.summary.total_disease_cases = diseases?.length || 0;
        }
      }

      data = comprehensiveData;
      filename = `comprehensive_report_${service.name.replace(/\s+/g, '_')}_${start_date || 'all'}_to_${end_date || 'all'}`;

      console.log('[EXPORT] Comprehensive export data prepared:', {
        appointments_count: comprehensiveData.appointments.length,
        patients_count: comprehensiveData.patients.length,
        diseases_count: comprehensiveData.diseases.length,
      });
    }

    console.log('[HEALTHCARE ADMIN REPORTS - EXPORT] Export data prepared:', {
      type,
      format,
      records_count: typeof data === 'object' && !Array.isArray(data) ? Object.keys(data).length : data.length,
      filename,
    });

    // Return data for client-side processing
    // CSV and PDF generation will be handled on the client side
    return NextResponse.json({
      success: true,
      data,
      metadata: {
        type,
        format,
        service: service.name,
        generated_by: `${profile.first_name} ${profile.last_name}`,
        generated_at: new Date().toISOString(),
        filters: {
          start_date: start_date || null,
          end_date: end_date || null,
          barangay_id: barangay_id || null,
        },
        filename,
      },
    });

  } catch (error) {
    console.error('[HEALTHCARE ADMIN REPORTS] Unexpected error in POST /api/healthcare-admin/reports/export:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
