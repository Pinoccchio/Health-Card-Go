import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/dashboard/stats
 *
 * Returns aggregate counts for the Super Admin dashboard.
 * Uses HEAD-only count queries (no row data transferred).
 * Accessible by Super Admin only.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Super Admin can access this resource' },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    // Today's date in Asia/Manila timezone
    const todayPH = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    // 30 days ago for "active" disease cases
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Run all count queries in parallel
    const [
      patientsTotal,
      patientsActive,
      patientsSuspended,
      hcAdminsTotal,
      hcAdminsAssigned,
      staffTotal,
      appointmentsTotal,
      appointmentsToday,
      appointmentsScheduled,
      appointmentsCompleted,
      feedbackTotal,
      feedbackPending,
      barangaysTotal,
      servicesTotal,
      servicesActive,
      diseaseStatsAll,
      diseaseStatsRecent,
    ] = await Promise.all([
      adminClient.from('patients').select('*', { count: 'exact', head: true }),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient').eq('status', 'active'),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient').eq('status', 'suspended'),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'healthcare_admin'),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'healthcare_admin').not('assigned_service_id', 'is', null),
      adminClient.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'staff'),
      adminClient.from('appointments').select('*', { count: 'exact', head: true }),
      adminClient.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', todayPH),
      adminClient.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
      adminClient.from('appointments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      adminClient.from('feedback').select('*', { count: 'exact', head: true }),
      adminClient.from('feedback').select('*', { count: 'exact', head: true }).is('admin_response', null),
      adminClient.from('barangays').select('*', { count: 'exact', head: true }),
      adminClient.from('services').select('*', { count: 'exact', head: true }),
      adminClient.from('services').select('*', { count: 'exact', head: true }).eq('is_active', true),
      adminClient.from('disease_statistics').select('case_count'),
      adminClient.from('disease_statistics').select('case_count').gte('record_date', thirtyDaysAgoStr),
    ]);

    // Sum case_count for disease statistics
    const diseaseTotalCount = (diseaseStatsAll.data || []).reduce(
      (sum: number, row: { case_count: number }) => sum + (row.case_count || 0),
      0
    );
    const diseaseActiveCount = (diseaseStatsRecent.data || []).reduce(
      (sum: number, row: { case_count: number }) => sum + (row.case_count || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        patients: {
          total: patientsTotal.count ?? 0,
          active: patientsActive.count ?? 0,
          suspended: patientsSuspended.count ?? 0,
        },
        healthcareAdmins: {
          total: hcAdminsTotal.count ?? 0,
          assigned: hcAdminsAssigned.count ?? 0,
        },
        staff: {
          total: staffTotal.count ?? 0,
        },
        appointments: {
          total: appointmentsTotal.count ?? 0,
          today: appointmentsToday.count ?? 0,
          scheduled: appointmentsScheduled.count ?? 0,
          completed: appointmentsCompleted.count ?? 0,
        },
        feedback: {
          total: feedbackTotal.count ?? 0,
          pending: feedbackPending.count ?? 0,
        },
        barangays: {
          total: barangaysTotal.count ?? 0,
        },
        services: {
          total: servicesTotal.count ?? 0,
          active: servicesActive.count ?? 0,
        },
        diseases: {
          total: diseaseTotalCount,
          active: diseaseActiveCount,
        },
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/dashboard/stats:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
