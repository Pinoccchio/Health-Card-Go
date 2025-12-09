import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/services/[id]
 * Get a single service by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Await params to get id
    const { id } = await params;

    // Validate ID is a number
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid service ID' },
        { status: 400 }
      );
    }

    // Fetch service
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (fetchError) {
      console.error('Error fetching service:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: service,
    });

  } catch (error) {
    console.error('Service fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
