/**
 * HealthCard Chart Data Transformers
 *
 * Utility functions to transform health card statistics and predictions
 * into Chart.js-compatible data formats for SARIMA visualization.
 */

import {
  HealthCardSARIMAData,
  HealthCardStatistic,
  HealthCardPrediction,
  HealthCardType,
  ModelAccuracy,
} from '@/types/healthcard';
import {
  calculateMSE,
  calculateRMSE,
  calculateMAE,
  calculateRSquared,
  interpretRSquared,
} from '@/lib/utils/sarimaMetrics';

// ============================================================================
// SARIMA Data Transformation
// ============================================================================

/**
 * Transform historical statistics and predictions into Chart.js format
 *
 * @param historicalData - Array of historical healthcard statistics
 * @param predictions - Array of SARIMA predictions
 * @param healthcardType - Type of healthcard
 * @param barangayId - Optional barangay filter
 * @param barangayName - Optional barangay name
 * @returns Chart-ready SARIMA data
 */
export function transformHealthCardSARIMAData(
  historicalData: HealthCardStatistic[],
  predictions: HealthCardPrediction[],
  healthcardType: HealthCardType,
  barangayId?: number | null,
  barangayName?: string | null
): HealthCardSARIMAData {
  // Sort historical data by date
  const sortedHistorical = [...historicalData].sort(
    (a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime()
  );

  // Sort predictions by date
  const sortedPredictions = [...predictions].sort(
    (a, b) => new Date(a.prediction_date).getTime() - new Date(b.prediction_date).getTime()
  );

  // Extract all unique dates
  const historicalDates = sortedHistorical.map((d) => d.issue_date);
  const forecastDates = sortedPredictions.map((p) => p.prediction_date);
  const allDates = [...new Set([...historicalDates, ...forecastDates])].sort();

  // Create maps for quick lookup
  const historicalMap = new Map(
    sortedHistorical.map((d) => [d.issue_date, d.card_count])
  );
  const predictionMap = new Map(
    sortedPredictions.map((p) => [
      p.prediction_date,
      {
        predicted: p.predicted_cards,
        upper: p.prediction_data?.upper_bound || null,
        lower: p.prediction_data?.lower_bound || null,
      },
    ])
  );

  // Build data arrays aligned to dates
  const actualCards: (number | null)[] = [];
  const predictedCards: (number | null)[] = [];
  const upperBound: (number | null)[] = [];
  const lowerBound: (number | null)[] = [];

  allDates.forEach((date) => {
    const actual = historicalMap.get(date);
    const prediction = predictionMap.get(date);

    actualCards.push(actual !== undefined ? actual : null);
    predictedCards.push(prediction?.predicted ?? null);
    upperBound.push(prediction?.upper ?? null);
    lowerBound.push(prediction?.lower ?? null);
  });

  // Calculate model accuracy metrics
  const modelAccuracy = calculateModelAccuracyFromPredictions(
    sortedHistorical,
    sortedPredictions
  );

  // Calculate totals
  const totalHistorical = sortedHistorical.reduce(
    (sum, d) => sum + d.card_count,
    0
  );
  const totalPredicted = sortedPredictions.reduce(
    (sum, p) => sum + p.predicted_cards,
    0
  );

  return {
    dates: allDates,
    historicalDates,
    forecastDates,
    actualCards,
    predictedCards,
    upperBound,
    lowerBound,
    healthcard_type: healthcardType,
    barangay_id: barangayId ?? null,
    barangay_name: barangayName ?? null,
    total_historical: totalHistorical,
    total_predicted: totalPredicted,
    model_accuracy: modelAccuracy,
    last_updated: new Date().toISOString(),
  };
}

// ============================================================================
// Model Accuracy Calculation
// ============================================================================

/**
 * Calculate model accuracy metrics from predictions vs actuals
 *
 * @param historicalData - Historical data (actuals)
 * @param predictions - Predictions to compare
 * @returns Model accuracy metrics or null if insufficient data
 */
function calculateModelAccuracyFromPredictions(
  historicalData: HealthCardStatistic[],
  predictions: HealthCardPrediction[]
): ModelAccuracy | null {
  // Find overlapping dates (predictions that have actual data)
  const historicalMap = new Map(
    historicalData.map((d) => [d.issue_date, d.card_count])
  );

  const overlappingPredictions = predictions.filter((p) =>
    historicalMap.has(p.prediction_date)
  );

  if (overlappingPredictions.length < 5) {
    // Not enough data for reliable metrics
    return null;
  }

  // Extract actual and predicted values
  const actual = overlappingPredictions.map(
    (p) => historicalMap.get(p.prediction_date)!
  );
  const predicted = overlappingPredictions.map((p) => p.predicted_cards);

  // Calculate SARIMA metrics
  const mse = calculateMSE(actual, predicted);
  const rmse = calculateRMSE(actual, predicted);
  const mae = calculateMAE(actual, predicted);
  const r_squared = calculateRSquared(actual, predicted);
  const interpretation = interpretRSquared(r_squared);

  // Calculate confidence level (0-1 scale based on R²)
  const confidenceLevel = r_squared;

  return {
    mse,
    rmse,
    mae,
    r_squared,
    interpretation: interpretation.toLowerCase() as 'excellent' | 'good' | 'fair' | 'poor',
    confidence_level: confidenceLevel,
  };
}

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Aggregate statistics by date
 *
 * @param statistics - Array of statistics
 * @returns Map of date to total card count
 */
export function aggregateByDate(
  statistics: HealthCardStatistic[]
): Map<string, number> {
  const aggregated = new Map<string, number>();

  statistics.forEach((stat) => {
    const current = aggregated.get(stat.issue_date) || 0;
    aggregated.set(stat.issue_date, current + stat.card_count);
  });

  return aggregated;
}

/**
 * Aggregate statistics by barangay
 *
 * @param statistics - Array of statistics
 * @returns Map of barangay_id to total card count
 */
export function aggregateByBarangay(
  statistics: HealthCardStatistic[]
): Map<number | null, { total: number; barangay_name?: string }> {
  const aggregated = new Map<
    number | null,
    { total: number; barangay_name?: string }
  >();

  statistics.forEach((stat) => {
    const current = aggregated.get(stat.barangay_id) || {
      total: 0,
      barangay_name: stat.barangay?.name,
    };
    aggregated.set(stat.barangay_id, {
      total: current.total + stat.card_count,
      barangay_name: stat.barangay?.name || current.barangay_name,
    });
  });

  return aggregated;
}

/**
 * Aggregate statistics by health card type
 *
 * @param statistics - Array of statistics
 * @returns Map of healthcard_type to total card count
 */
export function aggregateByType(
  statistics: HealthCardStatistic[]
): Map<HealthCardType, number> {
  const aggregated = new Map<HealthCardType, number>();

  statistics.forEach((stat) => {
    const current = aggregated.get(stat.healthcard_type) || 0;
    aggregated.set(stat.healthcard_type, current + stat.card_count);
  });

  return aggregated;
}

// ============================================================================
// Time Series Helpers
// ============================================================================

/**
 * Fill missing dates in time series with zero values
 *
 * @param data - Map of date to value
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Complete time series with all dates
 */
export function fillMissingDates(
  data: Map<string, number>,
  startDate: string,
  endDate: string
): Map<string, number> {
  const filled = new Map<string, number>();
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (
    let date = new Date(start);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    const dateString = date.toISOString().split('T')[0];
    filled.set(dateString, data.get(dateString) || 0);
  }

  return filled;
}

/**
 * Calculate moving average for smoothing
 *
 * @param values - Array of values
 * @param windowSize - Number of values to average
 * @returns Array of moving averages
 */
export function calculateMovingAverage(
  values: number[],
  windowSize: number = 7
): number[] {
  if (values.length < windowSize) {
    return values;
  }

  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      result.push(values[i]);
    } else {
      const window = values.slice(i - windowSize + 1, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / windowSize;
      result.push(Math.round(average * 100) / 100);
    }
  }

  return result;
}

