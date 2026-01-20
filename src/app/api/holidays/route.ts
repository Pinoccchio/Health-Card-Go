import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/holidays
 * Fetch all holidays for calendar blocking
 * Public endpoint - accessible to all authenticated users
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all holidays, ordered by date
    const { data: holidays, error } = await supabase
      .from('holidays')
      .select('*')
      .order('holiday_date', { ascending: true });

    if (error) {
      console.error('[GET /api/holidays] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch holidays', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ holidays: holidays || [] });
  } catch (error) {
    console.error('[GET /api/holidays] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/holidays
 * Create a new holiday
 * Restricted to super admins only
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Super admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { holiday_date, holiday_name, is_recurring = false } = body;

    // Validate required fields
    if (!holiday_date || !holiday_name) {
      return NextResponse.json(
        { error: 'holiday_date and holiday_name are required' },
        { status: 400 }
      );
    }

    // Insert holiday
    const { data: holiday, error: insertError } = await supabase
      .from('holidays')
      .insert({
        holiday_date,
        holiday_name,
        is_recurring,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/holidays] Insert error:', insertError);

      // Check for duplicate date
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'A holiday already exists for this date' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create holiday', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ holiday }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/holidays] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/holidays
 * Delete a holiday by ID
 * Restricted to super admins only
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is super admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Super admin access required' },
        { status: 403 }
      );
    }

    // Get holiday ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Holiday ID is required' },
        { status: 400 }
      );
    }

    // Delete holiday
    const { error: deleteError } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/holidays] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete holiday', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/holidays] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
