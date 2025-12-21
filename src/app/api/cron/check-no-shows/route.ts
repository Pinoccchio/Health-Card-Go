import { NextRequest, NextResponse } from 'next/server';
import { markNoShowsAndSuspend } from '@/lib/utils/appointmentUtils';

/**
 * POST /api/cron/check-no-shows
 *
 * Automatic No-Show Detection Cron Job
 *
 * This endpoint should be called daily (recommended: 1:00 AM PHT) by a cron scheduler
 * (Vercel Cron, cron-job.org, or similar service)
 *
 * Security:
 * - Protected by CRON_SECRET_TOKEN environment variable
 * - Only accessible with valid token in Authorization header
 *
 * Business Logic:
 * - Marks appointments as no-show if patient didn't arrive within 24 hours after scheduled date
 * - Increments patient's no_show_count
 * - Suspends account for 1 month after 2 no-shows
 * - Sends in-app notifications to affected patients
 *
 * Setup Instructions:
 * 1. Add CRON_SECRET_TOKEN to .env.local (generate a secure random string)
 * 2. Configure cron scheduler to POST to this endpoint daily
 * 3. Include header: Authorization: Bearer YOUR_CRON_SECRET_TOKEN
 *
 * Example cron-job.org configuration:
 * - URL: https://your-domain.vercel.app/api/cron/check-no-shows
 * - Method: POST
 * - Schedule: 0 1 * * * (1:00 AM daily, Philippine Time UTC+8)
 * - Headers: Authorization: Bearer YOUR_CRON_SECRET_TOKEN
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Verify cron secret token
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    if (!expectedToken) {
      console.error('[check-no-shows] CRON_SECRET_TOKEN not configured');
      return NextResponse.json(
        { error: 'Cron job not configured' },
        { status: 500 }
      );
    }

    // Extract token from "Bearer TOKEN" format
    const providedToken = authHeader?.replace('Bearer ', '');

    if (providedToken !== expectedToken) {
      console.error('[check-no-shows] Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[check-no-shows] Starting automatic no-show detection...');

    // Execute no-show detection and suspension logic
    const stats = await markNoShowsAndSuspend();

    console.log('[check-no-shows] Completed successfully:', stats);

    // Return detailed statistics for monitoring
    return NextResponse.json({
      success: true,
      message: 'No-show detection completed',
      timestamp: new Date().toISOString(),
      stats: {
        totalAppointmentsChecked: stats.totalAppointmentsChecked,
        totalMarkedNoShow: stats.totalMarkedNoShow,
        totalPatientsSuspended: stats.totalPatientsSuspended,
        details: {
          appointmentsMarked: stats.appointmentsMarked,
          patientsSuspended: stats.patientsSuspended,
        },
      },
    });

  } catch (error) {
    console.error('[check-no-shows] Critical error during execution:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during no-show detection',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/check-no-shows
 *
 * Health check endpoint for monitoring
 * Returns cron job configuration status without executing the job
 */
export async function GET(request: NextRequest) {
  const isConfigured = !!process.env.CRON_SECRET_TOKEN;

  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/cron/check-no-shows',
    configured: isConfigured,
    message: isConfigured
      ? 'Cron job is configured and ready'
      : 'CRON_SECRET_TOKEN not set - cron job cannot run',
    usage: {
      method: 'POST',
      headers: {
        Authorization: 'Bearer YOUR_CRON_SECRET_TOKEN',
      },
      schedule: 'Daily at 1:00 AM PHT',
    },
  });
}
