/**
 * SARIMA Model Error Measurement Metrics
 *
 * This module provides statistical functions for evaluating SARIMA (Seasonal Auto-Regressive Integrated Moving Average)
 * prediction model accuracy. Implements standard error metrics as per TO_DO_LIST.md Task 5.4.
 *
 * Metrics Implemented:
 * - MSE (Mean Squared Error): Average squared difference between actual and predicted values
 * - RMSE (Root Mean Squared Error): Square root of MSE, in same units as data
 * - R² (R-squared / Coefficient of Determination): Proportion of variance explained by model (0-1)
 * - MAE (Mean Absolute Error): Average absolute difference between actual and predicted values
 * - Confidence Intervals: 95% confidence bounds for predictions
 *
 * @module sarimaMetrics
 * @since December 28, 2025
 */

/**
 * Interface for comprehensive metrics report
 */
export interface MetricsReport {
  mse: number;
  rmse: number;
  rSquared: number;
  mae: number;
  accuracy: number; // Percentage (0-100)
  interpretation: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

/**
 * Interface for confidence interval bounds
 */
export interface ConfidenceInterval {
  lower: number[];
  upper: number[];
}

/**
 * Calculate Mean Squared Error (MSE)
 *
 * MSE = (1/n) * Σ(actual - predicted)²
 *
 * Lower values indicate better model fit. MSE heavily penalizes large errors
 * due to squaring. Always non-negative.
 *
 * @param actual - Array of actual observed values
 * @param predicted - Array of predicted values (must be same length as actual)
 * @returns Mean Squared Error
 * @throws Error if arrays are empty or different lengths
 */
export function calculateMSE(actual: number[], predicted: number[]): number {
  if (actual.length === 0 || predicted.length === 0) {
    throw new Error('Arrays cannot be empty');
  }

  if (actual.length !== predicted.length) {
    throw new Error('Actual and predicted arrays must have the same length');
  }

  const sumSquaredErrors = actual.reduce((sum, actualValue, index) => {
    const error = actualValue - predicted[index];
    return sum + (error * error);
  }, 0);

  return sumSquaredErrors / actual.length;
}

/**
 * Calculate Root Mean Squared Error (RMSE)
 *
 * RMSE = √MSE
 *
 * RMSE is in the same units as the data, making it more interpretable than MSE.
 * Lower values indicate better fit. Common benchmark: RMSE < 10% of data range is good.
 *
 * @param actual - Array of actual observed values
 * @param predicted - Array of predicted values
 * @returns Root Mean Squared Error
 */
export function calculateRMSE(actual: number[], predicted: number[]): number {
  const mse = calculateMSE(actual, predicted);
  return Math.sqrt(mse);
}

/**
 * Calculate Mean Absolute Error (MAE)
 *
 * MAE = (1/n) * Σ|actual - predicted|
 *
 * MAE is less sensitive to outliers than RMSE. It represents the average
 * magnitude of errors in the predictions, in the same units as the data.
 *
 * @param actual - Array of actual observed values
 * @param predicted - Array of predicted values
 * @returns Mean Absolute Error
 */
export function calculateMAE(actual: number[], predicted: number[]): number {
  if (actual.length === 0 || predicted.length === 0) {
    throw new Error('Arrays cannot be empty');
  }

  if (actual.length !== predicted.length) {
    throw new Error('Actual and predicted arrays must have the same length');
  }

  const sumAbsoluteErrors = actual.reduce((sum, actualValue, index) => {
    const error = Math.abs(actualValue - predicted[index]);
    return sum + error;
  }, 0);

  return sumAbsoluteErrors / actual.length;
}

/**
 * Calculate Mean Absolute Percentage Error (MAPE)
 *
 * MAPE = (100/n) * Σ(|actual - predicted| / |actual|)
 *
 * MAPE expresses accuracy as a percentage, making it very interpretable:
 * - < 10% = Excellent
 * - 10-20% = Good
 * - 20-50% = Fair
 * - > 50% = Poor
 *
 * Note: MAPE is undefined when actual values are zero. We skip those points.
 *
 * @param actual - Array of actual observed values
 * @param predicted - Array of predicted values
 * @returns MAPE as a percentage (0-100+, lower is better)
 */
export function calculateMAPE(actual: number[], predicted: number[]): number {
  if (actual.length === 0 || predicted.length === 0) {
    throw new Error('Arrays cannot be empty');
  }

  if (actual.length !== predicted.length) {
    throw new Error('Actual and predicted arrays must have the same length');
  }

  let sumPercentageErrors = 0;
  let validCount = 0;

  for (let i = 0; i < actual.length; i++) {
    // Skip zero values to avoid division by zero
    if (actual[i] !== 0) {
      const percentageError = Math.abs((actual[i] - predicted[i]) / actual[i]);
      sumPercentageErrors += percentageError;
      validCount++;
    }
  }

  // If all actual values are zero, return 0 (perfect prediction of zeros)
  if (validCount === 0) {
    return 0;
  }

  return (sumPercentageErrors / validCount) * 100;
}

/**
 * Calculate Directional Accuracy
 *
 * Measures the percentage of times the model correctly predicted the direction
 * of change (increase, decrease, or stable) compared to the previous value.
 *
 * Directional Accuracy = (Correct Predictions / Total Predictions) * 100
 *
 * Thresholds:
 * - > 70% = Good
 * - 50-70% = Fair
 * - < 50% = Poor (worse than random)
 *
 * @param actual - Array of actual observed values
 * @param predicted - Array of predicted values
 * @returns Directional accuracy as a percentage (0-100)
 */
export function calculateDirectionalAccuracy(actual: number[], predicted: number[]): number {
  if (actual.length === 0 || predicted.length === 0) {
    throw new Error('Arrays cannot be empty');
  }

  if (actual.length !== predicted.length) {
    throw new Error('Actual and predicted arrays must have the same length');
  }

  if (actual.length < 2) {
    // Need at least 2 points to calculate direction
    return 0;
  }

  let correctDirections = 0;

  for (let i = 1; i < actual.length; i++) {
    const actualDirection = Math.sign(actual[i] - actual[i - 1]);
    const predictedDirection = Math.sign(predicted[i] - predicted[i - 1]);

    if (actualDirection === predictedDirection) {
      correctDirections++;
    }
  }

  return (correctDirections / (actual.length - 1)) * 100;
}

/**
 * Calculate R-squared (Coefficient of Determination)
 *
 * R² = 1 - (SS_res / SS_tot)
 * Where:
 *   SS_res = Σ(actual - predicted)² (sum of squared residuals)
 *   SS_tot = Σ(actual - mean)² (total sum of squares)
 *
 * R² ranges from 0 to 1 (can be negative for very poor models):
 * - 1.0 = Perfect prediction
 * - 0.9-1.0 = Excellent
 * - 0.8-0.9 = Good
 * - 0.6-0.8 = Fair
 * - < 0.6 = Poor
 *
 * Represents the proportion of variance in the dependent variable
 * explained by the model.
 *
 * @param actual - Array of actual observed values
 * @param predicted - Array of predicted values
 * @returns R-squared value (0 to 1, higher is better)
 */
export function calculateRSquared(actual: number[], predicted: number[]): number {
  if (actual.length === 0 || predicted.length === 0) {
    throw new Error('Arrays cannot be empty');
  }

  if (actual.length !== predicted.length) {
    throw new Error('Actual and predicted arrays must have the same length');
  }

  // Calculate mean of actual values
  const mean = actual.reduce((sum, value) => sum + value, 0) / actual.length;

  // NEW: Check if predictions have variance (detect constant predictions)
  const predMean = predicted.reduce((sum, value) => sum + value, 0) / predicted.length;
  const predVariance = predicted.reduce((sum, value) =>
    sum + Math.pow(value - predMean, 2), 0) / predicted.length;

  if (predVariance < 0.1) {
    console.warn('[R² Warning] Predictions are near-constant (low variance)');
    console.warn(`[R²] Prediction mean: ${predMean.toFixed(2)}, variance: ${predVariance.toFixed(4)}`);
    console.warn('[R²] Constant predictions cannot capture data variance → R² ≈ 0');
    console.warn('[R²] This usually indicates unstable SARIMA parameters or insufficient data');
  }

  // Calculate sum of squared residuals (SS_res)
  const ssRes = actual.reduce((sum, actualValue, index) => {
    const residual = actualValue - predicted[index];
    return sum + (residual * residual);
  }, 0);

  // Calculate total sum of squares (SS_tot)
  const ssTot = actual.reduce((sum, actualValue) => {
    const deviation = actualValue - mean;
    return sum + (deviation * deviation);
  }, 0);

  // Handle edge case where all actual values are the same (ssTot = 0)
  if (ssTot === 0) {
    return ssRes === 0 ? 1 : 0; // Perfect fit if predictions match, otherwise no fit
  }

  const rSquared = 1 - (ssRes / ssTot);

  // Clamp to [0, 1] range (R² can be negative for very poor models, but we'll floor at 0)
  const clampedR2 = Math.max(0, Math.min(1, rSquared));

  // NEW: Warn if R² is clamped to 0 (predictions worse than mean baseline)
  if (rSquared < 0 && clampedR2 === 0) {
    console.warn('[R² Warning] Predictions are worse than mean baseline (negative R² clamped to 0)');
    console.warn(`[R²] Raw R²: ${rSquared.toFixed(3)} → Clamped to 0.00`);
  }

  return clampedR2;
}

/**
 * Calculate 95% Confidence Interval bounds
 *
 * CI = predicted ± (z * σ)
 * Where:
 *   z = 1.96 (z-score for 95% confidence level)
 *   σ = √MSE (standard error estimate)
 *
 * The confidence interval gives a range where we expect the true value
 * to fall with 95% probability. Wider intervals indicate more uncertainty.
 *
 * @param predictions - Array of predicted values
 * @param mse - Mean Squared Error from model
 * @returns Object containing lower and upper confidence bounds
 */
export function calculateConfidenceInterval(
  predictions: number[],
  mse: number
): ConfidenceInterval {
  if (predictions.length === 0) {
    throw new Error('Predictions array cannot be empty');
  }

  const standardError = Math.sqrt(mse);
  const zScore = 1.96; // 95% confidence level
  const marginOfError = zScore * standardError;

  const lower = predictions.map(pred => Math.max(0, pred - marginOfError)); // Floor at 0 (can't have negative cases)
  const upper = predictions.map(pred => pred + marginOfError);

  return { lower, upper };
}

/**
 * Interpret R-squared value into human-readable category
 *
 * @param rSquared - R-squared value (0 to 1)
 * @returns Interpretation category
 */
export function interpretRSquared(rSquared: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
  if (rSquared >= 0.9) return 'Excellent';
  if (rSquared >= 0.8) return 'Good';
  if (rSquared >= 0.6) return 'Fair';
  return 'Poor';
}

/**
 * Generate comprehensive metrics report
 *
 * Calculates all error metrics and provides an overall model accuracy assessment.
 * This is the primary function to use for displaying model performance.
 *
 * @param actual - Array of actual observed values
 * @param predicted - Array of predicted values
 * @returns Complete metrics report with interpretation
 *
 * @example
 * const actual = [10, 15, 20, 25, 30];
 * const predicted = [12, 14, 21, 24, 31];
 * const report = generateMetricsReport(actual, predicted);
 * console.log(`Model Accuracy: ${report.accuracy.toFixed(1)}% (${report.interpretation})`);
 * console.log(`RMSE: ${report.rmse.toFixed(2)}, R²: ${report.rSquared.toFixed(3)}`);
 */
export function generateMetricsReport(
  actual: number[],
  predicted: number[]
): MetricsReport {
  const mse = calculateMSE(actual, predicted);
  const rmse = calculateRMSE(actual, predicted);
  const rSquared = calculateRSquared(actual, predicted);
  const mae = calculateMAE(actual, predicted);

  // Convert R² to percentage for user-friendly display
  const accuracy = rSquared * 100;

  const interpretation = interpretRSquared(rSquared);

  return {
    mse,
    rmse,
    rSquared,
    mae,
    accuracy,
    interpretation,
  };
}

/**
 * Validate prediction data for metric calculations
 *
 * Checks if arrays are valid for metric calculations and returns
 * a user-friendly error message if not.
 *
 * @param actual - Array of actual values
 * @param predicted - Array of predicted values
 * @returns Validation result with success flag and optional error message
 */
export function validatePredictionData(
  actual: number[],
  predicted: number[]
): { valid: boolean; error?: string } {
  if (!actual || !predicted) {
    return { valid: false, error: 'Missing data arrays' };
  }

  if (actual.length === 0 || predicted.length === 0) {
    return { valid: false, error: 'Arrays cannot be empty' };
  }

  if (actual.length !== predicted.length) {
    return {
      valid: false,
      error: `Array length mismatch: actual (${actual.length}) vs predicted (${predicted.length})`,
    };
  }

  if (actual.length < 2) {
    return {
      valid: false,
      error: 'Need at least 2 data points for meaningful metrics',
    };
  }

  return { valid: true };
}

/**
 * Format metric value for display
 *
 * @param value - Metric value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatMetric(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Get color coding for metric display based on R² value
 *
 * @param rSquared - R-squared value
 * @returns Tailwind CSS color class
 */
export function getMetricColor(rSquared: number): string {
  if (rSquared >= 0.9) return 'text-green-600'; // Excellent
  if (rSquared >= 0.8) return 'text-blue-600'; // Good
  if (rSquared >= 0.6) return 'text-yellow-600'; // Fair
  return 'text-red-600'; // Poor
}

/**
 * Get background color for metric card based on R² value
 *
 * @param rSquared - R-squared value
 * @returns Tailwind CSS background color classes
 */
export function getMetricBackgroundColor(rSquared: number): string {
  if (rSquared >= 0.9) return 'bg-green-50 border-green-200'; // Excellent
  if (rSquared >= 0.8) return 'bg-blue-50 border-blue-200'; // Good
  if (rSquared >= 0.6) return 'bg-yellow-50 border-yellow-200'; // Fair
  return 'bg-red-50 border-red-200'; // Poor
}

/**
 * Interpret MAPE value into human-readable category
 *
 * Industry-standard thresholds for disease surveillance:
 * - < 10% = Excellent (dengue studies target MAPE < 10%)
 * - 10-20% = Good
 * - 20-50% = Fair (acceptable for disease surveillance)
 * - > 50% = Poor
 *
 * @param mape - MAPE value as percentage (0-100+)
 * @returns Interpretation category
 */
export function interpretMAPE(mape: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
  if (mape < 10) return 'Excellent';
  if (mape < 20) return 'Good';
  if (mape < 50) return 'Fair';
  return 'Poor';
}

/**
 * Get color coding for MAPE display
 *
 * @param mape - MAPE value as percentage
 * @returns Tailwind CSS color class
 */
export function getMAPEColor(mape: number): string {
  if (mape < 10) return 'text-green-600'; // Excellent
  if (mape < 20) return 'text-blue-600'; // Good
  if (mape < 50) return 'text-yellow-600'; // Fair
  return 'text-red-600'; // Poor
}

/**
 * Get background color for MAPE metric card
 *
 * @param mape - MAPE value as percentage
 * @returns Tailwind CSS background color classes
 */
export function getMAPEBackgroundColor(mape: number): string {
  if (mape < 10) return 'bg-green-50 border-green-200'; // Excellent
  if (mape < 20) return 'bg-blue-50 border-blue-200'; // Good
  if (mape < 50) return 'bg-yellow-50 border-yellow-200'; // Fair
  return 'bg-red-50 border-red-200'; // Poor
}

/**
 * Calculate data variance
 *
 * Used to determine if MAPE or R² is more appropriate for evaluation.
 * Low variance data (< 5.0) should use MAPE instead of R².
 *
 * @param data - Array of numerical values
 * @returns Variance value
 */
export function calculateVariance(data: number[]): number {
  if (data.length === 0) return 0;

  const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;

  return variance;
}
