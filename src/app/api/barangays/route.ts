import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/barangays
 * Fetch all barangays for dropdown filters and selection lists
 * Public endpoint - used across multiple pages
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all barangays, ordered by name
    const { data: barangays, error: fetchError } = await supabase
      .from('barangays')
      .select('id, name, code')
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('Error fetching barangays:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch barangays' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: barangays || [],
    });

  } catch (error) {
    console.error('Barangays fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
