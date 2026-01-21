/**
 * Health Card Expiration Check API Route
 *
 * POST /api/health-cards/expiration/check
 * Purpose: Validate health card expiration status on-demand
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  getExpirationInfo,
  getExpirationStatus,
  getDaysRemaining,
  isHealthCardExpired,
  formatExpiryDate,
  getStatusLabel,
  type HealthCardExpirationInfo,
} from '@/lib/utils/healthCardExpiration';

interface CheckExpirationRequest {
  patient_id?: string;
  health_card_id?: string;
}

interface CheckExpirationResponse {
  success: boolean;
  data?: {
    health_card_id: string;
    patient_id: string;
    expiry_date: string | null;
    formatted_expiry_date: string;
    is_expired: boolean;
    is_active: boolean;
    days_remaining: number | null;
    status: string;
    status_label: string;
    warning_message?: string;
    expiration_info: HealthCardExpirationInfo;
  };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CheckExpirationResponse>> {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CheckExpirationRequest = await request.json();
    const { patient_id, health_card_id } = body;

    if (!patient_id && !health_card_id) {
      return NextResponse.json(
        { success: false, error: 'Either patient_id or health_card_id is required' },
        { status: 400 }
      );
    }

    // Query health card from database using the view that includes calculated status
    let query = supabase
      .from('health_cards_with_status')
      .select('*')
      .single();

    if (health_card_id) {
      query = query.eq('id', health_card_id);
    } else if (patient_id) {
      query = query.eq('patient_id', patient_id);
    }

    const { data: healthCard, error: queryError } = await query;

    if (queryError || !healthCard) {
      return NextResponse.json(
        {
          success: false,
          error: queryError?.message || 'Health card not found',
        },
        { status: 404 }
      );
    }

    // Get expiration information using utility functions
    const expirationInfo = getExpirationInfo(healthCard.expiry_date);
    const status = getExpirationStatus(healthCard.expiry_date);
    const statusLabel = getStatusLabel(status);

    // Prepare response
    const response: CheckExpirationResponse = {
      success: true,
      data: {
        health_card_id: healthCard.id,
        patient_id: healthCard.patient_id,
        expiry_date: healthCard.expiry_date,
        formatted_expiry_date: formatExpiryDate(healthCard.expiry_date),
        is_expired: isHealthCardExpired(healthCard.expiry_date),
        is_active: healthCard.is_active,
        days_remaining: getDaysRemaining(healthCard.expiry_date),
        status: status,
        status_label: statusLabel,
        warning_message: expirationInfo.warningMessage,
        expiration_info: expirationInfo,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking health card expiration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
