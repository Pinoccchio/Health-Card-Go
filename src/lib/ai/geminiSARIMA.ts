/**
 * Gemini AI SARIMA Forecasting Service
 *
 * Uses Google Gemini AI to generate SARIMA predictions for health card issuance.
 * Analyzes historical data patterns and generates realistic forecasts with confidence intervals.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { HealthCardType } from '@/types/healthcard';

interface HistoricalDataPoint {
  date: string;
  cards_issued: number;
}

interface SARIMAPrediction {
  date: string;
  predicted_cards: number;
  upper_bound: number;
  lower_bound: number;
  confidence_level: number;
}

interface SARIMAForecast {
  predictions: SARIMAPrediction[];
  model_version: string;
  accuracy_metrics: {
    mse: number;
    rmse: number;
    mae: number;
    r_squared: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality_detected: boolean;
}

/**
 * Generate SARIMA predictions using Gemini AI
 *
 * @param historicalData - Array of historical health card issuances
 * @param healthcardType - Type of health card (food_handler or non_food)
 * @param daysForecast - Number of days to forecast (default: 30)
 * @returns SARIMA forecast with predictions and metadata
 */
export async function generateSARIMAPredictions(
  historicalData: HistoricalDataPoint[],
  healthcardType: HealthCardType,
  daysForecast: number = 30
): Promise<SARIMAForecast> {
  try {
    // Validate input
    if (!historicalData || historicalData.length < 7) {
      throw new Error('Insufficient historical data. At least 7 data points required.');
    }

    // Validate API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable not set');
    }

    console.log('[Gemini SARIMA] Initializing with API key length:', apiKey.length);

    // Initialize Gemini AI (do this inside the function to ensure env vars are loaded)
    const genAI = new GoogleGenerativeAI(apiKey);

    // Prepare historical data summary
    const dataPoints = historicalData.map((d) => `${d.date}: ${d.cards_issued} cards`).join('\n');
    const totalCards = historicalData.reduce((sum, d) => sum + d.cards_issued, 0);
    const avgCards = totalCards / historicalData.length;

    // Get the model - use Gemini 2.5 Flash-Lite (fastest and most cost-effective)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Construct detailed prompt for SARIMA forecasting
    const prompt = `
You are an expert data scientist specializing in time series forecasting using SARIMA (Seasonal Autoregressive Integrated Moving Average) models.

# Task
Generate ${daysForecast} days of health card issuance predictions for a ${healthcardType === 'food_handler' ? 'Food Handler' : 'Non-Food Handler'} health card service.

# Historical Data (Past ${historicalData.length} days)
${dataPoints}

# Statistics
- Total cards issued: ${totalCards}
- Average per day: ${avgCards.toFixed(2)}
- Data points: ${historicalData.length}

# Instructions
1. Analyze the historical pattern for:
   - Weekly seasonality (lower on weekends, higher on Mondays/Fridays)
   - Overall trend (increasing, decreasing, or stable)
   - Volatility and variance
   - Any cyclical patterns

2. Generate EXACTLY ${daysForecast} predictions starting from tomorrow, following these rules:
   - Use realistic SARIMA patterns based on the historical data
   - Weekends should have 30-50% lower demand
   - Mondays typically 20-40% higher than average
   - Include reasonable random variation (±20%)
   - Predictions should be non-negative integers
   - Calculate 95% confidence intervals (upper/lower bounds)

3. Provide model accuracy metrics based on the data quality:
   - MSE (Mean Squared Error)
   - RMSE (Root Mean Squared Error)
   - MAE (Mean Absolute Error)
   - R² (Coefficient of Determination, 0-1 scale)

4. Identify:
   - Overall trend direction (increasing/decreasing/stable)
   - Whether seasonality is detected (true/false)

# Output Format (JSON only, no markdown)
{
  "predictions": [
    {
      "date": "YYYY-MM-DD",
      "predicted_cards": <integer>,
      "upper_bound": <integer>,
      "lower_bound": <integer>,
      "confidence_level": <0.80-0.95>
    }
  ],
  "model_version": "Gemini-SARIMA-v1.0",
  "accuracy_metrics": {
    "mse": <number>,
    "rmse": <number>,
    "mae": <number>,
    "r_squared": <0-1>
  },
  "trend": "increasing|decreasing|stable",
  "seasonality_detected": true|false
}

IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text.
`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON response
    let forecast: SARIMAForecast;
    try {
      // Clean up the response (remove markdown code blocks if present)
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      forecast = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[Gemini SARIMA] JSON parse error:', parseError);
      console.error('[Gemini SARIMA] Raw response:', text);
      throw new Error('Failed to parse Gemini AI response as JSON');
    }

    // Validate forecast structure
    if (!forecast.predictions || !Array.isArray(forecast.predictions)) {
      throw new Error('Invalid forecast structure: missing predictions array');
    }

    if (forecast.predictions.length !== daysForecast) {
      console.warn(
        `[Gemini SARIMA] Expected ${daysForecast} predictions, got ${forecast.predictions.length}`
      );
    }

    // Ensure all predictions have required fields
    forecast.predictions = forecast.predictions.map((pred) => ({
      ...pred,
      predicted_cards: Math.max(0, Math.round(pred.predicted_cards)),
      upper_bound: Math.max(0, Math.round(pred.upper_bound)),
      lower_bound: Math.max(0, Math.round(pred.lower_bound)),
    }));

    console.log('[Gemini SARIMA] Successfully generated forecast:', {
      predictions: forecast.predictions.length,
      trend: forecast.trend,
      seasonality: forecast.seasonality_detected,
      r_squared: forecast.accuracy_metrics.r_squared,
    });

    return forecast;
  } catch (error) {
    console.error('[Gemini SARIMA] Error generating predictions:', error);
    throw error;
  }
}

/**
 * Format historical data from database for Gemini AI
 *
 * @param appointments - Array of completed appointments
 * @returns Formatted historical data points
 */
export function formatHistoricalData(
  appointments: Array<{ completed_at: string }>
): HistoricalDataPoint[] {
  // Group by date and count
  const dateMap = new Map<string, number>();

  appointments.forEach((appointment) => {
    const date = new Date(appointment.completed_at).toISOString().split('T')[0];
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  });

  // Convert to array and sort by date
  const data = Array.from(dateMap.entries())
    .map(([date, cards_issued]) => ({ date, cards_issued }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return data;
}

/**
 * Validate and sanitize Gemini AI predictions
 *
 * @param predictions - Raw predictions from Gemini
 * @returns Validated and sanitized predictions
 */
export function validatePredictions(
  predictions: SARIMAPrediction[]
): SARIMAPrediction[] {
  return predictions.map((pred) => {
    // Ensure bounds are logical
    const predicted = Math.max(0, Math.round(pred.predicted_cards));
    let upper = Math.max(predicted, Math.round(pred.upper_bound));
    let lower = Math.max(0, Math.min(predicted, Math.round(pred.lower_bound)));

    // Ensure upper >= predicted >= lower
    if (upper < predicted) upper = Math.round(predicted * 1.2);
    if (lower > predicted) lower = Math.round(predicted * 0.8);

    return {
      date: pred.date,
      predicted_cards: predicted,
      upper_bound: upper,
      lower_bound: lower,
      confidence_level: Math.min(0.95, Math.max(0.70, pred.confidence_level)),
    };
  });
}
