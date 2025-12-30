/**
 * HealthCard Statistics API
 *
 * GET /api/healthcards/statistics
 *
 * Aggregates completed healthcard appointments into statistics for SARIMA analysis.
 * Derives healthcard type from service IDs (12-15).
 *
 * Query Parameters:
 * - healthcard_type: 'food_handler' | 'non_food' (optional)
 * - barangay_id: number (optional)
 * - start_date: YYYY-MM-DD (optional, default: 30 days ago)
 * - end_date: YYYY-MM-DD (optional, default: today)
 * - service_id: number (optional, for healthcare admin filtering)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  HealthCardStatistic,
  HealthCardStatisticsResponse,
  HealthCardType,
} from '@/types/healthcard';
import {
  getHealthCardType,
  isValidHealthCardType,
  generateSARIMADateRange,
} from '@/lib/utils/healthcardHelpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const healthcardTypeParam = searchParams.get('healthcard_type');
    const barangayId = searchParams.get('barangay_id');
    const serviceId = searchParams.get('service_id');
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');

    // Validate healthcard type if provided
    let healthcardType: HealthCardType | null = null;
    if (healthcardTypeParam) {
      if (!isValidHealthCardType(healthcardTypeParam)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid healthcard_type. Must be 'food_handler' or 'non_food'`,
          },
          { status: 400 }
        );
      }
      healthcardType = healthcardTypeParam;
    }

    // Generate default date range if not provided
    const dateRange = generateSARIMADateRange(30, 0); // 30 days back, no forecast
    const startDate = startDateParam || dateRange.start_date;
    const endDate = endDateParam || dateRange.today;

    console.log('[HealthCard Statistics API] Query params:', {
      healthcardType,
      barangayId,
      serviceId,
      startDate,
      endDate,
      userId: user.id,
    });

    // Build query
    let query = supabase
      .from('appointments')
      .select(
        `
        id,
        completed_at,
        service_id,
        patient_id,
        patients!inner(
          user_id,
          profiles!inner(
            barangay_id,
            barangays(
              id,
              name,
              code
            )
          )
        )
      `
      )
      .eq('status', 'completed')
      .in('service_id', [12, 13, 14, 15]) // Health card services only
      .not('completed_at', 'is', null)
      .gte('completed_at', `${startDate}T00:00:00`)
      .lte('completed_at', `${endDate}T23:59:59`);

    // Apply filters
    if (healthcardType) {
      const serviceIds =
        healthcardType === 'food_handler' ? [12, 13] : [14, 15];
      query = query.in('service_id', serviceIds);
    }

    if (serviceId) {
      query = query.eq('service_id', parseInt(serviceId));
    }

    // Execute query
    const { data: appointments, error: queryError } = await query;

    if (queryError) {
      console.error('[HealthCard Statistics API] Query error:', queryError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch statistics' },
        { status: 500 }
      );
    }

    console.log('[HealthCard Statistics API] Found appointments:', appointments?.length || 0);

    // Aggregate by date, type, and barangay
    const statisticsMap = new Map<string, HealthCardStatistic>();

    appointments?.forEach((appointment: any) => {
      const completedDate = new Date(appointment.completed_at)
        .toISOString()
        .split('T')[0];
      const type = getHealthCardType(appointment.service_id);
      const barangay = appointment.patients?.profiles?.barangays;
      const barangayIdValue = appointment.patients?.profiles?.barangay_id;

      if (!type) return; // Skip if not a healthcard service

      // Apply barangay filter if specified
      if (barangayId && barangayIdValue !== parseInt(barangayId)) {
        return;
      }

      // Create unique key for grouping
      const key = `${completedDate}-${type}-${barangayIdValue || 'null'}`;

      if (statisticsMap.has(key)) {
        const existing = statisticsMap.get(key)!;
        existing.card_count += 1;
      } else {
        statisticsMap.set(key, {
          id: key,
          healthcard_type: type,
          barangay_id: barangayIdValue || null,
          issue_date: completedDate,
          card_count: 1,
          created_at: new Date().toISOString(),
          barangay: barangay
            ? {
                id: barangay.id,
                name: barangay.name,
                code: barangay.code,
              }
            : undefined,
        });
      }
    });

    // Convert map to array and sort by date
    const statistics = Array.from(statisticsMap.values()).sort(
      (a, b) =>
        new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime()
    );

    console.log('[HealthCard Statistics API] Aggregated statistics:', statistics.length);

    // Build response
    const response: HealthCardStatisticsResponse = {
      success: true,
      data: statistics,
      total: statistics.reduce((sum, stat) => sum + stat.card_count, 0),
      filters: {
        healthcard_type: healthcardType || undefined,
        barangay_id: barangayId ? parseInt(barangayId) : undefined,
        start_date: startDate,
        end_date: endDate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[HealthCard Statistics API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
