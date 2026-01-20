import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/lab-fees
 * Fetch active lab fees for all card types
 *
 * Access: Public (authenticated users)
 * Returns: Array of active lab fees
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated (but any role can access)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch active lab fees with individual test fees (RLS policy allows all authenticated users to read active fees)
    const { data: fees, error: feesError } = await supabase
      .from('lab_fees')
      .select('id, card_type, test_fee, card_fee, total_fee, stool_exam_fee, urinalysis_fee, cbc_fee, smearing_fee, xray_fee, updated_at')
      .eq('is_active', true)
      .order('card_type', { ascending: true });

    if (feesError) {
      console.error('[API] Error fetching lab fees:', feesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch lab fees' },
        { status: 500 }
      );
    }

    // Transform to user-friendly format with individual test fees
    const feesMap: Record<string, any> = {};
    fees?.forEach((fee) => {
      feesMap[fee.card_type] = {
        test_fee: fee.test_fee,
        card_fee: fee.card_fee,
        total_fee: fee.total_fee,
        stool_exam_fee: fee.stool_exam_fee,
        urinalysis_fee: fee.urinalysis_fee,
        cbc_fee: fee.cbc_fee,
        smearing_fee: fee.smearing_fee,
        xray_fee: fee.xray_fee,
        updated_at: fee.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: feesMap,
    });
  } catch (error) {
    console.error('[API] Unexpected error in GET /api/lab-fees:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
