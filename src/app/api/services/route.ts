import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/services
 * Get all available services
 *
 * Query params:
 * - requires_appointment: filter by appointment requirement (true/false)
 * - category: filter by category
 * - is_active: filter by active status (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const requiresAppointment = searchParams.get('requires_appointment');
    const category = searchParams.get('category');
    const isActive = searchParams.get('is_active') !== 'false'; // Default to true

    // Build query
    let query = supabase
      .from('services')
      .select('*')
      .order('id', { ascending: true });

    // Apply filters
    if (isActive) {
      query = query.eq('is_active', true);
    }

    if (requiresAppointment !== null) {
      query = query.eq('requires_appointment', requiresAppointment === 'true');
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: services, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching services:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: services || [],
    });

  } catch (error) {
    console.error('Services fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
