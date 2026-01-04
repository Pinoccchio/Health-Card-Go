import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/outbreak-detection
 * Detect disease outbreaks based on configurable thresholds
 * Auto-creates notifications for Super Admins when outbreaks detected
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
  { disease_type: 'rabies', cases_threshold: 1, days_window: 7, description: 'Any rabies case (immediate alert)' },
  { disease_type: 'pregnancy_complications', cases_threshold: 5, days_window: 30, description: '5+ complications in 30 days' },
  { disease_type: 'other', cases_threshold: 3, days_window: 14, description: '3+ cases in 14 days (custom disease)' },
];

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

  console.log('[Outbreak Detection] Starting outbreak detection scan...');

  try {
    const searchParams = request.nextUrl.searchParams;
    const autoNotify = searchParams.get('auto_notify') === 'true';

    const outbreaks = [];
    let totalThresholdsChecked = 0;
    let totalDiseasesScanned = 0;
    const cityWideCandidates = new Map<string, any>(); // Store diseases meeting city-wide threshold (distributed across barangays)

    // Check each threshold
    for (const threshold of OUTBREAK_THRESHOLDS) {
      totalThresholdsChecked++;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - threshold.days_window);

      console.log(`[Outbreak Detection] Checking ${threshold.disease_type}: threshold=${threshold.cases_threshold} cases in ${threshold.days_window} days`);
      console.log(`[Outbreak Detection] Date range: ${startDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`);

      // Get diseases matching criteria
      const { data: diseases, error } = await adminClient
        .from('diseases')
        .select('id, barangay_id, diagnosis_date, severity, custom_disease_name, barangays(name)')
        .eq('disease_type', threshold.disease_type)
        .gte('diagnosis_date', startDate.toISOString().split('T')[0])
        .eq('status', 'active');

      if (error) {
        console.error(`[Outbreak Detection] Error fetching diseases for ${threshold.disease_type}:`, error);
        continue;
      }

      const diseaseCount = diseases?.length || 0;
      totalDiseasesScanned += diseaseCount;
      console.log(`[Outbreak Detection] Found ${diseaseCount} active ${threshold.disease_type} cases in date range`);

      if (diseaseCount >= threshold.cases_threshold) {
        console.log(`[Outbreak Detection] ✅ THRESHOLD MET for ${threshold.disease_type}: ${diseaseCount} >= ${threshold.cases_threshold}`);

        // Store city-wide candidate for distributed outbreaks (e.g., HIV/AIDS spread across multiple barangays)
        // No freshness check needed - SQL query already filters by date range
        if (diseases && diseases.length > 0) {
          const key = threshold.disease_type === 'other' ? `${threshold.disease_type}_multiple` : threshold.disease_type;
          cityWideCandidates.set(key, { threshold, diseases, diseaseCount });
          console.log(`[Outbreak Detection] ✅ City-wide outbreak candidate stored: ${threshold.disease_type} (${diseaseCount} cases)`);
        }
      } else {
        console.log(`[Outbreak Detection] ❌ Threshold NOT met for ${threshold.disease_type}: ${diseaseCount} < ${threshold.cases_threshold}`);
      }

      // Group by barangay (and custom_disease_name for 'other' type)
      const barangayGroups: Record<string, any[]> = {};

      if (threshold.disease_type === 'other') {
        // For custom diseases, group by barangay AND custom disease name
        diseases?.forEach(disease => {
          const key = `${disease.barangay_id}_${disease.custom_disease_name || 'unknown'}`;
          if (!barangayGroups[key]) {
            barangayGroups[key] = [];
          }
          barangayGroups[key].push(disease);
        });
        console.log(`[Outbreak Detection] Grouped custom diseases into ${Object.keys(barangayGroups).length} unique disease+barangay combinations`);
      } else {
        // For standard diseases, group by barangay only
        diseases?.forEach(disease => {
          const key = disease.barangay_id.toString();
          if (!barangayGroups[key]) {
            barangayGroups[key] = [];
          }
          barangayGroups[key].push(disease);
        });
      }

      // Check if any barangay exceeds threshold
      for (const [groupKey, barangayDiseases] of Object.entries(barangayGroups)) {
        if (barangayDiseases.length >= threshold.cases_threshold) {
          const barangayName = barangayDiseases[0].barangays?.name || 'Unknown';
          const criticalCount = barangayDiseases.filter(d => d.severity === 'critical').length;
          const severeCount = barangayDiseases.filter(d => d.severity === 'severe').length;
          const moderateCount = barangayDiseases.filter(d => d.severity === 'moderate').length; // FIX: Add moderate count
          const customDiseaseName = threshold.disease_type === 'other' ? barangayDiseases[0].custom_disease_name : null;

          // Extract barangay_id from groupKey (handles both "123" and "123_Leptospirosis" formats)
          const barangayId = parseInt(groupKey.split('_')[0]);

          const outbreak = {
            disease_type: threshold.disease_type,
            custom_disease_name: customDiseaseName,
            barangay_id: barangayId,
            barangay_name: barangayName,
            case_count: barangayDiseases.length,
            critical_cases: criticalCount,
            severe_cases: severeCount,
            moderate_cases: moderateCount, // FIX: Include moderate count in outbreak object
            days_window: threshold.days_window,
            threshold: threshold.cases_threshold,
            threshold_description: threshold.description,
            risk_level: criticalCount >= 3 ? 'critical' :
                       severeCount >= 5 ? 'high' :
                       barangayDiseases.length >= threshold.cases_threshold * 1.5 ? 'high' : 'medium',
            first_case_date: barangayDiseases.sort((a, b) =>
              new Date(a.diagnosis_date).getTime() - new Date(b.diagnosis_date).getTime()
            )[0].diagnosis_date,
            latest_case_date: barangayDiseases.sort((a, b) =>
              new Date(b.diagnosis_date).getTime() - new Date(a.diagnosis_date).getTime()
            )[0].diagnosis_date,
          };

          const displayName = customDiseaseName ? `${customDiseaseName} (custom)` : threshold.disease_type;
          console.log(`[Outbreak Detection] 🚨 OUTBREAK DETECTED in ${barangayName}: ${displayName} - ${barangayDiseases.length} cases (${criticalCount} critical, ${severeCount} severe, ${moderateCount} moderate) - Risk: ${outbreak.risk_level.toUpperCase()}`);
          outbreaks.push(outbreak);

          // Auto-create notification for Super Admins if enabled
          if (autoNotify) {
            await createOutbreakNotification(adminClient, outbreak);
          }
        }
      }

      // FIX: Emit city-wide alerts for distributed outbreaks (ONLY if no barangay-level outbreaks)
      // This prevents duplicate alerts for the same disease
      if (threshold.disease_type === 'other') {
        // For custom diseases, check each unique custom_disease_name
        const customDiseaseGroups: Record<string, any[]> = {};
        diseases?.forEach(disease => {
          const name = disease.custom_disease_name || 'unknown';
          if (!customDiseaseGroups[name]) {
            customDiseaseGroups[name] = [];
          }
          customDiseaseGroups[name].push(disease);
        });

        for (const [customName, customDiseases] of Object.entries(customDiseaseGroups)) {
          // Check if barangay-level outbreak exists for this custom disease
          const barangayOutbreakFound = outbreaks.some(o =>
            o.disease_type === threshold.disease_type &&
            o.custom_disease_name === customName &&
            o.barangay_id !== null
          );

          if (!barangayOutbreakFound && customDiseases.length >= threshold.cases_threshold) {
            const criticalCount = customDiseases.filter(d => d.severity === 'critical').length;
            const severeCount = customDiseases.filter(d => d.severity === 'severe').length;
            const moderateCount = customDiseases.filter(d => d.severity === 'moderate').length;

            const cityOutbreak = {
              disease_type: threshold.disease_type,
              custom_disease_name: customName,
              barangay_id: null,
              barangay_name: 'City-wide (distributed)',
              case_count: customDiseases.length,
              critical_cases: criticalCount,
              severe_cases: severeCount,
              moderate_cases: moderateCount,
              days_window: threshold.days_window,
              threshold: threshold.cases_threshold, // SAME threshold as barangay-level
              threshold_description: `${threshold.description} (city-wide, distributed across barangays)`,
              risk_level: criticalCount >= 5 ? 'critical' :
                         severeCount >= 8 ? 'high' :
                         customDiseases.length >= threshold.cases_threshold * 1.5 ? 'high' : 'medium',
              first_case_date: customDiseases.sort((a, b) =>
                new Date(a.diagnosis_date).getTime() - new Date(b.diagnosis_date).getTime()
              )[0].diagnosis_date,
              latest_case_date: customDiseases.sort((a, b) =>
                new Date(b.diagnosis_date).getTime() - new Date(a.diagnosis_date).getTime()
              )[0].diagnosis_date,
            };

            console.log(`[Outbreak Detection] 🚨 CITY-WIDE OUTBREAK (distributed): ${customName} - ${customDiseases.length} cases across multiple barangays (${criticalCount} critical, ${severeCount} severe, ${moderateCount} moderate) - Risk: ${cityOutbreak.risk_level.toUpperCase()}`);
            outbreaks.push(cityOutbreak);

            if (autoNotify) {
              await createOutbreakNotification(adminClient, cityOutbreak);
            }
          }
        }
      } else {
        // Standard disease - check if city-wide candidate exists
        const candidate = cityWideCandidates.get(threshold.disease_type);

        if (candidate) {
          // Check if barangay-level outbreak exists for this disease
          const barangayOutbreakFound = outbreaks.some(o =>
            o.disease_type === threshold.disease_type &&
            o.barangay_id !== null
          );

          if (!barangayOutbreakFound) {
            const criticalCount = candidate.diseases.filter((d: any) => d.severity === 'critical').length;
            const severeCount = candidate.diseases.filter((d: any) => d.severity === 'severe').length;
            const moderateCount = candidate.diseases.filter((d: any) => d.severity === 'moderate').length;

            const cityOutbreak = {
              disease_type: threshold.disease_type,
              custom_disease_name: null,
              barangay_id: null,
              barangay_name: 'City-wide (distributed)',
              case_count: candidate.diseaseCount,
              critical_cases: criticalCount,
              severe_cases: severeCount,
              moderate_cases: moderateCount,
              days_window: threshold.days_window,
              threshold: threshold.cases_threshold, // SAME threshold as barangay-level
              threshold_description: `${threshold.description} (city-wide, distributed across barangays)`,
              risk_level: criticalCount >= 5 ? 'critical' :
                         severeCount >= 8 ? 'high' :
                         candidate.diseaseCount >= threshold.cases_threshold * 1.5 ? 'high' : 'medium',
              first_case_date: candidate.diseases.sort((a: any, b: any) =>
                new Date(a.diagnosis_date).getTime() - new Date(b.diagnosis_date).getTime()
              )[0].diagnosis_date,
              latest_case_date: candidate.diseases.sort((a: any, b: any) =>
                new Date(b.diagnosis_date).getTime() - new Date(a.diagnosis_date).getTime()
              )[0].diagnosis_date,
            };

            console.log(`[Outbreak Detection] 🚨 CITY-WIDE OUTBREAK (distributed): ${threshold.disease_type} - ${candidate.diseaseCount} cases across multiple barangays (${criticalCount} critical, ${severeCount} severe, ${moderateCount} moderate) - Risk: ${cityOutbreak.risk_level.toUpperCase()}`);
            outbreaks.push(cityOutbreak);

            if (autoNotify) {
              await createOutbreakNotification(adminClient, cityOutbreak);
            }
          }
        }
      }

      // Also check city-wide outbreak (all barangays combined)
      if (threshold.disease_type === 'other') {
        // For custom diseases, group by custom_disease_name for city-wide detection
        const customDiseaseGroups: Record<string, any[]> = {};
        diseases?.forEach(disease => {
          const name = disease.custom_disease_name || 'unknown';
          if (!customDiseaseGroups[name]) {
            customDiseaseGroups[name] = [];
          }
          customDiseaseGroups[name].push(disease);
        });

        // Check each custom disease for city-wide outbreak
        for (const [customName, customDiseases] of Object.entries(customDiseaseGroups)) {
          if (customDiseases.length >= threshold.cases_threshold * 2) {
            console.log(`[Outbreak Detection] Checking high-volume city-wide ${customName}: ${customDiseases.length} cases >= ${threshold.cases_threshold * 2} threshold`);
            const criticalCount = customDiseases.filter(d => d.severity === 'critical').length;
            const severeCount = customDiseases.filter(d => d.severity === 'severe').length;
            const moderateCount = customDiseases.filter(d => d.severity === 'moderate').length; // FIX: Add moderate count for city-wide custom diseases

            const cityOutbreak = {
              disease_type: threshold.disease_type,
              custom_disease_name: customName,
              barangay_id: null,
              barangay_name: 'City-wide',
              case_count: customDiseases.length,
              critical_cases: criticalCount,
              severe_cases: severeCount,
              moderate_cases: moderateCount, // FIX: Include moderate count in city-wide outbreak
              days_window: threshold.days_window,
              threshold: threshold.cases_threshold * 2,
              threshold_description: `${threshold.description} (high-volume city-wide)`,
              risk_level: criticalCount >= 10 ? 'critical' :
                         severeCount >= 15 ? 'high' :
                         customDiseases.length >= threshold.cases_threshold * 5 ? 'high' : 'medium',
              first_case_date: customDiseases.sort((a, b) =>
                new Date(a.diagnosis_date).getTime() - new Date(b.diagnosis_date).getTime()
              )[0].diagnosis_date,
              latest_case_date: customDiseases.sort((a, b) =>
                new Date(b.diagnosis_date).getTime() - new Date(a.diagnosis_date).getTime()
              )[0].diagnosis_date,
            };

            console.log(`[Outbreak Detection] 🚨 HIGH-VOLUME CITY-WIDE OUTBREAK for ${customName} (custom): ${customDiseases.length} cases (${criticalCount} critical, ${severeCount} severe, ${moderateCount} moderate) - Risk: ${cityOutbreak.risk_level.toUpperCase()}`);
            outbreaks.push(cityOutbreak);

            if (autoNotify) {
              await createOutbreakNotification(adminClient, cityOutbreak);
            }
          }
        }
      } else if (diseases && diseases.length >= threshold.cases_threshold * 2) {
        // Standard disease city-wide outbreak detection
        console.log(`[Outbreak Detection] Checking high-volume city-wide ${threshold.disease_type}: ${diseases.length} cases >= ${threshold.cases_threshold * 2} threshold`);
        const criticalCount = diseases.filter(d => d.severity === 'critical').length;
        const severeCount = diseases.filter(d => d.severity === 'severe').length;
        const moderateCount = diseases.filter(d => d.severity === 'moderate').length; // FIX: Add moderate count for city-wide standard diseases

        const cityOutbreak = {
          disease_type: threshold.disease_type,
          custom_disease_name: null,
          barangay_id: null,
          barangay_name: 'City-wide',
          case_count: diseases.length,
          critical_cases: criticalCount,
          severe_cases: severeCount,
          moderate_cases: moderateCount, // FIX: Include moderate count in city-wide standard outbreak
          days_window: threshold.days_window,
          threshold: threshold.cases_threshold * 2,
          threshold_description: `${threshold.description} (high-volume city-wide)`,
          risk_level: criticalCount >= 10 ? 'critical' :
                     severeCount >= 15 ? 'high' :
                     diseases.length >= threshold.cases_threshold * 5 ? 'high' : 'medium',
          first_case_date: diseases.sort((a, b) =>
            new Date(a.diagnosis_date).getTime() - new Date(b.diagnosis_date).getTime()
          )[0].diagnosis_date,
          latest_case_date: diseases.sort((a, b) =>
            new Date(b.diagnosis_date).getTime() - new Date(a.diagnosis_date).getTime()
          )[0].diagnosis_date,
        };

        console.log(`[Outbreak Detection] 🚨 HIGH-VOLUME CITY-WIDE OUTBREAK for ${threshold.disease_type}: ${diseases.length} cases (${criticalCount} critical, ${severeCount} severe, ${moderateCount} moderate) - Risk: ${cityOutbreak.risk_level.toUpperCase()}`);
        outbreaks.push(cityOutbreak);

        if (autoNotify) {
          await createOutbreakNotification(adminClient, cityOutbreak);
        }
      }
    }

    // Consolidate outbreaks by disease_type + barangay combination
    const consolidatedOutbreaks = consolidateOutbreaks(outbreaks);

    // Sort by risk level and case count
    consolidatedOutbreaks.sort((a, b) => {
      const riskOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      const riskDiff = riskOrder[b.risk_level as keyof typeof riskOrder] - riskOrder[a.risk_level as keyof typeof riskOrder];
      if (riskDiff !== 0) return riskDiff;
      return b.case_count - a.case_count;
    });

    const criticalCount = consolidatedOutbreaks.filter(o => o.risk_level === 'critical').length;
    const highRiskCount = consolidatedOutbreaks.filter(o => o.risk_level === 'high').length;
    const mediumRiskCount = consolidatedOutbreaks.filter(o => o.risk_level === 'medium').length;

    console.log(`[Outbreak Detection] ========== SCAN COMPLETE ==========`);
    console.log(`[Outbreak Detection] Thresholds checked: ${totalThresholdsChecked}`);
    console.log(`[Outbreak Detection] Total active diseases scanned: ${totalDiseasesScanned}`);
    console.log(`[Outbreak Detection] Outbreaks detected (before consolidation): ${outbreaks.length}`);
    console.log(`[Outbreak Detection] Consolidated outbreaks: ${consolidatedOutbreaks.length}`);
    console.log(`[Outbreak Detection] Critical: ${criticalCount} | High Risk: ${highRiskCount} | Medium: ${mediumRiskCount} | Total: ${consolidatedOutbreaks.length}`);
    console.log(`[Outbreak Detection] ====================================`);

    return NextResponse.json({
      success: true,
      data: consolidatedOutbreaks,
      metadata: {
        total_outbreaks: consolidatedOutbreaks.length,
        critical_outbreaks: criticalCount,
        high_risk_outbreaks: highRiskCount,
        medium_risk_outbreaks: mediumRiskCount,
        auto_notify_enabled: autoNotify,
        checked_at: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('Error in outbreak-detection API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * Consolidate multiple outbreak alerts for the same disease+barangay combination
 * Groups by disease_type + barangay_id + custom_disease_name (for 'other'), includes all exceeded thresholds
 */
function consolidateOutbreaks(outbreaks: any[]) {
  const grouped = new Map<string, any[]>();

  // Group outbreaks by disease_type + barangay_id (+ custom_disease_name for 'other')
  outbreaks.forEach(outbreak => {
    const diseaseKey = outbreak.disease_type === 'other' && outbreak.custom_disease_name
      ? `${outbreak.disease_type}_${outbreak.custom_disease_name}`
      : outbreak.disease_type;
    const key = `${diseaseKey}_${outbreak.barangay_id || 'citywide'}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(outbreak);
  });

  // Consolidate each group
  const consolidated: any[] = [];

  grouped.forEach((group, key) => {
    if (group.length === 1) {
      // Single outbreak - add thresholds_exceeded array with one item
      consolidated.push({
        ...group[0],
        thresholds_exceeded: [{
          threshold: group[0].threshold,
          days_window: group[0].days_window,
          description: group[0].threshold_description,
          case_count: group[0].case_count,
        }],
      });
    } else {
      // Multiple outbreaks - consolidate
      const riskOrder = { critical: 3, high: 2, medium: 1, low: 0 };

      // Sort by risk level and case count to get the primary outbreak
      group.sort((a, b) => {
        const riskDiff = riskOrder[b.risk_level as keyof typeof riskOrder] - riskOrder[a.risk_level as keyof typeof riskOrder];
        if (riskDiff !== 0) return riskDiff;
        return b.case_count - a.case_count;
      });

      const primary = group[0];

      // Collect all threshold information
      const thresholds_exceeded = group.map(outbreak => ({
        threshold: outbreak.threshold,
        days_window: outbreak.days_window,
        description: outbreak.threshold_description,
        case_count: outbreak.case_count,
      }));

      // Sort thresholds by days_window (shortest first - most urgent)
      thresholds_exceeded.sort((a, b) => a.days_window - b.days_window);

      consolidated.push({
        ...primary,
        thresholds_exceeded,
      });
    }
  });

  return consolidated;
}

async function createOutbreakNotification(supabase: any, outbreak: any) {
  try {
    // Get all Super Admins
    const { data: superAdmins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')
      .eq('status', 'active');

    if (!superAdmins || superAdmins.length === 0) return;

    // Check if notification already sent in last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    // Format disease name - use custom_disease_name if disease_type is 'other'
    const diseaseName = outbreak.disease_type === 'other' && outbreak.custom_disease_name
      ? outbreak.custom_disease_name
      : outbreak.disease_type.replace('_', ' ').toUpperCase();

    const notificationTitle = `${outbreak.risk_level.toUpperCase()} OUTBREAK ALERT: ${diseaseName}`;
    const notificationMessage = outbreak.barangay_name === 'City-wide'
      ? `City-wide ${diseaseName} outbreak detected: ${outbreak.case_count} active cases (${outbreak.critical_cases} critical, ${outbreak.severe_cases} severe) in the last ${outbreak.days_window} days. Immediate intervention recommended.`
      : `${diseaseName} outbreak detected in ${outbreak.barangay_name}: ${outbreak.case_count} active cases (${outbreak.critical_cases} critical, ${outbreak.severe_cases} severe) in the last ${outbreak.days_window} days. ${outbreak.threshold_description}.`;

    // Create notification for each Super Admin
    for (const admin of superAdmins) {
      // Check for duplicate
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', admin.id)
        .eq('title', notificationTitle)
        .gte('created_at', oneDayAgo.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`[Outbreak Detection] Skipping duplicate notification for ${admin.id}: ${notificationTitle}`);
        continue;
      }

      await supabase
        .from('notifications')
        .insert({
          user_id: admin.id,
          type: 'general',
          title: notificationTitle,
          message: notificationMessage,
          link: '/admin/disease-surveillance',
        });

      console.log(`[Outbreak Detection] Created notification for Super Admin ${admin.id}: ${notificationTitle}`);
    }
  } catch (error) {
    console.error('Error creating outbreak notification:', error);
  }
}
