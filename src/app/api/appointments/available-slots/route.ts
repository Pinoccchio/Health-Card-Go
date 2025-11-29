import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/appointments/available-slots
 * Check available time slots for a specific date and service
 *
 * Query params:
 * - date: YYYY-MM-DD (required)
 * - service_id: number (optional, for capacity checking)
 *
 * Returns: Available time slots with capacity information
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

    // Validate date format and that it's a weekday
    const appointmentDate = new Date(date);
    const dayOfWeek = appointmentDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Appointments are only available Monday through Friday',
        slots: [],
      });
    }

    // Check 7-day advance requirement
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);

    const daysDifference = Math.ceil((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference < 7) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: 'Appointments must be booked at least 7 days in advance',
        slots: [],
      });
    }

    // Get total appointments for this date
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select('appointment_time, status')
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'checked_in', 'in_progress']);

    if (fetchError) {
      console.error('Error fetching appointments:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    // Generate all possible time slots (8 AM - 5 PM, 30-minute intervals)
    const timeSlots = [];
    for (let hour = 8; hour < 17; hour++) {
      timeSlots.push(`${String(hour).padStart(2, '0')}:00:00`);
      timeSlots.push(`${String(hour).padStart(2, '0')}:30:00`);
    }

    // Count appointments per time slot
    const slotCounts = new Map<string, number>();
    appointments?.forEach((apt) => {
      const count = slotCounts.get(apt.appointment_time) || 0;
      slotCounts.set(apt.appointment_time, count + 1);
    });

    // Calculate available slots (max 100 total per day, distributed across time slots)
    const totalAppointments = appointments?.length || 0;
    const dailyCapacity = 100;
    const slotsPerTimeSlot = Math.floor(dailyCapacity / timeSlots.length);

    const availableSlots = timeSlots.map((time) => {
      const booked = slotCounts.get(time) || 0;
      const available = slotsPerTimeSlot - booked;

      return {
        time,
        available: available > 0,
        capacity: slotsPerTimeSlot,
        booked,
        remaining: Math.max(0, available),
      };
    });

    // Filter to only show available slots if needed
    const onlyAvailable = searchParams.get('only_available') === 'true';
    const resultSlots = onlyAvailable
      ? availableSlots.filter((slot) => slot.available)
      : availableSlots;

    return NextResponse.json({
      success: true,
      available: totalAppointments < dailyCapacity,
      date,
      total_capacity: dailyCapacity,
      total_booked: totalAppointments,
      total_remaining: Math.max(0, dailyCapacity - totalAppointments),
      slots: resultSlots,
    });

  } catch (error) {
    console.error('Available slots error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
