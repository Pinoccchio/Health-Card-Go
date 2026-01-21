/**
 * HealthCard SARIMA Types
 *
 * Type definitions for health card issuance tracking and SARIMA predictions.
 * Supports General health cards (Yellow and Green card types) with location-based forecasting.
 */

import { Database } from './supabase';

// ============================================================================
// HealthCard Type Classification
// ============================================================================

/**
 * Health card classification based on service type
 * - food_handler: Services 12, 13 (Yellow Card - General Health Card Processing & Renewal)
 * - non_food: Services 14, 15 (Green Card - General Health Card Processing & Renewal)
 * - pink: Service 12 with card_type='pink' (Pink Card - Service/Clinical)
 */
export type HealthCardType = 'food_handler' | 'non_food' | 'pink';

// ============================================================================
// HealthCard Statistics (Historical Data)
// ============================================================================

/**
 * Aggregated health card issuance statistics
 * Used for historical tracking and SARIMA model training
 */
export interface HealthCardStatistic {
  id: string;
  healthcard_type: HealthCardType;
  barangay_id: number | null;
  issue_date: string; // Date string (YYYY-MM-DD)
  card_count: number;
  created_at: string;

  // Optional joined data
  barangay?: {
    id: number;
    name: string;
    code: string;
  };
}

/**
 * Payload for creating health card statistics
 */
export interface CreateHealthCardStatisticPayload {
  healthcard_type: HealthCardType;
  barangay_id: number | null;
  issue_date: string;
  card_count: number;
}

// ============================================================================
// HealthCard Predictions (SARIMA Forecasts)
// ============================================================================

/**
 * SARIMA prediction for health card issuance
 */
export interface HealthCardPrediction {
  id: string;
  healthcard_type: HealthCardType;
  barangay_id: number | null;
  prediction_date: string; // Date string (YYYY-MM-DD)
  predicted_cards: number;
  confidence_level: number | null; // 0-1 scale
  model_version: string | null;
  prediction_data: PredictionMetadata | null;
  created_at: string;

  // Optional joined data
  barangay?: {
    id: number;
    name: string;
    code: string;
  };
}

/**
 * Additional metadata stored with predictions
 */
export interface PredictionMetadata {
  upper_bound?: number;
  lower_bound?: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  r_squared?: number;
  trend?: 'increasing' | 'decreasing' | 'stable';
  seasonality_detected?: boolean;
  notes?: string;
}

/**
 * Payload for creating health card predictions
 */
export interface CreateHealthCardPredictionPayload {
  healthcard_type: HealthCardType;
  barangay_id: number | null;
  prediction_date: string;
  predicted_cards: number;
  confidence_level?: number;
  model_version?: string;
  prediction_data?: PredictionMetadata;
}

// ============================================================================
// SARIMA Chart Data
// ============================================================================

/**
 * Combined historical + prediction data for SARIMA chart visualization
 */
export interface HealthCardSARIMAData {
  // Chart data points
  dates: string[]; // All dates (historical + forecast)
  historicalDates: string[]; // Past dates with actual data
  forecastDates: string[]; // Future dates with predictions

  // Actual issuance data (historical)
  actualCards: (number | null)[]; // Null for future dates

  // Predicted data (extends into future)
  predictedCards: (number | null)[]; // Null for dates without predictions

  // Confidence intervals
  upperBound: (number | null)[];
  lowerBound: (number | null)[];

  // Metadata
  healthcard_type: HealthCardType;
  barangay_id: number | null;
  barangay_name: string | null;
  total_historical: number;
  total_predicted: number;
  model_accuracy: ModelAccuracy | null;
  last_updated: string;
}

/**
 * SARIMA model accuracy metrics
 */
