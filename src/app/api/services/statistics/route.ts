/**
 * Service Appointment Statistics API
 *
 * GET /api/services/statistics?service_id=16&barangay_id=1&start_date=2024-01-01&end_date=2024-12-31
 *
 * Fetches filtered records from service_appointment_statistics with joins to barangays and profiles.
 *
 * Query Parameters:
 * - service_id (required): number
 * - barangay_id: number (optional)
 * - start_date: YYYY-MM-DD (optional)
 * - end_date: YYYY-MM-DD (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user role - must be healthcare_admin (hiv) or super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, admin_category')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    const isSuperAdmin = profile.role === 'super_admin';
    const isAllowedAdmin = profile.role === 'healthcare_admin' &&
      ['hiv', 'pregnancy'].includes(profile.admin_category);

    if (!isAllowedAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only authorized Healthcare Admins and Super Admins can access this endpoint' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const serviceIdParam = searchParams.get('service_id');
    const barangayId = searchParams.get('barangay_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!serviceIdParam) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: service_id' },
        { status: 400 }
      );
    }

    const serviceId = parseInt(serviceIdParam);
    const adminClient = createAdminClient();

    // Build query
    let query = adminClient
      .from('service_appointment_statistics')
      .select(`
        id,
        service_id,
        record_date,
        appointments_completed,
        barangay_id,
        source,
        notes,
        created_by_id,
        created_at,
        barangays (
          id,
          name,
          code
        ),
        profiles:created_by_id (
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq('service_id', serviceId)
      .order('record_date', { ascending: false });

    // Apply optional filters
    if (barangayId && barangayId !== 'all') {
      query = query.eq('barangay_id', parseInt(barangayId));
    }
    if (startDate) {
      query = query.gte('record_date', startDate);
    }
    if (endDate) {
      query = query.lte('record_date', endDate);
    }

    const { data: records, error: queryError } = await query;

    if (queryError) {
      console.error('[Service Statistics API] Query error:', queryError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        records: records || [],
      },
    });
  } catch (error) {
    console.error('[Service Statistics API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
