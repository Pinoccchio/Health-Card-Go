import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/healthcare-admin/reports/patients
 *
 * Fetch patient statistics for healthcare admin's assigned service
 *
 * Access: ALL patterns (1, 2, 3, 4)
 *
 * Query Parameters:
 * - start_date: YYYY-MM-DD (optional - for filtering by appointment date)
 * - end_date: YYYY-MM-DD (optional)
 * - barangay_id: number (optional)
 */
export async function GET(request: NextRequest) {
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

    console.log('[HEALTHCARE ADMIN REPORTS - PATIENTS] User authenticated:', {
      user_id: user.id,
      email: user.email,
      role: profile.role,
      assigned_service_id: profile.assigned_service_id,
      service_name: service?.name,
      service_pattern: service.requires_appointment && service.requires_medical_record ? 'Pattern 2' :
                       service.requires_appointment ? 'Pattern 1' :
                       service.requires_medical_record ? 'Pattern 3' : 'Pattern 4',
    });

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const barangayId = searchParams.get('barangay_id');

    console.log('[HEALTHCARE ADMIN REPORTS - PATIENTS] Query parameters:', {
      start_date: startDate || 'not provided',
      end_date: endDate || 'not provided',
      barangay_id: barangayId || 'all barangays',
      service_id: profile.assigned_service_id,
    });

    // Get all patients who have used this service
    // For appointment-based services (Pattern 1 & 2): patients with appointments
    // For walk-in services (Pattern 3 & 4): patients with medical records (Pattern 3) or all patients
    let patientIds: string[] = [];

    if (service.requires_appointment) {
      // Pattern 1 & 2: Get patients from appointments
      let appointmentsQuery = supabase
        .from('appointments')
        .select('patient_id, appointment_date')
        .eq('service_id', profile.assigned_service_id);

      if (startDate && endDate) {
        appointmentsQuery = appointmentsQuery
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);
      }

      const { data: appointments, error: apptError } = await appointmentsQuery;

      if (apptError) {
        console.error('[HEALTHCARE ADMIN REPORTS] Error fetching appointments:', apptError);
        return NextResponse.json(
          { error: 'Failed to fetch patient statistics' },
          { status: 500 }
        );
      }

      // Extract unique patient IDs
      patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];
    } else {
      // Pattern 3 & 4: Walk-in services
      if (service.requires_medical_record) {
        // Pattern 3: Get patients from medical records
        // Use admin client to bypass RLS policies that require appointments
        // RLS policy "Healthcare admins view service records" requires appointment link
        // But Pattern 3 services are walk-in only (no appointments), so we bypass RLS
        const adminClient = createAdminClient();

        let medRecordsQuery = adminClient
          .from('medical_records')
          .select('patient_id, created_at')
          .eq('created_by_id', user.id); // Records created by this admin

        if (startDate && endDate) {
          medRecordsQuery = medRecordsQuery
            .gte('created_at', startDate)
            .lte('created_at', `${endDate}T23:59:59`); // Include records created throughout the end date
        }

        const { data: medRecords, error: medError } = await medRecordsQuery;

        if (medError) {
          console.error('[HEALTHCARE ADMIN REPORTS] Error fetching medical records:', medError);
          return NextResponse.json(
            { error: 'Failed to fetch patient statistics' },
            { status: 500 }
          );
        }

        patientIds = [...new Set(medRecords?.map(m => m.patient_id) || [])];
      } else {
        // Pattern 4: Walk-in seminars/events (e.g., Health Education Seminar)
        // Track attendance via appointments (same as Pattern 1, but walk-in registration)
        // Apply date filtering if provided
        let appointmentsQuery = supabase
          .from('appointments')
          .select('patient_id, appointment_date')
          .eq('service_id', profile.assigned_service_id)
          .eq('status', 'completed'); // Only completed seminars count as attendance

        if (startDate && endDate) {
          appointmentsQuery = appointmentsQuery
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate);
        }

        const { data: appointments, error: apptError } = await appointmentsQuery;

        if (apptError) {
          console.error('[HEALTHCARE ADMIN REPORTS] Error fetching appointments:', apptError);
          return NextResponse.json(
            { error: 'Failed to fetch patient statistics' },
            { status: 500 }
          );
        }

        patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];
      }
    }

    console.log('[HEALTHCARE ADMIN REPORTS - PATIENTS] Patient IDs collected:', {
      unique_patients: patientIds.length,
      method: service.requires_appointment ? 'from appointments' :
              service.requires_medical_record ? 'from medical records' : 'all active patients',
    });

    // If no patients found, return empty statistics
    if (patientIds.length === 0) {
      console.log('[HEALTHCARE ADMIN REPORTS - PATIENTS] No patients found, returning empty statistics');
      return NextResponse.json({
        success: true,
        data: {
          service: {
            id: service.id,
            name: service.name,
          },
          summary: {
            total_patients: 0,
            active: 0,
            inactive: 0,
            suspended: 0,
          },
          barangay_breakdown: [],
          status_breakdown: [
            { status: 'Active', count: 0 },
            { status: 'Inactive', count: 0 },
            { status: 'Suspended', count: 0 },
          ],
          filters_applied: {
            start_date: startDate || null,
            end_date: endDate || null,
            barangay_id: barangayId || null,
          },
        },
      });
    }

    // First get the patient records to convert patient_id → user_id
    const { data: patientRecords, error: patientRecordsError } = await supabase
      .from('patients')
      .select('id, user_id')
      .in('id', patientIds);

    if (patientRecordsError) {
      console.error('[HEALTHCARE ADMIN REPORTS - PATIENTS] Error fetching patient records:', patientRecordsError);
      return NextResponse.json(
        { error: 'Failed to fetch patient statistics' },
        { status: 500 }
      );
    }

    console.log('[HEALTHCARE ADMIN REPORTS - PATIENTS] Converted patient_ids to user_ids:', {
      patient_records_found: patientRecords?.length || 0,
    });

    // Extract user_ids for profile lookup
    const userIds = patientRecords?.map(p => p.user_id) || [];

    // Now query profiles with correct IDs
    let patientsQuery = supabase
      .from('profiles')
      .select(`
        id,
        status,
        barangay_id,
        barangays (
          id,
          name
        )
      `)
      .in('id', userIds)  // ✅ NOW using correct IDs from patients.user_id
      .eq('role', 'patient');

    // Add barangay filter if provided
    if (barangayId) {
      patientsQuery = patientsQuery.eq('barangay_id', parseInt(barangayId));
    }

    const { data: patients, error: patientsError } = await patientsQuery;

    if (patientsError) {
      console.error('[HEALTHCARE ADMIN REPORTS - PATIENTS] Error fetching patient details:', patientsError);
      return NextResponse.json(
        { error: 'Failed to fetch patient statistics' },
        { status: 500 }
      );
    }

    console.log('[HEALTHCARE ADMIN REPORTS - PATIENTS] Patient details fetched:', {
      patients_found: patients?.length || 0,
      barangay_filter_applied: barangayId ? 'yes' : 'no',
    });

    // Calculate summary statistics
    const summaryStats = {
      total_patients: patients?.length || 0,
      active: patients?.filter(p => p.status === 'active').length || 0,
      inactive: patients?.filter(p => p.status === 'inactive').length || 0,
      suspended: patients?.filter(p => p.status === 'suspended').length || 0,
    };

    // Calculate status breakdown for pie chart
    const statusBreakdown = [
      { status: 'Active', count: summaryStats.active },
      { status: 'Inactive', count: summaryStats.inactive },
      { status: 'Suspended', count: summaryStats.suspended },
    ];

    // Calculate barangay breakdown
    const barangayMap: { [key: string]: { name: string; count: number } } = {};
    patients?.forEach(patient => {
      const barangay = patient.barangays as any;
      if (barangay) {
        const key = barangay.id.toString();
        if (!barangayMap[key]) {
          barangayMap[key] = { name: barangay.name, count: 0 };
        }
        barangayMap[key].count++;
      }
    });

    const barangayBreakdown = Object.entries(barangayMap)
      .map(([id, data]) => ({
        barangay_id: parseInt(id),
        barangay_name: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .slice(0, 10); // Top 10 barangays

    console.log('[HEALTHCARE ADMIN REPORTS - PATIENTS] Sending response:', {
      summary_stats: summaryStats,
      top_barangays: barangayBreakdown.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        service: {
          id: service.id,
          name: service.name,
        },
        summary: summaryStats,
        status_breakdown: statusBreakdown,
        barangay_breakdown: barangayBreakdown,
        filters_applied: {
          start_date: startDate || null,
          end_date: endDate || null,
          barangay_id: barangayId || null,
        },
      },
    });

  } catch (error) {
    console.error('[HEALTHCARE ADMIN REPORTS] Unexpected error in GET /api/healthcare-admin/reports/patients:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