export interface ModelAccuracy {
  mse: number; // Mean Squared Error
  rmse: number; // Root Mean Squared Error
  mae: number; // Mean Absolute Error
  r_squared: number; // Coefficient of Determination (0-1, higher is better)
  interpretation: 'excellent' | 'good' | 'fair' | 'poor';
  confidence_level: number; // 0-1 scale
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from /api/healthcards/statistics
 */
export interface HealthCardStatisticsResponse {
  success: boolean;
  data: HealthCardStatistic[];
  total: number;
  filters?: {
    healthcard_type?: HealthCardType;
    barangay_id?: number;
    start_date?: string;
    end_date?: string;
  };
}

/**
 * Data quality level for predictions
 */
export type DataQuality = 'high' | 'moderate' | 'insufficient';

/**
 * Response from /api/healthcards/predictions
 */
export interface HealthCardPredictionsResponse {
  success: boolean;
  data: HealthCardSARIMAData;
  metadata: {
    healthcard_type: HealthCardType;
    barangay_id: number | null;
    barangay_name: string | null;
    days_historical: number;
    days_forecast: number;
    total_data_points: number;
    model_version: string;
    // Data quality indicators
    data_points_count?: number; // Historical data points used for training
    data_quality?: DataQuality; // Overall quality assessment
    variance_detected?: boolean; // Whether predictions show variance
    has_sufficient_data?: boolean; // >= 30 data points
  };
}

// ============================================================================
// Filter & Query Types
// ============================================================================

/**
 * Filters for querying health card statistics
 */
export interface HealthCardStatisticsFilters {
  healthcard_type?: HealthCardType;
  barangay_id?: number;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  service_id?: number; // For healthcare admin filtering
}

/**
 * Filters for querying health card predictions
 */
export interface HealthCardPredictionsFilters {
  healthcard_type?: HealthCardType;
  barangay_id?: number;
  days_back?: number; // How many days of historical data to include
  days_forecast?: number; // How many days to forecast
  include_confidence?: boolean; // Include upper/lower bounds
}

// ============================================================================
// Service Mapping
// ============================================================================

/**
 * Maps service IDs to health card types
 * Note: Service 12 can be food_handler, non_food, or pink depending on appointment.card_type
 */
export const SERVICE_TO_HEALTHCARD_TYPE: Record<number, HealthCardType> = {
  12: 'food_handler', // Yellow Card - General Health Card Processing (default, also supports pink via card_type)
  13: 'food_handler', // Yellow Card - General Health Card Renewal
  14: 'non_food', // Green Card - General Health Card Processing
  15: 'non_food', // Green Card - General Health Card Renewal
};

/**
 * Maps health card types to service IDs
 */
export const HEALTHCARD_TYPE_TO_SERVICES: Record<HealthCardType, number[]> = {
  food_handler: [12, 13],
  non_food: [14, 15],
  pink: [12], // Pink Card uses Service 12 with card_type='pink' differentiation
};

/**
 * Human-readable labels for health card types
 */
export const HEALTHCARD_TYPE_LABELS: Record<HealthCardType, string> = {
  food_handler: 'General (Yellow Card)',
  non_food: 'General (Green Card)',
  pink: 'Service/Clinical (Pink Card)',
};

/**
 * Color schemes for health card types (Chart.js compatible)
 * - Yellow Card: Yellow colors (matches card name)
 * - Green Card: Green colors (matches card name)
 * - Pink Card: Pink/Rose colors (matches card name)
 */
export const HEALTHCARD_TYPE_COLORS: Record<HealthCardType, {
  primary: string;
  light: string;
  dark: string;
}> = {
  food_handler: {
    primary: 'rgb(234, 179, 8)', // Yellow (FIXED from blue to yellow)
    light: 'rgba(234, 179, 8, 0.2)',
    dark: 'rgb(161, 98, 7)',
  },
  non_food: {
    primary: 'rgb(34, 197, 94)', // Green
    light: 'rgba(34, 197, 94, 0.2)',
    dark: 'rgb(21, 128, 61)',
  },
  pink: {
    primary: 'rgb(236, 72, 153)', // Pink/Rose
    light: 'rgba(236, 72, 153, 0.2)',
    dark: 'rgb(190, 24, 93)',
  },
};

// ============================================================================
// Supabase Database Types (if using typed client)
// ============================================================================

export type HealthCardPredictionRow = Database['public']['Tables']['healthcard_predictions']['Row'];
export type HealthCardPredictionInsert = Database['public']['Tables']['healthcard_predictions']['Insert'];
export type HealthCardPredictionUpdate = Database['public']['Tables']['healthcard_predictions']['Update'];

// ============================================================================
// Health Card Expiration Types
// ============================================================================

/**
 * Health card expiration status
 * - active: Card is valid and has more than 30 days remaining
 * - expiring_soon: Card has 30 days or less remaining
 * - expired: Card has passed the expiry date
 * - pending: Card has not been issued yet (no expiry date)
 */
export type HealthCardExpirationStatus = 'active' | 'expiring_soon' | 'expired' | 'pending';

/**
 * Comprehensive expiration information for a health card
 */
export interface HealthCardExpiration {
  expiry_date: string | null; // ISO date string
  formatted_expiry_date: string; // Human-readable format
  is_expired: boolean;
  is_active: boolean; // From health_cards.is_active column
  days_remaining: number | null; // Positive = days left, Negative = days past expiry
  status: HealthCardExpirationStatus;
  status_label: string; // Human-readable status
  warning_message?: string; // Message to display to user
}

/**
 * Health card with expiration data (from API response)
 */
export interface HealthCardWithExpiration {
  id: string;
  patient_id: string;
  card_number: string;
  qr_code_data: string;
  issue_date: string;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // Expiration information
  expiration: HealthCardExpiration;

  // Patient information (if joined)
  patient?: {
    id: string;
    patient_number: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    contact_number: string;
    blood_type?: string | null;
    barangay: string;
    barangay_id: number;
    allergies?: string | null;
    current_medications?: string | null;
    emergency_contact: any;
    medical_history?: any;
  };
}

/**
 * Response from health card expiration check API
 */
export interface HealthCardExpirationCheckResponse {
  success: boolean;
  data?: {
    health_card_id: string;
    patient_id: string;
    expiry_date: string | null;
    formatted_expiry_date: string;
    is_expired: boolean;
    is_active: boolean;
    days_remaining: number | null;
    status: HealthCardExpirationStatus;
    status_label: string;
    warning_message?: string;
    expiration_info: HealthCardExpiration;
  };
  error?: string;
}
