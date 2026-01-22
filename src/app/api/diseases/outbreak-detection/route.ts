import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/outbreak-detection
 * Detect disease outbreaks based on configurable thresholds
 * Auto-creates notifications for Super Admins when outbreaks detected
 *
 * OPTIMIZED VERSION - Eliminates synthetic record generation, parallelizes queries
 */

interface OutbreakThreshold {
  disease_type: string;
  cases_threshold: number;
  days_window: number;
  description: string;
}

// Configurable outbreak thresholds
const OUTBREAK_THRESHOLDS: OutbreakThreshold[] = [
  { disease_type: 'dengue', cases_threshold: 5, days_window: 14, description: '5+ cases in 14 days' },
  { disease_type: 'dengue', cases_threshold: 5, days_window: 3, description: '5+ cases in 3 days (rapid spike)' },
  { disease_type: 'hiv_aids', cases_threshold: 3, days_window: 30, description: '3+ new cases in 30 days' },
  { disease_type: 'malaria', cases_threshold: 3, days_window: 14, description: '3+ cases in 14 days' },
  { disease_type: 'measles', cases_threshold: 3, days_window: 14, description: '3+ cases in 14 days (highly contagious)' },
  { disease_type: 'animal_bite', cases_threshold: 1, days_window: 7, description: 'Any animal bite/rabies case (immediate alert)' },
  { disease_type: 'pregnancy_complications', cases_threshold: 5, days_window: 30, description: '5+ complications in 30 days' },
  { disease_type: 'other', cases_threshold: 3, days_window: 14, description: '3+ cases in 14 days (custom disease)' },
];

// Simple in-memory cache to prevent repeated expensive queries
// Cache key format: "diseaseType:barangayId" or "all:all"
const outbreakCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCacheKey(diseaseType: string | null, barangayId: string | null): string {
  return `${diseaseType || 'all'}:${barangayId || 'all'}`;
}

