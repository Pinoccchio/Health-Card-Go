import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/appointments/cleanup-drafts
 * Cleanup expired draft appointments
 *
 * This endpoint can be called:
 * 1. Manually by admins
 * 2. Periodically by a cron job
 * 3. When a patient views their appointments
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let cleanupResult;

    if (profile.role === 'patient') {
      // For patients, only cleanup their own drafts
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!patient) {
        return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
      }

      // Call patient-specific cleanup function
      const { data, error } = await supabase
        .rpc('cleanup_patient_draft_appointments', {
          p_patient_id: patient.id
        });

      if (error) {
        console.error('Error cleaning up patient drafts:', error);
        return NextResponse.json(
          { error: 'Failed to cleanup drafts', details: error.message },
          { status: 500 }
        );
      }

      cleanupResult = {
        cancelled_count: data?.[0]?.cancelled_count || 0,
        scope: 'patient'
      };
    } else if (profile.role === 'super_admin' || profile.role === 'healthcare_admin') {
      // For admins, cleanup all expired drafts
      const { error } = await supabase.rpc('cleanup_old_draft_appointments');

      if (error) {
        console.error('Error cleaning up all drafts:', error);
        return NextResponse.json(
          { error: 'Failed to cleanup drafts', details: error.message },
          { status: 500 }
        );
      }

      // Get count of cancelled drafts for reporting
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .like('cancellation_reason', '%Draft expired%')
        .gte('updated_at', new Date(Date.now() - 60000).toISOString()); // Last minute

      cleanupResult = {
        cancelled_count: count || 0,
        scope: 'all'
      };
    } else {
      return NextResponse.json(
        { error: 'Unauthorized to perform cleanup' },
        { status: 403 }
      );
    }

    console.log(`✅ [DRAFT CLEANUP] Cancelled ${cleanupResult.cancelled_count} expired draft appointments (scope: ${cleanupResult.scope})`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned up ${cleanupResult.cancelled_count} expired draft appointments`,
      data: cleanupResult
    });

  } catch (error) {
    console.error('Draft cleanup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}