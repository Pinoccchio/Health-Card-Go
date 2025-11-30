import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/appointments/analytics
 * Comprehensive appointment analytics for dashboards and insights
 * Supports: completion rates, no-show patterns, popular services, peak times
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const doctorId = searchParams.get('doctor_id');
    const serviceId = searchParams.get('service_id');

    // Default to last 30 days if no date range specified
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const defaultStartDateStr = defaultStartDate.toISOString().split('T')[0];

    const finalStartDate = startDate || defaultStartDateStr;
    const finalEndDate = endDate || defaultEndDate;

    // Build base query
    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        created_at,
        checked_in_at,
        completed_at,
        cancelled_at,
        doctor_id,
        service_id,
        services(name, category)
      `)
      .gte('appointment_date', finalStartDate)
      .lte('appointment_date', finalEndDate);

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }
    if (serviceId) {
      query = query.eq('service_id', parseInt(serviceId));
    }

    const { data: appointments, error } = await query;

    if (error) {
      throw error;
    }

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: {
            total_appointments: 0,
            completed: 0,
            cancelled: 0,
            no_show: 0,
            scheduled: 0,
            completion_rate: 0,
            no_show_rate: 0,
            cancellation_rate: 0,
          },
          by_status: {},
          by_service: [],
          by_day_of_week: [],
          by_hour: [],
          trends: [],
        },
        metadata: {
          start_date: finalStartDate,
          end_date: finalEndDate,
          doctor_id: doctorId,
          service_id: serviceId,
        },
      });
    }

    // Calculate summary statistics
    const statusCounts = {
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      no_show: appointments.filter(a => a.status === 'no_show').length,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      checked_in: appointments.filter(a => a.status === 'checked_in').length,
      in_progress: appointments.filter(a => a.status === 'in_progress').length,
      pending: appointments.filter(a => a.status === 'pending').length,
    };

    const total = appointments.length;
    const completionRate = total > 0 ? (statusCounts.completed / total) * 100 : 0;
    const noShowRate = total > 0 ? (statusCounts.no_show / total) * 100 : 0;
    const cancellationRate = total > 0 ? (statusCounts.cancelled / total) * 100 : 0;

    // Group by service
    const serviceGroups: Record<string, any> = {};
    appointments.forEach(apt => {
      const serviceKey = apt.service_id?.toString() || 'unknown';
      if (!serviceGroups[serviceKey]) {
        serviceGroups[serviceKey] = {
          service_id: apt.service_id,
          service_name: apt.services?.name || 'Unknown',
          service_category: apt.services?.category || 'general',
          total: 0,
          completed: 0,
          no_show: 0,
          cancelled: 0,
        };
      }
      serviceGroups[serviceKey].total++;
      if (apt.status === 'completed') serviceGroups[serviceKey].completed++;
      if (apt.status === 'no_show') serviceGroups[serviceKey].no_show++;
      if (apt.status === 'cancelled') serviceGroups[serviceKey].cancelled++;
    });

    const byService = Object.values(serviceGroups)
      .sort((a: any, b: any) => b.total - a.total)
      .map((s: any) => ({
        ...s,
        completion_rate: s.total > 0 ? (s.completed / s.total) * 100 : 0,
        no_show_rate: s.total > 0 ? (s.no_show / s.total) * 100 : 0,
      }));

    // Group by day of week
    const dayOfWeekGroups: Record<string, number> = {
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0,
      'Sunday': 0,
    };

    appointments.forEach(apt => {
      const date = new Date(apt.appointment_date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      dayOfWeekGroups[dayName]++;
    });

    const byDayOfWeek = Object.entries(dayOfWeekGroups).map(([day, count]) => ({
      day,
      count,
    }));

    // Group by hour of day
    const hourGroups: Record<number, number> = {};
    appointments.forEach(apt => {
      if (apt.appointment_time) {
        const hour = parseInt(apt.appointment_time.split(':')[0]);
        hourGroups[hour] = (hourGroups[hour] || 0) + 1;
      }
    });

    const byHour = Object.entries(hourGroups)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        hour_label: `${hour}:00`,
        count,
      }))
      .sort((a, b) => a.hour - b.hour);

    // Group by date for trends (daily counts)
    const dateGroups: Record<string, any> = {};
    appointments.forEach(apt => {
      const date = apt.appointment_date;
      if (!dateGroups[date]) {
        dateGroups[date] = {
          date,
          total: 0,
          completed: 0,
          no_show: 0,
          cancelled: 0,
        };
      }
      dateGroups[date].total++;
      if (apt.status === 'completed') dateGroups[date].completed++;
      if (apt.status === 'no_show') dateGroups[date].no_show++;
      if (apt.status === 'cancelled') dateGroups[date].cancelled++;
    });

    const trends = Object.values(dateGroups).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    // Calculate average wait times (for completed appointments)
    const completedApts = appointments.filter(a => a.status === 'completed' && a.checked_in_at && a.completed_at);
    let avgWaitTimeMinutes = 0;

    if (completedApts.length > 0) {
      const totalWaitTime = completedApts.reduce((sum, apt) => {
        const checkIn = new Date(apt.checked_in_at!).getTime();
        const completed = new Date(apt.completed_at!).getTime();
        return sum + (completed - checkIn);
      }, 0);
      avgWaitTimeMinutes = Math.round(totalWaitTime / completedApts.length / 1000 / 60);
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_appointments: total,
          completed: statusCounts.completed,
          cancelled: statusCounts.cancelled,
          no_show: statusCounts.no_show,
          scheduled: statusCounts.scheduled,
          checked_in: statusCounts.checked_in,
          in_progress: statusCounts.in_progress,
          pending: statusCounts.pending,
          completion_rate: Math.round(completionRate * 100) / 100,
          no_show_rate: Math.round(noShowRate * 100) / 100,
          cancellation_rate: Math.round(cancellationRate * 100) / 100,
          avg_wait_time_minutes: avgWaitTimeMinutes,
        },
        by_status: statusCounts,
        by_service: byService,
        by_day_of_week: byDayOfWeek,
        by_hour: byHour,
        trends,
      },
      metadata: {
        start_date: finalStartDate,
        end_date: finalEndDate,
        doctor_id: doctorId,
        service_id: serviceId,
        days_in_range: Math.ceil((new Date(finalEndDate).getTime() - new Date(finalStartDate).getTime()) / (1000 * 60 * 60 * 24)),
      },
    });

  } catch (error: any) {
    console.error('Error in analytics API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
