// Supabase Edge Function: Compute Outbreak Alerts
// This function runs every 5-10 minutes (scheduled via Supabase cron)
// and pre-computes outbreak alerts, storing them in the outbreak_alerts table

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface OutbreakThreshold {
  disease_type: string;
  cases_threshold: number;
  days_window: number;
  description: string;
}

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

serve(async (req) => {
  try {
    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log('[Outbreak Background Job] Starting outbreak detection...');
    const startTime = Date.now();

    // Fetch all data in parallel
    const maxDaysWindow = Math.max(...OUTBREAK_THRESHOLDS.map(t => t.days_window));
    const oldestStartDate = new Date();
    oldestStartDate.setDate(oldestStartDate.getDate() - maxDaysWindow);
    const oldestStartDateStr = oldestStartDate.toISOString().split('T')[0];

    const [statisticsResult, barangaysResult] = await Promise.all([
      supabase
        .from('disease_statistics')
        .select('barangay_id, record_date, case_count, severity, disease_type, custom_disease_name')
        .gte('record_date', oldestStartDateStr)
        .order('record_date', { ascending: false })
        .limit(500),

      supabase
        .from('barangays')
        .select('id, name')
    ]);

    const allStatistics = statisticsResult.data || [];
    const barangays = barangaysResult.data || [];

    const barangayMap = new Map<number, string>();
    barangays.forEach((b: any) => barangayMap.set(b.id, b.name));

    console.log(`[Outbreak Background Job] Fetched ${allStatistics.length} statistics`);

    // Pre-aggregate statistics
    const statisticsAggregated = new Map<string, Map<number, any>>();

    allStatistics.forEach((stat: any) => {
      if (!statisticsAggregated.has(stat.disease_type)) {
        statisticsAggregated.set(stat.disease_type, new Map());
      }
      const diseaseMap = statisticsAggregated.get(stat.disease_type)!;

      const barangayKey = stat.barangay_id;
      if (!diseaseMap.has(barangayKey)) {
        diseaseMap.set(barangayKey, { total_cases: 0, high_risk_cases: 0, medium_risk_cases: 0, low_risk_cases: 0, dates: [] });
      }

      const barangayData = diseaseMap.get(barangayKey)!;
      barangayData.total_cases += stat.case_count;
      barangayData.dates.push(stat.record_date);

      if (stat.severity === 'high_risk') {
        barangayData.high_risk_cases += stat.case_count;
      } else if (stat.severity === 'medium_risk') {
        barangayData.medium_risk_cases += stat.case_count;
      } else if (stat.severity === 'low_risk') {
        barangayData.low_risk_cases += stat.case_count;
      } else {
        barangayData.low_risk_cases += stat.case_count;
      }
    });

    // Detect outbreaks
    const outbreaks: any[] = [];

    for (const threshold of OUTBREAK_THRESHOLDS) {
      const thresholdStartDate = new Date();
      thresholdStartDate.setDate(thresholdStartDate.getDate() - threshold.days_window);
      const thresholdStartDateStr = thresholdStartDate.toISOString().split('T')[0];

      const diseaseStats = statisticsAggregated.get(threshold.disease_type) || new Map();

      const barangayGroups = new Map<number, any[]>();

      diseaseStats.forEach((stats: any, barangayId: number) => {
        const validDates = stats.dates.filter((d: string) => d >= thresholdStartDateStr);
        if (validDates.length === 0) return;

        if (!barangayGroups.has(barangayId)) {
          barangayGroups.set(barangayId, []);
        }

        const existingGroup = barangayGroups.get(barangayId)!;
        existingGroup.push({
          _isAggregated: true,
          barangay_id: barangayId,
          total_cases: stats.total_cases,
          high_risk_cases: stats.high_risk_cases,
          medium_risk_cases: stats.medium_risk_cases,
          low_risk_cases: stats.low_risk_cases,
          dates: validDates,
        });
      });

      for (const [barangayId, cases] of barangayGroups.entries()) {
        const aggregatedCase = cases.find((c: any) => c._isAggregated);
        const statisticsCaseCount = aggregatedCase ? aggregatedCase.total_cases : 0;
        const totalCases = statisticsCaseCount;

        if (totalCases < threshold.cases_threshold) continue;

        const highRiskCases = aggregatedCase?.high_risk_cases || 0;
        const mediumRiskCases = aggregatedCase?.medium_risk_cases || 0;
        const lowRiskCases = aggregatedCase?.low_risk_cases || 0;

        const barangayName = barangayMap.get(barangayId) || 'Unknown';

        const statDates = aggregatedCase ? aggregatedCase.dates : [];
        const allDates = [...statDates].sort();
        const firstDate = allDates[0] || thresholdStartDateStr;
        const latestDate = allDates[allDates.length - 1] || new Date().toISOString().split('T')[0];

        // Risk level based on individual case severity (3-level system)
        // High: Has any cases with ≥70% severity
        // Medium: Has any cases with 50-69% severity
        // Low: Only has cases with <50% severity
        const riskLevel = highRiskCases > 0 ? 'high' :
                         mediumRiskCases > 0 ? 'medium' : 'low';

        outbreaks.push({
          disease_type: threshold.disease_type,
          custom_disease_name: threshold.disease_type === 'other' ? (aggregatedCase?.custom_disease_name || null) : null,
          barangay_id: barangayId,
          barangay_name: barangayName,
          case_count: totalCases,
          high_risk_cases: highRiskCases,
          medium_risk_cases: mediumRiskCases,
          low_risk_cases: lowRiskCases,
          days_window: threshold.days_window,
          threshold: threshold.cases_threshold,
          threshold_description: threshold.description,
          risk_level: riskLevel,
          first_case_date: firstDate,
          latest_case_date: latestDate,
        });
      }
    }

    // Clear old alerts and insert new ones
    await supabase.from('outbreak_alerts').delete().lt('expires_at', new Date().toISOString());

    if (outbreaks.length > 0) {
      const { error: insertError } = await supabase.from('outbreak_alerts').insert(outbreaks);

      if (insertError) {
        throw new Error(`Failed to insert outbreaks: ${insertError.message}`);
      }
    }

    const executionTime = Date.now() - startTime;
    console.log(`[Outbreak Background Job] ✅ Complete in ${executionTime}ms: ${outbreaks.length} outbreaks stored`);

    return new Response(
      JSON.stringify({
        success: true,
        outbreaks_detected: outbreaks.length,
        execution_time_ms: executionTime,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Outbreak Background Job] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
