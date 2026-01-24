import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/barangays
 * Fetch all barangays for dropdown filters and selection lists
 * Public endpoint - no authentication required (used in registration page)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all barangays, initially ordered by name
    const { data: barangays, error: fetchError } = await supabase
      .from('barangays')
      .select('id, name, code, population, coordinates')
      .order('name', { ascending: true });

    if (fetchError) {
      console.error('Error fetching barangays:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch barangays' },
        { status: 500 }
      );
    }

    // Custom ordering: A.O. Floirendo first, Outside Zone last, rest alphabetical
    const orderedBarangays = barangays?.sort((a, b) => {
      // A.O. Floirendo always first
      if (a.name === 'A.O. Floirendo') return -1;
      if (b.name === 'A.O. Floirendo') return 1;

      // Outside Zone always last
      if (a.name === 'Outside Zone') return 1;
      if (b.name === 'Outside Zone') return -1;

      // Rest: alphabetical order
      return a.name.localeCompare(b.name);
    }) || [];

    return NextResponse.json({
      success: true,
      data: orderedBarangays,
      count: orderedBarangays.length,
    });

  } catch (error) {
    console.error('Barangays fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
