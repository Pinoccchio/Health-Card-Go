import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases/outbreak-detection-fast
 * Ultra-fast outbreak detection using pre-computed alerts from background job
 *
 * This endpoint queries the outbreak_alerts table which is refreshed every 5-10 minutes
 * by a Supabase Edge Function, providing near-instant responses (<100ms)
 *
 * Fallback: If no pre-computed alerts exist, falls back to real-time detection
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

  const adminClient = createAdminClient();

  console.log('[Outbreak Detection Fast] Querying pre-computed outbreak alerts...');
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const diseaseTypeFilter = searchParams.get('disease_type');
    const barangayIdFilter = searchParams.get('barangay_id');
    const riskLevelFilter = searchParams.get('risk_level');

    // Query pre-computed outbreak alerts using the stored function
    const { data: outbreaks, error } = await adminClient.rpc('get_active_outbreak_alerts', {
      p_disease_type: diseaseTypeFilter,
      p_barangay_id: barangayIdFilter ? parseInt(barangayIdFilter) : null,
      p_risk_level: riskLevelFilter,
    });

    if (error) {
      console.error('[Outbreak Detection Fast] Error querying alerts:', error);

      // Fallback: Use the standard outbreak detection if pre-computed alerts fail
      console.log('[Outbreak Detection Fast] Falling back to real-time detection...');
      const fallbackResponse = await fetch(new URL('/api/diseases/outbreak-detection', request.url).toString(), {
        headers: request.headers,
      });
      return NextResponse.json(await fallbackResponse.json());
    }

    // Check if alerts are fresh (generated within last 15 minutes)
    const now = new Date();
    const freshAlerts = outbreaks?.filter((alert: any) => {
      const generatedAt = new Date(alert.generated_at);
      const ageMinutes = (now.getTime() - generatedAt.getTime()) / (1000 * 60);
      return ageMinutes <= 15;
    }) || [];

    // If no fresh alerts, fall back to real-time detection
    if (freshAlerts.length === 0 && !diseaseTypeFilter && !barangayIdFilter) {
      console.log('[Outbreak Detection Fast] No fresh pre-computed alerts, falling back to real-time detection...');
      const fallbackResponse = await fetch(new URL('/api/diseases/outbreak-detection', request.url).toString(), {
        headers: request.headers,
      });
      return NextResponse.json(await fallbackResponse.json());
    }

    const executionTime = Date.now() - startTime;
    console.log(`[Outbreak Detection Fast] ✅ Query complete in ${executionTime}ms: ${freshAlerts.length} outbreaks (pre-computed)`);

    const response = {
      success: true,
      data: freshAlerts,
      metadata: {
        total_outbreaks: freshAlerts.length,
        critical_outbreaks: freshAlerts.filter((o: any) => o.risk_level === 'critical').length,
        high_risk_outbreaks: freshAlerts.filter((o: any) => o.risk_level === 'high').length,
        medium_risk_outbreaks: freshAlerts.filter((o: any) => o.risk_level === 'medium').length,
        auto_notify_enabled: false, // Auto-notify handled by background job
        checked_at: freshAlerts[0]?.generated_at || new Date().toISOString(),
        execution_time_ms: executionTime,
        source: 'pre-computed',
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Outbreak Detection Fast] Error:', error);

    // Fallback to real-time detection on any error
    console.log('[Outbreak Detection Fast] Error occurred, falling back to real-time detection...');
    try {
      const fallbackResponse = await fetch(new URL('/api/diseases/outbreak-detection', request.url).toString(), {
        headers: request.headers,
      });
      return NextResponse.json(await fallbackResponse.json());
    } catch (fallbackError) {
      return NextResponse.json(
        { success: false, error: 'Failed to detect outbreaks', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
}
