import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getPhilippineTime, isValidBookingDate, isWeekday } from '@/lib/utils/timezone';
import {
  TimeBlock,
  TimeBlockInfo,
  TIME_BLOCKS,
  AM_CAPACITY,
  PM_CAPACITY,
  DAILY_CAPACITY,
  type AvailableSlotsResponse,
} from '@/types/appointment';

/**
 * GET /api/appointments/available-slots
 * Check available time blocks (AM/PM) for a specific date
 *
 * Query params:
 * - date: YYYY-MM-DD (required)
 * - service_id: number (optional, for capacity checking)
 *
 * Returns: Available time blocks with capacity information
 * - AM Block: 8:00 AM - 12:00 PM (50 max)
 * - PM Block: 1:00 PM - 5:00 PM (50 max)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const serviceId = searchParams.get('service_id');

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Validate that it's a weekday (using Philippine timezone)
    if (!isWeekday(date)) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Appointments are only available Monday through Friday',
        slots: [],
      });
    }

    // Check 7-day advance requirement (using Philippine timezone)
    if (!isValidBookingDate(date)) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Appointments must be booked at least 7 days in advance',
        slots: [],
      });
    }

    // Get total appointments for this date (grouped by time_block)
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select('time_block, status')
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'checked_in', 'in_progress']);

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    // Count appointments per time block
    const blockCounts = {
      AM: 0,
      PM: 0,
    };

    appointments?.forEach((apt) => {
      if (apt.time_block === 'AM') {
        blockCounts.AM++;
      } else if (apt.time_block === 'PM') {
        blockCounts.PM++;
      }
    });

    // Calculate total appointments
    const totalAppointments = blockCounts.AM + blockCounts.PM;

    // Build time block availability
    const blocks: TimeBlockInfo[] = [
      {
        block: 'AM' as TimeBlock,
        label: TIME_BLOCKS.AM.label,
        timeRange: TIME_BLOCKS.AM.timeRange,
        capacity: AM_CAPACITY,
        booked: blockCounts.AM,
        remaining: AM_CAPACITY - blockCounts.AM,
        available: blockCounts.AM < AM_CAPACITY,
      },
      {
        block: 'PM' as TimeBlock,
        label: TIME_BLOCKS.PM.label,
        timeRange: TIME_BLOCKS.PM.timeRange,
        capacity: PM_CAPACITY,
        booked: blockCounts.PM,
        remaining: PM_CAPACITY - blockCounts.PM,
        available: blockCounts.PM < PM_CAPACITY,
      },
    ];

    // Filter to only show available blocks if needed
    const onlyAvailable = searchParams.get('only_available') === 'true';
    const resultBlocks = onlyAvailable
      ? blocks.filter((block) => block.available)
      : blocks;

    const response: AvailableSlotsResponse = {
      success: true,
      available: totalAppointments < DAILY_CAPACITY,
      date,
      total_capacity: DAILY_CAPACITY,
      total_booked: totalAppointments,
      total_remaining: Math.max(0, DAILY_CAPACITY - totalAppointments),
      blocks: resultBlocks,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Available slots error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