function getCachedData(cacheKey: string) {
  const cached = outbreakCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[Outbreak Detection] 💾 Cache HIT for ${cacheKey} (age: ${Math.round((Date.now() - cached.timestamp) / 1000)}s)`);
    return cached.data;
  }
  if (cached) {
    console.log(`[Outbreak Detection] ⌛ Cache EXPIRED for ${cacheKey}`);
    outbreakCache.delete(cacheKey);
  }
  return null;
}

function setCachedData(cacheKey: string, data: any) {
  outbreakCache.set(cacheKey, { data, timestamp: Date.now() });
  console.log(`[Outbreak Detection] 💾 Cached data for ${cacheKey}`);

  // Clean up old cache entries (keep max 50 entries)
  if (outbreakCache.size > 50) {
    const oldestKey = Array.from(outbreakCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    outbreakCache.delete(oldestKey);
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Use admin client for outbreak detection (system-level feature, bypasses RLS)
  // This ensures consistent outbreak detection regardless of user permissions
  const adminClient = createAdminClient();

  console.log('[Outbreak Detection] Starting OPTIMIZED outbreak detection scan...');
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const autoNotify = searchParams.get('auto_notify') === 'true';
    const diseaseTypeFilter = searchParams.get('disease_type');
    const barangayIdFilter = searchParams.get('barangay_id');

    console.log('[Outbreak Detection] Filters:', { diseaseTypeFilter, barangayIdFilter });

    // Check cache first
    const cacheKey = getCacheKey(diseaseTypeFilter, barangayIdFilter);
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // OPTIMIZATION 1: Determine the largest time window needed (30 days for HIV/Pregnancy)
    const maxDaysWindow = Math.max(...OUTBREAK_THRESHOLDS.map(t => t.days_window));
    const oldestStartDate = new Date();
    oldestStartDate.setDate(oldestStartDate.getDate() - maxDaysWindow);
    const oldestStartDateStr = oldestStartDate.toISOString().split('T')[0];

    console.log(`[Outbreak Detection] Fetching data for last ${maxDaysWindow} days (${oldestStartDateStr} to present)`);

    // OPTIMIZATION 2: Fetch ALL data in parallel (3 queries instead of 16)
    const [diseasesResult, statisticsResult, barangaysResult] = await Promise.all([
      // Query 1: Real-time patient cases
      adminClient
        .from('diseases')
        .select('id, barangay_id, diagnosis_date, severity, disease_type, custom_disease_name, status')
        .eq('status', 'active')
        .gte('diagnosis_date', oldestStartDateStr)
        .limit(500),

      // Query 2: Historical statistics
      adminClient
        .from('disease_statistics')
        .select('barangay_id, record_date, case_count, severity, disease_type, custom_disease_name')
        .gte('record_date', oldestStartDateStr)
        .order('record_date', { ascending: false })
        .limit(500),

      // Query 3: Barangay names (cache for joins)
      adminClient
        .from('barangays')
        .select('id, name')
    ]);

    const allDiseases = diseasesResult.data || [];
    const allStatistics = statisticsResult.data || [];
    const barangays = barangaysResult.data || [];

    // Create barangay lookup map for O(1) access
    const barangayMap = new Map<number, string>();
    barangays.forEach(b => barangayMap.set(b.id, b.name));

    console.log(`[Outbreak Detection] Fetched ${allDiseases.length} patient cases, ${allStatistics.length} statistics, ${barangays.length} barangays in parallel`);

    const queryTime = Date.now() - startTime;
    console.log(`[Outbreak Detection] ⚡ Database queries completed in ${queryTime}ms`);

    const outbreaks: any[] = [];
    let totalThresholdsChecked = 0;

    // OPTIMIZATION 3: Pre-aggregate statistics by disease_type, barangay_id
    // This eliminates the need for synthetic record generation
    const statisticsAggregated = new Map<string, Map<number, { total_cases: number, critical_cases: number, severe_cases: number, moderate_cases: number, dates: string[] }>>();

    allStatistics.forEach(stat => {
      if (!statisticsAggregated.has(stat.disease_type)) {
        statisticsAggregated.set(stat.disease_type, new Map());
      }
      const diseaseMap = statisticsAggregated.get(stat.disease_type)!;

      const barangayKey = stat.barangay_id;
      if (!diseaseMap.has(barangayKey)) {
        diseaseMap.set(barangayKey, { total_cases: 0, critical_cases: 0, severe_cases: 0, moderate_cases: 0, dates: [] });
      }

      const barangayData = diseaseMap.get(barangayKey)!;
      barangayData.total_cases += stat.case_count;
      barangayData.dates.push(stat.record_date);

      // Distribute cases by severity (assume even distribution if not specified)
      if (stat.severity === 'critical') {
        barangayData.critical_cases += stat.case_count;
      } else if (stat.severity === 'severe') {
        barangayData.severe_cases += stat.case_count;
      } else if (stat.severity === 'moderate') {
        barangayData.moderate_cases += stat.case_count;
      } else {
        // If severity not specified, assume moderate
        barangayData.moderate_cases += stat.case_count;
      }
    });

    console.log(`[Outbreak Detection] Pre-aggregated ${allStatistics.length} statistics into ${Array.from(statisticsAggregated.values()).reduce((sum, map) => sum + map.size, 0)} barangay groups`);

    // Process each threshold (now using in-memory filtering instead of DB queries)
    for (const threshold of OUTBREAK_THRESHOLDS) {
      // Apply disease type filter
      if (diseaseTypeFilter && threshold.disease_type !== diseaseTypeFilter) {
        continue;
      }

      totalThresholdsChecked++;
      const thresholdStartDate = new Date();
      thresholdStartDate.setDate(thresholdStartDate.getDate() - threshold.days_window);
      const thresholdStartDateStr = thresholdStartDate.toISOString().split('T')[0];

      console.log(`[Outbreak Detection] Checking ${threshold.disease_type}: ${threshold.cases_threshold}+ cases in ${threshold.days_window} days`);

      // Filter diseases by date range and disease type
      const matchingDiseases = allDiseases.filter(d =>
        d.disease_type === threshold.disease_type &&
        d.diagnosis_date >= thresholdStartDateStr &&
        (!barangayIdFilter || d.barangay_id === parseInt(barangayIdFilter))
      );

      // Get aggregated statistics for this disease type
      const diseaseStats = statisticsAggregated.get(threshold.disease_type) || new Map();

      // Group patient cases by barangay
      const barangayGroups = new Map<number, any[]>();
      matchingDiseases.forEach(disease => {
        if (!barangayGroups.has(disease.barangay_id)) {
          barangayGroups.set(disease.barangay_id, []);
        }
        barangayGroups.get(disease.barangay_id)!.push(disease);
      });

      // Merge with aggregated statistics
      diseaseStats.forEach((stats, barangayId) => {
        // Apply barangay filter
        if (barangayIdFilter && barangayId !== parseInt(barangayIdFilter)) {
          return;
        }

        // Filter statistics by date range
        const validDates = stats.dates.filter(d => d >= thresholdStartDateStr);
        if (validDates.length === 0) {
          return; // No cases in time window
        }

        // Add to barangay groups (or create new group)
        if (!barangayGroups.has(barangayId)) {
          barangayGroups.set(barangayId, []);
        }

        // Add metadata for statistics (not individual cases)
        const existingGroup = barangayGroups.get(barangayId)!;
        existingGroup.push({
          _isAggregated: true,
          barangay_id: barangayId,
          total_cases: stats.total_cases,
          critical_cases: stats.critical_cases,
          severe_cases: stats.severe_cases,
          moderate_cases: stats.moderate_cases,
          dates: validDates,
        });
      });

      // Check each barangay group
      for (const [barangayId, cases] of barangayGroups.entries()) {
        // Calculate total case count
        const aggregatedCase = cases.find(c => c._isAggregated);
        const patientCaseCount = cases.filter(c => !c._isAggregated).length;
        const statisticsCaseCount = aggregatedCase ? aggregatedCase.total_cases : 0;
        const totalCases = patientCaseCount + statisticsCaseCount;

        // Check threshold
        if (totalCases < threshold.cases_threshold) {
          continue; // Not an outbreak
        }

        // Calculate severity counts
        const criticalCases = cases.filter(c => !c._isAggregated && c.severity === 'critical').length + (aggregatedCase?.critical_cases || 0);
        const severeCases = cases.filter(c => !c._isAggregated && c.severity === 'severe').length + (aggregatedCase?.severe_cases || 0);
        const moderateCases = cases.filter(c => !c._isAggregated && c.severity === 'moderate').length + (aggregatedCase?.moderate_cases || 0);

        // Get barangay name
        const barangayName = barangayMap.get(barangayId) || 'Unknown';

        // Get date range
        const patientDates = cases.filter(c => !c._isAggregated).map(c => c.diagnosis_date);
        const statDates = aggregatedCase ? aggregatedCase.dates : [];
        const allDates = [...patientDates, ...statDates].sort();
        const firstDate = allDates[0] || thresholdStartDateStr;
        const latestDate = allDates[allDates.length - 1] || new Date().toISOString().split('T')[0];

        // Determine risk level
        const riskLevel = criticalCases >= 3 ? 'critical' :
                         severeCases >= 5 ? 'high' :
                         totalCases >= threshold.cases_threshold * 1.5 ? 'high' : 'medium';

        const outbreak = {
          disease_type: threshold.disease_type,
          custom_disease_name: threshold.disease_type === 'other' ? (cases[0]?.custom_disease_name || null) : null,
          barangay_id: barangayId,
          barangay_name: barangayName,
          case_count: totalCases,
          critical_cases: criticalCases,
          severe_cases: severeCases,
          moderate_cases: moderateCases,
          days_window: threshold.days_window,
          threshold: threshold.cases_threshold,
          threshold_description: threshold.description,
          risk_level: riskLevel,
          first_case_date: firstDate,
          latest_case_date: latestDate,
        };

        console.log(`[Outbreak Detection] 🚨 OUTBREAK: ${threshold.disease_type} in ${barangayName} - ${totalCases} cases (${criticalCases} critical, ${severeCases} severe, ${moderateCases} moderate) - Risk: ${riskLevel.toUpperCase()}`);
        outbreaks.push(outbreak);

        // Auto-create notification for Super Admins if enabled
        if (autoNotify) {
          await createOutbreakNotification(adminClient, outbreak);
        }
      }
    }

    // Sort outbreaks by risk level and case count
    outbreaks.sort((a, b) => {
      const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const riskDiff = riskOrder[a.risk_level as keyof typeof riskOrder] - riskOrder[b.risk_level as keyof typeof riskOrder];
      if (riskDiff !== 0) return riskDiff;
      return b.case_count - a.case_count;
    });

    const executionTime = Date.now() - startTime;
    console.log(`[Outbreak Detection] ✅ Scan complete in ${executionTime}ms: ${outbreaks.length} outbreaks detected (checked ${totalThresholdsChecked} thresholds)`);

    const response = {
      success: true,
      data: outbreaks,
      metadata: {
        total_outbreaks: outbreaks.length,
        critical_outbreaks: outbreaks.filter(o => o.risk_level === 'critical').length,
        high_risk_outbreaks: outbreaks.filter(o => o.risk_level === 'high').length,
        medium_risk_outbreaks: outbreaks.filter(o => o.risk_level === 'medium').length,
        auto_notify_enabled: autoNotify,
        checked_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        thresholds_checked: totalThresholdsChecked,
      },
    };

    // Cache the result
    setCachedData(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Outbreak Detection] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect outbreaks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Create outbreak notification for Super Admins
 */
async function createOutbreakNotification(adminClient: any, outbreak: any) {
  try {
    // Fetch Super Admin user IDs
    const { data: superAdmins, error: fetchError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')
      .eq('status', 'active');

    if (fetchError) {
      console.error('[Outbreak Notification] Error fetching Super Admins:', fetchError);
      return;
    }

    if (!superAdmins || superAdmins.length === 0) {
      console.log('[Outbreak Notification] No active Super Admins found');
      return;
    }

    // Create notifications for each Super Admin
    const notifications = superAdmins.map(admin => ({
      user_id: admin.id,
      type: 'outbreak_alert',
      title: `${outbreak.risk_level.toUpperCase()} Outbreak Alert: ${outbreak.disease_type}`,
      message: `${outbreak.case_count} cases detected in ${outbreak.barangay_name} (${outbreak.threshold_description})`,
      data: {
        outbreak_id: `${outbreak.disease_type}_${outbreak.barangay_id}_${Date.now()}`,
        disease_type: outbreak.disease_type,
        barangay_id: outbreak.barangay_id,
        barangay_name: outbreak.barangay_name,
        case_count: outbreak.case_count,
        risk_level: outbreak.risk_level,
      },
      read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await adminClient
      .from('notifications')
      .insert(notifications);

    if (insertError) {
      console.error('[Outbreak Notification] Error creating notifications:', insertError);
    } else {
      console.log(`[Outbreak Notification] ✅ Created ${notifications.length} outbreak notifications`);
    }
  } catch (error) {
    console.error('[Outbreak Notification] Unexpected error:', error);
  }
}
