import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/diseases/reset-all
 * Reset all disease surveillance data for testing purposes
 * Clears: diseases, disease_statistics, disease_predictions, outbreak_alerts
 *
 * DOES NOT DELETE: healthcard_statistics, healthcard_predictions
 * (Health card data is managed separately from disease surveillance)
 *
 * Authorization: Staff and Super Admin only
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get user profile and check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only Staff and Super Admin can reset disease data
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can reset disease surveillance data' },
        { status: 403 }
      );
    }

    // Get request body for confirmation
    const body = await request.json().catch(() => ({}));
    const { confirmationToken } = body;

    // Verify confirmation token (simple check - should be: "RESET_ALL_DATA")
    if (confirmationToken !== 'RESET_ALL_DATA') {
      return NextResponse.json(
        { success: false, error: 'Invalid confirmation token' },
        { status: 400 }
      );
    }

    // Execute all deletions in sequence (ONLY disease surveillance data)
    const deletionSummary: Record<string, number> = {
      diseases: 0,
      disease_statistics: 0,
      disease_predictions: 0,
      outbreak_alerts: 0,
    };

    // Delete outbreak_alerts first (has FK to diseases in some setups)
    const outbreakResult = await supabase
      .from('outbreak_alerts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (outbreakResult.error) {
      console.error('[Reset All] Error deleting outbreak_alerts:', outbreakResult.error);
    }

    // Delete disease_predictions
    const predResult = await supabase
      .from('disease_predictions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (predResult.error) {
      console.error('[Reset All] Error deleting disease_predictions:', predResult.error);
    }

    // Delete disease_statistics
    const statsResult = await supabase
      .from('disease_statistics')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (statsResult.error) {
      console.error('[Reset All] Error deleting disease_statistics:', statsResult.error);
    }

    // Delete diseases
    const diseaseResult = await supabase
      .from('diseases')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (diseaseResult.error) {
      console.error('[Reset All] Error deleting diseases:', diseaseResult.error);
    }

    console.log('[Reset All] All disease surveillance data cleared successfully');
    console.log('[Reset All] Health card data (Yellow/Green/Pink) preserved');

    return NextResponse.json({
      success: true,
      message: 'All disease surveillance data has been reset successfully',
      deletedTables: Object.keys(deletionSummary),
    });

  } catch (error: any) {
    console.error('[Reset All] Error in POST reset-all disease data API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
