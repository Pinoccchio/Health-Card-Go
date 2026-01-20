import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/lab-fees
 * Fetch all active lab fees (or all fees with history if ?include_history=true)
 *
 * Access: Super Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Check if history should be included
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('include_history') === 'true';

    // Fetch active lab fees
    const { data: fees, error: feesError } = await supabase
      .from('lab_fees')
      .select('*')
      .eq('is_active', true)
      .order('card_type', { ascending: true });

    if (feesError) {
      console.error('[API] Error fetching lab fees:', feesError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch lab fees' },
        { status: 500 }
      );
    }

    // If history requested, fetch it
    let history = null;
    if (includeHistory) {
      const { data: historyData, error: historyError } = await supabase
        .from('lab_fees_history')
        .select(`
          *,
          changed_by_profile:profiles!lab_fees_history_changed_by_fkey(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('changed_at', { ascending: false })
        .limit(100); // Last 100 changes

      if (!historyError) {
        history = historyData;
      }
    }

    return NextResponse.json({
      success: true,
      data: fees,
      history,
    });
  } catch (error) {
    console.error('[API] Unexpected error in GET /api/admin/lab-fees:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/lab-fees
 * Update lab fees for a specific card type
 *
 * Body: { card_type, test_fee?, card_fee, stool_exam_fee?, urinalysis_fee?, cbc_fee?, smearing_fee?, xray_fee?, change_reason? }
 * Access: Super Admin only
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      card_type,
      test_fee,
      card_fee,
      stool_exam_fee,
      urinalysis_fee,
      cbc_fee,
      smearing_fee,
      xray_fee,
      change_reason
    } = body;

    // Validate inputs
    if (!card_type || !['food_handler', 'non_food', 'pink'].includes(card_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid card_type. Must be food_handler, non_food, or pink' },
        { status: 400 }
      );
    }

    if (typeof card_fee !== 'number' || card_fee < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid card_fee. Must be a non-negative number' },
        { status: 400 }
      );
    }

    // Validate individual test fees if provided
    const validateFee = (fee: any, name: string) => {
      if (fee !== undefined && fee !== null && (typeof fee !== 'number' || fee < 0)) {
        return `Invalid ${name}. Must be a non-negative number or null`;
      }
      return null;
    };

    const stoolError = validateFee(stool_exam_fee, 'stool_exam_fee');
    const urinalysisError = validateFee(urinalysis_fee, 'urinalysis_fee');
    const cbcError = validateFee(cbc_fee, 'cbc_fee');
    const smearingError = validateFee(smearing_fee, 'smearing_fee');
    const xrayError = validateFee(xray_fee, 'xray_fee');

    if (stoolError || urinalysisError || cbcError || smearingError || xrayError) {
      return NextResponse.json(
        { success: false, error: stoolError || urinalysisError || cbcError || smearingError || xrayError },
        { status: 400 }
      );
    }

    // Call the database function to update fees (handles deactivation + creation + history)
    // Note: p_updated_by must be second parameter per PostgreSQL function signature
    const { data: newFeeId, error: updateError } = await supabase
      .rpc('update_lab_fee', {
        p_card_type: card_type,
        p_updated_by: user.id,
        p_test_fee: test_fee !== undefined ? test_fee : null,
        p_card_fee: card_fee !== undefined ? card_fee : null,
        p_stool_exam_fee: stool_exam_fee !== undefined ? stool_exam_fee : null,
        p_urinalysis_fee: urinalysis_fee !== undefined ? urinalysis_fee : null,
        p_cbc_fee: cbc_fee !== undefined ? cbc_fee : null,
        p_smearing_fee: smearing_fee !== undefined ? smearing_fee : null,
        p_xray_fee: xray_fee !== undefined ? xray_fee : null,
        p_change_reason: change_reason || null,
      });

    if (updateError) {
      console.error('[API] Error updating lab fee:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message || 'Failed to update lab fee' },
        { status: 500 }
      );
    }

    // Fetch the newly created fee record
    const { data: updatedFee, error: fetchError } = await supabase
      .from('lab_fees')
      .select('*')
      .eq('id', newFeeId)
      .single();

    if (fetchError) {
      console.error('[API] Error fetching updated fee:', fetchError);
      // Still return success since the update worked
      return NextResponse.json({
        success: true,
        message: 'Lab fee updated successfully',
        data: { id: newFeeId },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Lab fee updated successfully',
      data: updatedFee,
    });
  } catch (error) {
    console.error('[API] Unexpected error in PUT /api/admin/lab-fees:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/lab-fees/bulk
 * Bulk update all lab fees at once
 *
 * Body: { fees: [{ card_type, test_fee, card_fee }], change_reason? }
 * Access: Super Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { fees, change_reason } = body;

    if (!Array.isArray(fees) || fees.length === 0) {
      return NextResponse.json(
        { success: false, error: 'fees must be a non-empty array' },
        { status: 400 }
      );
    }

    // Update each fee
    const results = [];
    const errors = [];

    for (const fee of fees) {
      const { card_type, test_fee, card_fee } = fee;

      // Validate
      if (!card_type || !['food_handler', 'non_food', 'pink'].includes(card_type)) {
        errors.push({ card_type, error: 'Invalid card_type' });
        continue;
      }

      if (typeof test_fee !== 'number' || test_fee < 0) {
        errors.push({ card_type, error: 'Invalid test_fee' });
        continue;
      }

      if (typeof card_fee !== 'number' || card_fee < 0) {
        errors.push({ card_type, error: 'Invalid card_fee' });
        continue;
      }

      // Update
      try {
        const { data: newFeeId, error: updateError } = await supabase
          .rpc('update_lab_fee', {
            p_card_type: card_type,
            p_test_fee: test_fee,
            p_card_fee: card_fee,
            p_updated_by: user.id,
            p_change_reason: change_reason || `Bulk update for ${card_type}`,
          });

        if (updateError) {
          errors.push({ card_type, error: updateError.message });
        } else {
          results.push({ card_type, fee_id: newFeeId });
        }
      } catch (err: any) {
        errors.push({ card_type, error: err.message });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `Updated ${results.length} fee(s)${errors.length > 0 ? ` with ${errors.length} error(s)` : ''}`,
      data: { updated: results, errors },
    });
  } catch (error) {
    console.error('[API] Unexpected error in POST /api/admin/lab-fees:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
