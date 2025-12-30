import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);

  // Log incoming request
  console.log(`[${requestId}] 💬 Admin Reports - Feedback API Request:`, {
    endpoint: '/api/admin/reports/feedback',
    params: Object.fromEntries(request.nextUrl.searchParams),
    timestamp: new Date().toISOString(),
  });

  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log(`[${requestId}] ❌ Authentication failed:`, authError?.message || 'No user');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] ✅ User authenticated:`, user.id);

    // Verify Super Admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      console.log(`[${requestId}] ❌ Authorization failed:`, {
        role: profile?.role,
        error: profileError?.message,
      });
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      );
    }

    console.log(`[${requestId}] ✅ Super Admin authorized`);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const serviceId = searchParams.get('service_id');
    const minRating = searchParams.get('min_rating');

    // Build query for feedback
    let query = supabase
      .from('feedback')
      .select(`
        id,
        rating,
        facility_rating,
        wait_time_rating,
        would_recommend,
        comments,
        admin_response,
        responded_at,
        created_at,
        patient_id,
        patients (
          patient_number,
          profiles:user_id (
            first_name,
            last_name
          )
        ),
        appointment_id,
        appointments (
          appointment_date,
          service_id,
          services (
            id,
            name,
            category
          )
        ),
        responded_by_profile:responded_by (
          first_name,
          last_name
        )
      `);

    // Execute query
    const { data: feedbackData, error: queryError } = await query.order('created_at', { ascending: false });

    if (queryError) {
      console.error('Error fetching feedback:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch feedback data' },
        { status: 500 }
      );
    }

    // Apply filters
    let filteredFeedback = feedbackData || [];

    if (startDate || endDate || serviceId || minRating) {
      filteredFeedback = filteredFeedback.filter((fb: any) => {
        const createdDate = fb.created_at?.split('T')[0];

        // Date filter
        if (startDate && createdDate < startDate) return false;
        if (endDate && createdDate > endDate) return false;

        // Service filter
        if (serviceId && fb.appointments?.service_id !== parseInt(serviceId)) return false;

        // Rating filter
        if (minRating && fb.rating < parseInt(minRating)) return false;

        return true;
      });
    }

    // Calculate summary statistics
    const totalFeedback = filteredFeedback.length;
    const avgRating = totalFeedback > 0
      ? (filteredFeedback.reduce((sum: number, fb: any) => sum + (fb.rating || 0), 0) / totalFeedback).toFixed(1)
      : '0.0';
    const avgFacilityRating = totalFeedback > 0
      ? (filteredFeedback.reduce((sum: number, fb: any) => sum + (fb.facility_rating || 0), 0) / totalFeedback).toFixed(1)
      : '0.0';
    const avgWaitTimeRating = totalFeedback > 0
      ? (filteredFeedback.reduce((sum: number, fb: any) => sum + (fb.wait_time_rating || 0), 0) / totalFeedback).toFixed(1)
      : '0.0';
    const recommendCount = filteredFeedback.filter((fb: any) => fb.would_recommend).length;
    const recommendRate = totalFeedback > 0
      ? ((recommendCount / totalFeedback) * 100).toFixed(1)
      : '0.0';

    const summary = {
      total: totalFeedback,
      average_rating: avgRating,
      average_facility_rating: avgFacilityRating,
      average_wait_time_rating: avgWaitTimeRating,
      would_recommend_count: recommendCount,
      would_recommend_rate: recommendRate,
      responded_count: filteredFeedback.filter((fb: any) => fb.admin_response).length,
    };

    // Rating distribution (1-5 stars)
    const ratingDistribution = [1, 2, 3, 4, 5].map(star => ({
      rating: star,
      count: filteredFeedback.filter((fb: any) => fb.rating === star).length,
    }));

    // Service breakdown
    const serviceBreakdown = filteredFeedback.reduce((acc: any, fb: any) => {
      const serviceName = fb.appointments?.services?.name || 'Unknown';
      if (!acc[serviceName]) {
        acc[serviceName] = {
          service: serviceName,
          count: 0,
          total_rating: 0,
          recommend_count: 0,
        };
      }
      acc[serviceName].count++;
      acc[serviceName].total_rating += fb.rating || 0;
      if (fb.would_recommend) acc[serviceName].recommend_count++;
      return acc;
    }, {});

    const serviceBreakdownArray = Object.values(serviceBreakdown).map((s: any) => ({
      ...s,
      average_rating: s.count > 0 ? (s.total_rating / s.count).toFixed(1) : '0.0',
    }));

    // Trend data (feedback per day)
    const trendData = filteredFeedback.reduce((acc: any, fb: any) => {
      const date = fb.created_at?.split('T')[0];
      if (!date) return acc;
      if (!acc[date]) {
        acc[date] = { date, count: 0, total_rating: 0 };
      }
      acc[date].count++;
      acc[date].total_rating += fb.rating || 0;
      return acc;
    }, {});

    const trendArray = Object.values(trendData).map((t: any) => ({
      date: t.date,
      count: t.count,
      average_rating: t.count > 0 ? (t.total_rating / t.count).toFixed(1) : '0.0',
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));

    // Transform feedback for table display
    const tableData = filteredFeedback.map((fb: any) => {
      const patient = fb.patients;
      const profile = patient?.profiles;
      const appointment = fb.appointments;
      const service = appointment?.services;

      return {
        id: fb.id,
        created_at: fb.created_at,
        patient_name: profile ? `${profile.first_name} ${profile.last_name}` : 'N/A',
        patient_number: patient?.patient_number || 'N/A',
        service_name: service?.name || 'N/A',
        appointment_date: appointment?.appointment_date || 'N/A',
        rating: fb.rating,
        facility_rating: fb.facility_rating,
        wait_time_rating: fb.wait_time_rating,
        would_recommend: fb.would_recommend,
        comments: fb.comments,
        admin_response: fb.admin_response,
        responded_by_name: fb.responded_by_profile
          ? `${fb.responded_by_profile.first_name} ${fb.responded_by_profile.last_name}`
          : null,
        responded_at: fb.responded_at,
      };
    });

    const duration = Date.now() - startTime;
    const responseData = {
      summary,
      rating_distribution: ratingDistribution,
      service_breakdown: serviceBreakdownArray.sort((a: any, b: any) => b.count - a.count),
      trend_data: trendArray,
      table_data: tableData,
    };

    console.log(`[${requestId}] ✅ Feedback API Success:`, {
      duration: `${duration}ms`,
      records: {
        feedback: filteredFeedback.length,
        ratingDistribution: ratingDistribution.length,
        services: serviceBreakdownArray.length,
        trendPoints: trendArray.length,
        tableRows: tableData.length,
      },
      summary,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Feedback API Error (${duration}ms):`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