// ============================================================================
// Chart.js Dataset Builders
// ============================================================================

/**
 * Build Chart.js dataset for actual health card issuances
 *
 * @param data - SARIMA data
 * @param color - Primary color for the line
 * @returns Chart.js dataset configuration
 */
export function buildActualDataset(
  data: HealthCardSARIMAData,
  color: string
) {
  return {
    label: 'Actual Cards Issued',
    data: data.actualCards,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    tension: 0.3,
    fill: false,
  };
}

/**
 * Build Chart.js dataset for predicted health card issuances
 *
 * @param data - SARIMA data
 * @param color - Primary color for the line
 * @returns Chart.js dataset configuration
 */
export function buildPredictedDataset(
  data: HealthCardSARIMAData,
  color: string
) {
  return {
    label: 'Predicted Cards',
    data: data.predictedCards,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    borderDash: [5, 5], // Dashed line for predictions
    pointRadius: 3,
    pointHoverRadius: 5,
    pointStyle: 'circle',
    tension: 0.3,
    fill: false,
  };
}

/**
 * Build Chart.js dataset for confidence interval (upper/lower bounds)
 *
 * @param data - SARIMA data
 * @param lightColor - Transparent color for the fill
 * @returns Chart.js dataset configuration
 */
export function buildConfidenceIntervalDataset(
  data: HealthCardSARIMAData,
  lightColor: string
) {
  return {
    label: '95% Confidence Interval',
    data: data.upperBound.map((upper, i) => {
      const lower = data.lowerBound[i];
      if (upper === null || lower === null) return null;
      return [lower, upper];
    }),
    backgroundColor: lightColor,
    borderColor: 'transparent',
    fill: true,
    pointRadius: 0,
    showLine: false,
  };
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Convert SARIMA data to CSV format
 *
 * @param data - SARIMA data
 * @returns CSV string
 */
export function exportToCSV(data: HealthCardSARIMAData): string {
  const headers = ['Date', 'Actual Cards', 'Predicted Cards', 'Upper Bound', 'Lower Bound'];
  const rows = data.dates.map((date, i) => [
    date,
    data.actualCards[i] ?? '',
    data.predictedCards[i] ?? '',
    data.upperBound[i] ?? '',
    data.lowerBound[i] ?? '',
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Convert SARIMA data to JSON format for download
 *
 * @param data - SARIMA data
 * @returns JSON string
 */
export function exportToJSON(data: HealthCardSARIMAData): string {
  return JSON.stringify(data, null, 2);
}
