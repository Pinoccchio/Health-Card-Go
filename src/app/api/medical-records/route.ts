import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/medical-records
 * Check if medical records exist for an appointment
 * Used to determine if completed appointments can be reverted
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const appointmentId = searchParams.get('appointment_id');

    // Validate appointment_id parameter
    if (!appointmentId) {
      return NextResponse.json(
        { error: 'appointment_id query parameter is required' },
        { status: 400 }
      );
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query medical records for the appointment
    const { data, error } = await supabase
      .from('medical_records')
      .select('id')
      .eq('appointment_id', appointmentId)
      .limit(1);

    if (error) {
      console.error('Medical records query error:', error);
      return NextResponse.json(
        { error: 'Failed to check medical records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      has_records: (data?.length || 0) > 0,
    });

  } catch (error) {
    console.error('Medical records check error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
