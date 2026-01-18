import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/healthcards/statistics/[id]
 * Update a healthcard statistics record
 * Only Staff and Super Admin can update
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Verify authentication
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

  try {
    // 2. Check user role
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

    // 3. Verify permission (Staff and Super Admin only)
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Staff and Super Admins can update healthcard statistics',
        },
        { status: 403 }
      );
    }

    // 4. Parse and validate request body
    const body = await request.json();
    const {
      healthcard_type,
      record_date,
      cards_issued,
      barangay_id,
      source,
      notes,
    } = body;

    // 5. Validate required fields
    if (!healthcard_type || !record_date || cards_issued === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: healthcard_type, record_date, cards_issued',
        },
        { status: 400 }
      );
    }

    // 6. Validate enum values
    const validTypes = ['food_handler', 'non_food'];
    if (!validTypes.includes(healthcard_type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid healthcard_type. Must be "food_handler" or "non_food"',
        },
        { status: 400 }
      );
    }

    // 7. Validate cards_issued is positive
    if (!Number.isInteger(cards_issued) || cards_issued <= 0) {
      return NextResponse.json(
        { success: false, error: 'cards_issued must be a positive integer' },
        { status: 400 }
      );
    }

    // 8. Validate date is not in the future
    const recordDate = new Date(record_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (recordDate > today) {
      return NextResponse.json(
        { success: false, error: 'record_date cannot be in the future' },
        { status: 400 }
      );
    }

    // 9. Build update object
    const updateData: any = {
      healthcard_type,
      record_date,
      cards_issued,
      barangay_id: barangay_id || null,
      source: source || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    // 10. Perform update
    const { data: updated, error: updateError } = await supabase
      .from('healthcard_statistics')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        barangays (
          id,
          name
        ),
        profiles:created_by_id (
          first_name,
          last_name
        )
      `
      )
      .single();

    if (updateError) {
      console.error('Error updating healthcard statistic:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'HealthCard record updated successfully',
    });
  } catch (error: any) {
    console.error('Error in PUT /api/healthcards/statistics/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/healthcards/statistics/[id]
 * Delete a healthcard statistics record
 * Only Staff and Super Admin can delete
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // 1. Verify authentication
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

  try {
    // 2. Check user role
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

    // 3. Verify permission (Staff and Super Admin only)
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Forbidden: Only Staff and Super Admins can delete healthcard statistics',
        },
        { status: 403 }
      );
    }

    // 4. Check if record exists before deleting
    const { data: existingRecord, error: fetchError } = await supabase
      .from('healthcard_statistics')
      .select('id, record_date, cards_issued, healthcard_type')
      .eq('id', id)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // 5. Perform delete
    const { error: deleteError } = await supabase
      .from('healthcard_statistics')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting healthcard statistic:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'HealthCard record deleted successfully',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/healthcards/statistics/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
