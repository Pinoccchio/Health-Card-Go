import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/historical/[id]
 * Fetch a single historical disease statistics record
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

    // Only Staff and Super Admin can view historical disease statistics
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can view historical disease statistics' },
        { status: 403 }
      );
    }

    const { data: statistic, error } = await supabase
      .from('disease_statistics')
      .select(`
        *,
        barangays(id, name, code),
        created_by:profiles!disease_statistics_created_by_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching historical disease statistic:', error);
      return NextResponse.json(
        { success: false, error: 'Historical disease statistic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: statistic,
    });

  } catch (error: any) {
    console.error('Error in GET historical disease statistic API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/diseases/historical/[id]
 * Update a historical disease statistics record (source and notes only)
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

    // Only Staff and Super Admin can update historical disease statistics
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can update historical disease statistics' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { source, notes } = body;

    // Update only source and notes fields
    const { data: statistic, error: updateError } = await supabase
      .from('disease_statistics')
      .update({
        source: source || null,
        notes: notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating historical disease statistic:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update historical disease statistic', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: statistic,
      message: 'Historical disease statistic updated successfully',
    });

  } catch (error: any) {
    console.error('Error in PUT historical disease statistic API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/diseases/historical/[id]
 * Delete a historical disease statistics record
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

    // Only Staff and Super Admin can delete historical disease statistics
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can delete historical disease statistics' },
        { status: 403 }
      );
    }

    // Delete the record
    const { error: deleteError } = await supabase
      .from('disease_statistics')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting historical disease statistic:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete historical disease statistic', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Historical disease statistic deleted successfully',
    });

  } catch (error: any) {
    console.error('Error in DELETE historical disease statistic API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
