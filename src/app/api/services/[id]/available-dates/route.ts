import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isWeekday, isHoliday } from '@/lib/utils/timezone';

/**
 * GET /api/services/[id]/available-dates
 * Fetch available (unblocked) dates for a service within a date range.
 *
 * Query params:
 * - start_date: YYYY-MM-DD (required)
 * - end_date: YYYY-MM-DD (required)
 *
 * Access:
 * - Healthcare Admin: Only their assigned service
 * - Super Admin: All services (view-only)
 * - Patients: All services (for booking)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Await params to get id
    const { id } = await params;
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { error: 'Invalid service ID', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Validate date formats
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: 'Dates must be in YYYY-MM-DD format', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Fetch available dates with admin profile info
    const { data: availableDates, error: fetchError } = await supabase
      .from('service_available_dates')
      .select(`
        id,
        available_date,
        reason,
        created_at,
        opened_by,
        profiles:opened_by (
          first_name,
          last_name
        )
      `)
      .eq('service_id', serviceId)
      .gte('available_date', startDate)
      .lte('available_date', endDate)
      .order('available_date', { ascending: true });

    if (fetchError) {
      console.error('Error fetching available dates:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch available dates' },
        { status: 500 }
      );
    }

    // Format response
    const formattedDates = (availableDates || []).map(item => ({
      date: item.available_date,
      opened_by: item.profiles
        ? `${(item.profiles as any).first_name} ${(item.profiles as any).last_name}`
        : 'Unknown',
      reason: item.reason,
    }));

    return NextResponse.json({
      success: true,
      service_id: serviceId,
      available_dates: formattedDates,
      total_count: formattedDates.length,
    });

  } catch (error) {
    console.error('Available dates fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services/[id]/available-dates
 * Open (unblock) a date for booking.
 *
 * Request body:
 * - date: YYYY-MM-DD (required)
 * - reason: string (optional)
 *
 * Access:
 * - Healthcare Admin: Only their assigned service
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Await params to get id
    const { id } = await params;
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { error: 'Invalid service ID', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Verify user is Healthcare Admin with this assigned service
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profile.role !== 'healthcare_admin') {
      return NextResponse.json(
        { error: 'Only Healthcare Admins can manage service availability', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (profile.assigned_service_id !== serviceId) {
      return NextResponse.json(
        { error: 'You can only manage dates for your assigned service', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { date, reason, dates } = body;

    // Handle bulk dates
    if (dates && Array.isArray(dates)) {
      return handleBulkOpen(supabase, serviceId, user.id, dates, reason);
    }

    // Single date validation
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Date must be in YYYY-MM-DD format', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Check if date is a weekday
    if (!isWeekday(date)) {
      return NextResponse.json(
        { error: 'Only weekdays (Monday-Friday) can be opened for booking', code: 'WEEKEND' },
        { status: 400 }
      );
    }

    // Check if date is a holiday
    const adminClient = createAdminClient();
    const { data: holidays } = await adminClient
      .from('holidays')
      .select('holiday_date, holiday_name');

    if (holidays && isHoliday(date, holidays)) {
      const holiday = holidays.find(h => h.holiday_date === date);
      return NextResponse.json(
        {
          error: `Cannot open ${date} - it is a holiday (${holiday?.holiday_name || 'Holiday'})`,
          code: 'HOLIDAY'
        },
        { status: 400 }
      );
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date + 'T00:00:00');
    if (targetDate < today) {
      return NextResponse.json(
        { error: 'Cannot open dates in the past', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Insert the available date
    const { data: newEntry, error: insertError } = await supabase
      .from('service_available_dates')
      .insert({
        service_id: serviceId,
        available_date: date,
        opened_by: user.id,
        reason: reason || null,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique constraint violation - date already exists
        return NextResponse.json(
          { error: 'This date is already open for booking', code: 'ALREADY_EXISTS' },
          { status: 409 }
        );
      }
      console.error('Error inserting available date:', insertError);
      return NextResponse.json(
        { error: 'Failed to open date' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Date ${date} is now open for booking`,
      data: newEntry,
    });

  } catch (error) {
    console.error('Open date error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/[id]/available-dates
 * Block a date (remove from available dates).
 *
 * Query params:
 * - date: YYYY-MM-DD (required)
 *
 * Access:
 * - Healthcare Admin: Only their assigned service
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Await params to get id
    const { id } = await params;
    const serviceId = parseInt(id);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { error: 'Invalid service ID', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Verify user is Healthcare Admin with this assigned service
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (profile.role !== 'healthcare_admin') {
      return NextResponse.json(
        { error: 'Only Healthcare Admins can manage service availability', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    if (profile.assigned_service_id !== serviceId) {
      return NextResponse.json(
        { error: 'You can only manage dates for your assigned service', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date query parameter is required', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Date must be in YYYY-MM-DD format', code: 'INVALID_DATE' },
        { status: 400 }
      );
    }

    // Delete the available date entry (this blocks the date)
    const { error: deleteError, count } = await supabase
      .from('service_available_dates')
      .delete()
      .eq('service_id', serviceId)
      .eq('available_date', date);

    if (deleteError) {
      console.error('Error deleting available date:', deleteError);
      return NextResponse.json(
        { error: 'Failed to block date' },
        { status: 500 }
      );
    }

    if (count === 0) {
      return NextResponse.json(
        { error: 'Date was not open (already blocked)', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Date ${date} is now blocked for new bookings`,
    });

  } catch (error) {
    console.error('Block date error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Handle bulk opening of dates
 */
async function handleBulkOpen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  serviceId: number,
  userId: string,
  dates: string[],
  reason?: string
) {
  const adminClient = createAdminClient();

  // Get holidays for validation
  const { data: holidays } = await adminClient
    .from('holidays')
    .select('holiday_date, holiday_name');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = {
    opened: [] as string[],
    skipped: [] as { date: string; reason: string }[],
    failed: [] as { date: string; error: string }[],
  };

  for (const date of dates) {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      results.skipped.push({ date, reason: 'Invalid date format' });
      continue;
    }

    // Check if weekday
    if (!isWeekday(date)) {
      results.skipped.push({ date, reason: 'Weekend' });
      continue;
    }

    // Check if holiday
    if (holidays && isHoliday(date, holidays)) {
      const holiday = holidays.find(h => h.holiday_date === date);
      results.skipped.push({ date, reason: `Holiday: ${holiday?.holiday_name}` });
      continue;
    }

    // Check if past date
    const targetDate = new Date(date + 'T00:00:00');
    if (targetDate < today) {
      results.skipped.push({ date, reason: 'Past date' });
      continue;
    }

    // Try to insert
    const { error: insertError } = await supabase
      .from('service_available_dates')
      .insert({
        service_id: serviceId,
        available_date: date,
        opened_by: userId,
        reason: reason || null,
      });

    if (insertError) {
      if (insertError.code === '23505') {
        results.skipped.push({ date, reason: 'Already open' });
      } else {
        results.failed.push({ date, error: insertError.message });
      }
    } else {
      results.opened.push(date);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Bulk operation complete: ${results.opened.length} dates opened`,
    results,
  });
}
