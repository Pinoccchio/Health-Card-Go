import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases
 * Fetch disease records with optional filtering
 */
export async function GET(request: NextRequest) {
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
    const searchParams = request.nextUrl.searchParams;
    const diseaseType = searchParams.get('type');
    const barangayId = searchParams.get('barangay_id');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = supabase
      .from('diseases')
      .select(`
        *,
        barangays(id, name),
        patients(id, user_id, profiles(first_name, last_name))
      `)
      .order('diagnosis_date', { ascending: false });

    // Apply filters
    if (diseaseType) {
      query = query.eq('disease_type', diseaseType);
    }
    if (barangayId) {
      query = query.eq('barangay_id', parseInt(barangayId));
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('diagnosis_date', startDate);
    }
    if (endDate) {
      query = query.lte('diagnosis_date', endDate);
    }

    const { data: diseases, error } = await query;

    if (error) {
      console.error('Error fetching diseases:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch diseases' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: diseases,
      count: diseases?.length || 0,
    });

  } catch (error: any) {
    console.error('Error in diseases API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
