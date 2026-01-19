/**
 * Health Card Types API Route
 * Returns information about available health card types
 *
 * Endpoints:
 * - GET /api/healthcards/types - Get all health card type configurations
 */

import { NextResponse } from 'next/server';
import { HEALTH_CARD_TYPES, LAB_LOCATIONS } from '@/types/appointment';

// ============================================================================
// GET /api/healthcards/types
// Get all health card type configurations
// ============================================================================

export async function GET() {
  try {
    // Convert HEALTH_CARD_TYPES constant to array format for UI consumption
    const cardTypes = Object.entries(HEALTH_CARD_TYPES).map(([value, config]) => ({
      value,
      ...config,
    }));

    // Convert LAB_LOCATIONS constant to array format
    const labLocations = Object.entries(LAB_LOCATIONS).map(([value, config]) => ({
      value,
      ...config,
    }));

    return NextResponse.json({
      success: true,
      cardTypes,
      labLocations,
    });
  } catch (error: any) {
    console.error('[HEALTH_CARD_TYPES] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
