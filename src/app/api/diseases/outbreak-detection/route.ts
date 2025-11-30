import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  { disease_type: 'dengue', cases_threshold: 10, days_window: 7, description: '10+ cases in 7 days' },
  { disease_type: 'dengue', cases_threshold: 5, days_window: 3, description: '5+ cases in 3 days (rapid spike)' },
  { disease_type: 'hiv_aids', cases_threshold: 3, days_window: 30, description: '3+ new cases in 30 days' },
  { disease_type: 'malaria', cases_threshold: 3, days_window: 14, description: '3+ cases in 14 days' },
  { disease_type: 'measles', cases_threshold: 2, days_window: 7, description: '2+ cases in 7 days (highly contagious)' },
  { disease_type: 'rabies', cases_threshold: 1, days_window: 7, description: 'Any rabies case (immediate alert)' },
  { disease_type: 'pregnancy_complications', cases_threshold: 5, days_window: 30, description: '5+ complications in 30 days' },
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

  try {
    const searchParams = request.nextUrl.searchParams;
    const autoNotify = searchParams.get('auto_notify') === 'true';

    const outbreaks = [];

    // Check each threshold
    for (const threshold of OUTBREAK_THRESHOLDS) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - threshold.days_window);

      // Get diseases matching criteria
      const { data: diseases, error } = await supabase
        .from('diseases')
        .select('id, barangay_id, diagnosis_date, severity, barangays(name)')
        .eq('disease_type', threshold.disease_type)
        .gte('diagnosis_date', startDate.toISOString().split('T')[0])
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching diseases for outbreak detection:', error);
        continue;
      }

      // Group by barangay
      const barangayGroups: Record<number, any[]> = {};
      diseases?.forEach(disease => {
        if (!barangayGroups[disease.barangay_id]) {
          barangayGroups[disease.barangay_id] = [];
        }
        barangayGroups[disease.barangay_id].push(disease);
      });

      // Check if any barangay exceeds threshold
      for (const [barangayId, barangayDiseases] of Object.entries(barangayGroups)) {
        if (barangayDiseases.length >= threshold.cases_threshold) {
          const barangayName = barangayDiseases[0].barangays?.name || 'Unknown';
          const criticalCount = barangayDiseases.filter(d => d.severity === 'critical').length;
          const severeCount = barangayDiseases.filter(d => d.severity === 'severe').length;

          const outbreak = {
            disease_type: threshold.disease_type,
            barangay_id: parseInt(barangayId),
            barangay_name: barangayName,
            case_count: barangayDiseases.length,
            critical_cases: criticalCount,
            severe_cases: severeCount,
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

          outbreaks.push(outbreak);

          // Auto-create notification for Super Admins if enabled
          if (autoNotify) {
            await createOutbreakNotification(supabase, outbreak);
          }
        }
      }

      // Also check city-wide outbreak (all barangays combined)
      if (diseases && diseases.length >= threshold.cases_threshold * 3) {
        const criticalCount = diseases.filter(d => d.severity === 'critical').length;
        const severeCount = diseases.filter(d => d.severity === 'severe').length;

        const cityOutbreak = {
          disease_type: threshold.disease_type,
          barangay_id: null,
          barangay_name: 'City-wide',
          case_count: diseases.length,
          critical_cases: criticalCount,
          severe_cases: severeCount,
          days_window: threshold.days_window,
          threshold: threshold.cases_threshold * 3,
          threshold_description: `${threshold.description} (city-wide)`,
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

        outbreaks.push(cityOutbreak);

        if (autoNotify) {
          await createOutbreakNotification(supabase, cityOutbreak);
        }
      }
    }

    // Sort by risk level and case count
    outbreaks.sort((a, b) => {
      const riskOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      const riskDiff = riskOrder[b.risk_level as keyof typeof riskOrder] - riskOrder[a.risk_level as keyof typeof riskOrder];
      if (riskDiff !== 0) return riskDiff;
      return b.case_count - a.case_count;
    });

    return NextResponse.json({
      success: true,
      data: outbreaks,
      metadata: {
        total_outbreaks: outbreaks.length,
        critical_outbreaks: outbreaks.filter(o => o.risk_level === 'critical').length,
        high_risk_outbreaks: outbreaks.filter(o => o.risk_level === 'high').length,
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

    const notificationTitle = `${outbreak.risk_level.toUpperCase()} OUTBREAK ALERT: ${outbreak.disease_type.replace('_', ' ').toUpperCase()}`;
    const notificationMessage = outbreak.barangay_name === 'City-wide'
      ? `City-wide ${outbreak.disease_type.replace('_', ' ')} outbreak detected: ${outbreak.case_count} active cases (${outbreak.critical_cases} critical, ${outbreak.severe_cases} severe) in the last ${outbreak.days_window} days. Immediate intervention recommended.`
      : `${outbreak.disease_type.replace('_', ' ')} outbreak detected in ${outbreak.barangay_name}: ${outbreak.case_count} active cases (${outbreak.critical_cases} critical, ${outbreak.severe_cases} severe) in the last ${outbreak.days_window} days. ${outbreak.threshold_description}.`;

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

      if (existing && existing.length > 0) continue; // Skip if already notified

      await supabase
        .from('notifications')
        .insert({
          user_id: admin.id,
          type: 'general',
          title: notificationTitle,
          message: notificationMessage,
          link: '/admin/disease-surveillance',
        });
    }
  } catch (error) {
    console.error('Error creating outbreak notification:', error);
  }
}
