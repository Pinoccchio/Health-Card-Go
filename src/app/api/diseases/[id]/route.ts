import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/[id]
 * Fetch a single disease case record
 * (Staff and Super Admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

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

    // Only Staff and Super Admin can view disease cases
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can view disease cases' },
        { status: 403 }
      );
    }

    const { data: disease, error } = await supabase
      .from('diseases')
      .select(`
        *,
        barangays(id, name, code),
        patients(
          id,
          patient_number,
          profiles(
            id,
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching disease case:', error);
      return NextResponse.json(
        { success: false, error: 'Disease case not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: disease,
    });

  } catch (error: any) {
    console.error('Error in GET disease case API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/diseases/[id]
 * Update a disease case record (severity, status, and notes only)
 * (Staff and Super Admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

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

    // Only Staff and Super Admin can update disease cases
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can update disease cases' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { severity, status, notes } = body;

    // Validate enum values if provided
    const validSeverities = ['mild', 'moderate', 'severe', 'critical'];
    const validStatuses = ['active', 'recovered', 'deceased', 'under_treatment'];

    if (severity && !validSeverities.includes(severity)) {
      return NextResponse.json(
        { success: false, error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      );
    }

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update object (only update provided fields)
    const updateData: any = {};
    if (severity !== undefined) updateData.severity = severity;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes || null;

    // Update only allowed fields
    const { data: disease, error: updateError } = await supabase
      .from('diseases')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating disease case:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update disease case', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: disease,
      message: 'Disease case updated successfully',
    });

  } catch (error: any) {
    console.error('Error in PUT disease case API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/diseases/[id]
 * Delete a disease case record
 * (Staff and Super Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

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

    // Only Staff and Super Admin can delete disease cases
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can delete disease cases' },
        { status: 403 }
      );
    }

    // Delete the record
    const { error: deleteError } = await supabase
      .from('diseases')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting disease case:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete disease case', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Disease case deleted successfully',
    });

  } catch (error: any) {
    console.error('Error in DELETE disease case API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
