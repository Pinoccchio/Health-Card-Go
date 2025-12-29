import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/healthcare-admin/patients
 *
 * Fetch patients for healthcare admin's assigned service
 * Access: Healthcare Admins only (service-specific filtering)
 *
 * Query Parameters:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 * - search: string (name, email, patient_number)
 * - status: string (active, inactive, suspended)
 * - barangay_id: number
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with assigned service
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

    console.log('[HEALTHCARE ADMIN PATIENTS] User authenticated:', {
      user_id: user.id,
      email: user.email,
      role: profile.role,
      assigned_service_id: profile.assigned_service_id,
      service_name: service?.name,
    });

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search')?.trim() || '';
    const barangayId = searchParams.get('barangay_id');

    console.log('[HEALTHCARE ADMIN PATIENTS] Query parameters:', {
      page,
      limit,
      offset,
      statusFilter,
      search,
      barangayId,
    });

    // Get patient IDs based on service pattern
    let patientIds: string[] = [];

    if (service.requires_appointment) {
      // Pattern 1 & 2: Get patients from appointments (all time, no date filter)
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('service_id', profile.assigned_service_id);

      if (apptError) {
        console.error('[HEALTHCARE ADMIN PATIENTS] Error fetching appointments:', apptError);
        return NextResponse.json(
          { error: 'Failed to fetch patients' },
          { status: 500 }
        );
      }

      patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];
      console.log(`[HEALTHCARE ADMIN PATIENTS] Found ${patientIds.length} unique patients from appointments`);
    } else if (service.requires_medical_record) {
      // Pattern 3: Walk-in with medical records
      // Use admin client to bypass RLS policies that require appointments
      // RLS policy "Healthcare admins view service records" requires appointment link
      // But Pattern 3 services are walk-in only (no appointments), so we bypass RLS
      const adminClient = createAdminClient();

      const { data: medRecords, error: medError } = await adminClient
        .from('medical_records')
        .select('patient_id')
        .eq('created_by_id', user.id);

      if (medError) {
        console.error('[HEALTHCARE ADMIN PATIENTS] Error fetching medical records:', medError);
        return NextResponse.json(
          { error: 'Failed to fetch patients' },
          { status: 500 }
        );
      }

      patientIds = [...new Set(medRecords?.map(m => m.patient_id) || [])];
      console.log(`[HEALTHCARE ADMIN PATIENTS] Found ${patientIds.length} unique patients from medical records`);
    } else {
      // Pattern 4: Walk-in seminars/events (e.g., Health Education Seminar)
      // Track attendance via appointments (same as Pattern 1, but walk-in registration)
      // Only show patients who have completed the seminar/event
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('patient_id')
        .eq('service_id', profile.assigned_service_id)
        .eq('status', 'completed'); // Only completed seminars count as attendance

      if (apptError) {
        console.error('[HEALTHCARE ADMIN PATIENTS] Error fetching appointments:', apptError);
        return NextResponse.json(
          { error: 'Failed to fetch patients' },
          { status: 500 }
        );
      }

      patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];
      console.log(`[HEALTHCARE ADMIN PATIENTS] Found ${patientIds.length} unique patients from completed seminars/events`);
    }

    // If no patients found, return empty result
    if (patientIds.length === 0) {
      console.log('[HEALTHCARE ADMIN PATIENTS] No patients found for this service');
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
      });
    }

    // Convert patient_ids to user_ids
    const { data: patientRecords, error: patientRecordsError } = await supabase
      .from('patients')
      .select('id, user_id, patient_number')
      .in('id', patientIds);

    if (patientRecordsError) {
      console.error('[HEALTHCARE ADMIN PATIENTS] Error fetching patient records:', patientRecordsError);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    const userIds = patientRecords?.map(p => p.user_id) || [];
    console.log(`[HEALTHCARE ADMIN PATIENTS] Converted ${patientIds.length} patient_ids to ${userIds.length} user_ids`);

    // Build query for profiles
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        status,
        contact_number,
        date_of_birth,
        gender,
        emergency_contact,
        created_at,
        approved_at,
        approved_by,
        rejection_reason,
        barangay_id,
        barangays (
          id,
          name,
          code
        ),
        patients (
          patient_number,
          allergies,
          medical_history,
          current_medications
        )
      `, { count: 'exact' })
      .in('id', userIds)
      .eq('role', 'patient');

    // Apply status filter
    if (statusFilter) {
      query = query.eq('status', statusFilter);
      console.log(`[HEALTHCARE ADMIN PATIENTS] Filtering by status: ${statusFilter}`);
    }

    // Apply barangay filter
    if (barangayId) {
      query = query.eq('barangay_id', parseInt(barangayId));
      console.log(`[HEALTHCARE ADMIN PATIENTS] Filtering by barangay_id: ${barangayId}`);
    }

    // Apply search filter
    if (search) {
      // Search by email, first_name, last_name, or patient_number
      const { data: matchingPatients } = await supabase
        .from('patients')
        .select('user_id, patient_number')
        .ilike('patient_number', `%${search}%`);

      const patientNumberUserIds = matchingPatients?.map(p => p.user_id) || [];

      if (patientNumberUserIds.length > 0) {
        // Search matches patient_number OR name/email
        query = query.or(
          `id.in.(${patientNumberUserIds.join(',')}),email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
        );
      } else {
        // Search only name/email
        query = query.or(
          `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
        );
      }
      console.log(`[HEALTHCARE ADMIN PATIENTS] Filtering by search: ${search}`);
    }

    // Get total count
    const { count: totalCount } = await query;

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: patients, error: fetchError } = await query;

    if (fetchError) {
      console.error('[HEALTHCARE ADMIN PATIENTS] Error fetching patient details:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((totalCount || 0) / limit);

    console.log('[HEALTHCARE ADMIN PATIENTS] Query successful:', {
      total_patients: totalCount,
      returned_count: patients?.length || 0,
      page,
      totalPages,
    });

    return NextResponse.json({
      success: true,
      data: patients || [],
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
    console.error('[HEALTHCARE ADMIN PATIENTS] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
