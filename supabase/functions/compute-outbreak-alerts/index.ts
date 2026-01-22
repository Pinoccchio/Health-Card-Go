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

    const [diseasesResult, statisticsResult, barangaysResult] = await Promise.all([
      supabase
        .from('diseases')
        .select('id, barangay_id, diagnosis_date, severity, disease_type, custom_disease_name, status')
        .eq('status', 'active')
        .gte('diagnosis_date', oldestStartDateStr)
        .limit(500),

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

    const allDiseases = diseasesResult.data || [];
    const allStatistics = statisticsResult.data || [];
    const barangays = barangaysResult.data || [];

    const barangayMap = new Map<number, string>();
    barangays.forEach((b: any) => barangayMap.set(b.id, b.name));

    console.log(`[Outbreak Background Job] Fetched ${allDiseases.length} diseases, ${allStatistics.length} statistics`);

    // Pre-aggregate statistics
    const statisticsAggregated = new Map<string, Map<number, any>>();

    allStatistics.forEach((stat: any) => {
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

      if (stat.severity === 'critical') {
        barangayData.critical_cases += stat.case_count;
      } else if (stat.severity === 'severe') {
        barangayData.severe_cases += stat.case_count;
      } else if (stat.severity === 'moderate') {
        barangayData.moderate_cases += stat.case_count;
      } else {
        barangayData.moderate_cases += stat.case_count;
      }
    });

    // Detect outbreaks
    const outbreaks: any[] = [];

    for (const threshold of OUTBREAK_THRESHOLDS) {
      const thresholdStartDate = new Date();
      thresholdStartDate.setDate(thresholdStartDate.getDate() - threshold.days_window);
      const thresholdStartDateStr = thresholdStartDate.toISOString().split('T')[0];

      const matchingDiseases = allDiseases.filter((d: any) =>
        d.disease_type === threshold.disease_type &&
        d.diagnosis_date >= thresholdStartDateStr
      );

      const diseaseStats = statisticsAggregated.get(threshold.disease_type) || new Map();

      const barangayGroups = new Map<number, any[]>();
      matchingDiseases.forEach((disease: any) => {
        if (!barangayGroups.has(disease.barangay_id)) {
          barangayGroups.set(disease.barangay_id, []);
        }
        barangayGroups.get(disease.barangay_id)!.push(disease);
      });

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
          critical_cases: stats.critical_cases,
          severe_cases: stats.severe_cases,
          moderate_cases: stats.moderate_cases,
          dates: validDates,
        });
      });

      for (const [barangayId, cases] of barangayGroups.entries()) {
        const aggregatedCase = cases.find((c: any) => c._isAggregated);
        const patientCaseCount = cases.filter((c: any) => !c._isAggregated).length;
        const statisticsCaseCount = aggregatedCase ? aggregatedCase.total_cases : 0;
        const totalCases = patientCaseCount + statisticsCaseCount;

        if (totalCases < threshold.cases_threshold) continue;

        const criticalCases = cases.filter((c: any) => !c._isAggregated && c.severity === 'critical').length + (aggregatedCase?.critical_cases || 0);
        const severeCases = cases.filter((c: any) => !c._isAggregated && c.severity === 'severe').length + (aggregatedCase?.severe_cases || 0);
        const moderateCases = cases.filter((c: any) => !c._isAggregated && c.severity === 'moderate').length + (aggregatedCase?.moderate_cases || 0);

        const barangayName = barangayMap.get(barangayId) || 'Unknown';

        const patientDates = cases.filter((c: any) => !c._isAggregated).map((c: any) => c.diagnosis_date);
        const statDates = aggregatedCase ? aggregatedCase.dates : [];
        const allDates = [...patientDates, ...statDates].sort();
        const firstDate = allDates[0] || thresholdStartDateStr;
        const latestDate = allDates[allDates.length - 1] || new Date().toISOString().split('T')[0];

        const riskLevel = criticalCases >= 3 ? 'critical' :
                         severeCases >= 5 ? 'high' :
                         totalCases >= threshold.cases_threshold * 1.5 ? 'high' : 'medium';

        outbreaks.push({
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
