import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/healthcare-admin/reports/diseases
 *
 * Fetch disease case statistics for healthcare admin's assigned service
 *
 * Access: Pattern 2 & 3 only (requires_medical_record = true)
 *
 * Query Parameters:
 * - start_date: YYYY-MM-DD (required)
 * - end_date: YYYY-MM-DD (required)
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

    console.log('[HEALTHCARE ADMIN REPORTS - DISEASES] User authenticated:', {
      user_id: user.id,
      email: user.email,
      role: profile.role,
      assigned_service_id: profile.assigned_service_id,
      service_name: service?.name,
      requires_medical_record: service?.requires_medical_record,
    });

    // Check if service requires medical records (Pattern 2 & 3)
    if (!service?.requires_medical_record) {
      console.log('[HEALTHCARE ADMIN REPORTS - DISEASES] Service does not have medical record access:', service?.name);
      return NextResponse.json(
        { error: 'Your assigned service does not have access to medical records. This report is only for services that manage patient diagnoses.' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const barangayId = searchParams.get('barangay_id');

    console.log('[HEALTHCARE ADMIN REPORTS - DISEASES] Query parameters:', {
      start_date: startDate,
      end_date: endDate,
      barangay_id: barangayId,
      user_id: user.id,
    });

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // Validate date format (basic check)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Get medical records created by this healthcare admin
    // Disease cases are linked to medical records, so we need to find diseases
    // that were diagnosed through this admin's medical records
    //
    // IMPORTANT: We use the admin client here to bypass RLS policies.
    // This is safe because we've already verified the user's role and service assignment above.
    // RLS policies on medical_records may filter by service_id, but healthcare admins
    // should see ALL medical records they created, regardless of the linked appointment's service.
    const adminClient = createAdminClient();

    let medRecordsQuery = adminClient
      .from('medical_records')
      .select('id, patient_id, diagnosis, created_at')
      .eq('created_by_id', user.id)
      .gte('created_at', startDate)
      .lte('created_at', `${endDate}T23:59:59`);

    const { data: medicalRecords, error: medRecordsError } = await medRecordsQuery;

    if (medRecordsError) {
      console.error('[HEALTHCARE ADMIN REPORTS - DISEASES] Error fetching medical records:', medRecordsError);
      return NextResponse.json(
        { error: 'Failed to fetch disease statistics' },
        { status: 500 }
      );
    }

    console.log('[HEALTHCARE ADMIN REPORTS - DISEASES] Medical records fetched:', {
      records_found: medicalRecords?.length || 0,
      date_range: `${startDate} to ${endDate}T23:59:59`,
    });

    // If no medical records, return empty statistics
    if (!medicalRecords || medicalRecords.length === 0) {
      console.log('[HEALTHCARE ADMIN REPORTS - DISEASES] No medical records found, returning empty statistics');
      return NextResponse.json({
        success: true,
        data: {
          service: {
            id: service.id,
            name: service.name,
          },
          summary: {
            total_cases: 0,
            unique_patients: 0,
          },
          disease_breakdown: [],
          severity_breakdown: [],
          trend_data: [],
          filters_applied: {
            start_date: startDate,
            end_date: endDate,
            barangay_id: barangayId || null,
          },
        },
      });
    }

    const medRecordIds = medicalRecords.map(mr => mr.id);

    // Fetch diseases linked to these medical records
    // Note: Diseases inherit date range from medical records (already filtered by created_at above)
    // Using admin client to bypass RLS (same reasoning as medical_records query above)
    let diseasesQuery = adminClient
      .from('diseases')
      .select(`
        id,
        disease_type,
        custom_disease_name,
        diagnosis_date,
        severity,
        status,
        patient_id,
        barangay_id,
        medical_record_id
      `)
      .in('medical_record_id', medRecordIds);

    // Add barangay filter if provided
    if (barangayId) {
      diseasesQuery = diseasesQuery.eq('barangay_id', parseInt(barangayId));
    }

    const { data: diseases, error: diseasesError } = await diseasesQuery;

    if (diseasesError) {
      console.error('[HEALTHCARE ADMIN REPORTS - DISEASES] Error fetching diseases:', diseasesError);
      return NextResponse.json(
        { error: 'Failed to fetch disease statistics' },
        { status: 500 }
      );
    }

    console.log('[HEALTHCARE ADMIN REPORTS - DISEASES] Diseases fetched:', {
      diseases_found: diseases?.length || 0,
      medical_record_ids_searched: medRecordIds.length,
      barangay_filter_applied: barangayId ? 'yes' : 'no',
    });

    // Calculate summary statistics
    const uniquePatients = new Set(diseases?.map(d => d.patient_id) || []);
    const summaryStats = {
      total_cases: diseases?.length || 0,
      unique_patients: uniquePatients.size,
    };

    // Calculate disease type breakdown for bar chart
    // Use custom disease names when available (disease_type='other')
    const diseaseMap: Map<string, number> = new Map();

    diseases?.forEach(disease => {
      // Use custom_disease_name if available (for "other" type), otherwise use disease_type
      const displayName = disease.disease_type === 'other' && disease.custom_disease_name
        ? disease.custom_disease_name
        : disease.disease_type || 'Unknown';

      diseaseMap.set(displayName, (diseaseMap.get(displayName) || 0) + 1);
    });

    // Convert map to array and sort by count descending
    const diseaseBreakdown = Array.from(diseaseMap.entries())
      .map(([type, count]) => ({
        disease_type: type,  // Will be custom name for "other" types
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate severity breakdown
    const severityMap: { [key: string]: number } = {};
    diseases?.forEach(disease => {
      const severity = disease.severity || 'Unknown';
      severityMap[severity] = (severityMap[severity] || 0) + 1;
    });

    const severityBreakdown = Object.entries(severityMap)
      .map(([severity, count]) => ({
        severity,
        count,
      }))
      .sort((a, b) => {
        // Sort by severity level: critical, high, moderate, low, unknown
        const order = ['critical', 'high', 'moderate', 'low', 'unknown'];
        return order.indexOf(a.severity.toLowerCase()) - order.indexOf(b.severity.toLowerCase());
      });

    // Calculate daily trend for line chart
    const dailyTrend: { [key: string]: number } = {};
    diseases?.forEach(disease => {
      const date = disease.diagnosis_date;
      dailyTrend[date] = (dailyTrend[date] || 0) + 1;
    });

    const trendData = Object.entries(dailyTrend)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // DEBUG: Log what we're about to send
    console.log('[DISEASES API DEBUG] ==================== START ====================');
    console.log('[DISEASES API DEBUG] Date range:', startDate, 'to', endDate);
    console.log('[DISEASES API DEBUG] Medical records found:', medicalRecords?.length || 0);
    console.log('[DISEASES API DEBUG] Diseases found:', diseases?.length || 0);
    console.log('[DISEASES API DEBUG] Disease breakdown count:', diseaseBreakdown.length);
    console.log('[DISEASES API DEBUG] Disease breakdown:', JSON.stringify(diseaseBreakdown, null, 2));
    console.log('[DISEASES API DEBUG] Summary stats:', JSON.stringify(summaryStats, null, 2));
    console.log('[DISEASES API DEBUG] ==================== END ====================');

    console.log('[HEALTHCARE ADMIN REPORTS - DISEASES] Sending response:', {
      summary_stats: summaryStats,
      disease_types: diseaseBreakdown.length,
      trend_data_points: trendData.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        service: {
          id: service.id,
          name: service.name,
        },
        summary: summaryStats,
        disease_breakdown: diseaseBreakdown,
        severity_breakdown: severityBreakdown,
        trend_data: trendData,
        filters_applied: {
          start_date: startDate,
          end_date: endDate,
          barangay_id: barangayId || null,
        },
      },
    });

  } catch (error) {
    console.error('[HEALTHCARE ADMIN REPORTS] Unexpected error in GET /api/healthcare-admin/reports/diseases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
