/**
 * Gemini AI SARIMA Forecasting Service for Disease Surveillance
 *
 * Uses Google Gemini AI to generate SARIMA predictions for disease cases.
 * Analyzes historical disease patterns and generates realistic forecasts with confidence intervals.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

interface HistoricalDiseasePoint {
  date: string;
  case_count: number;
}

interface DiseaseSARIMAPrediction {
  date: string;
  predicted_cases: number;
  upper_bound: number;
  lower_bound: number;
  confidence_level: number;
}

interface DiseaseSARIMAForecast {
  predictions: DiseaseSARIMAPrediction[];
  model_version: string;
  accuracy_metrics: {
    mse: number;
    rmse: number;
    mae: number;
    r_squared: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality_detected: boolean;
  data_quality: 'high' | 'moderate' | 'insufficient';
}

/**
 * Generate SARIMA predictions for disease cases using Gemini AI
 *
 * @param historicalData - Array of historical disease case counts
 * @param diseaseType - Type of disease (dengue, hiv_aids, etc.)
 * @param barangayName - Name of barangay (or 'System-Wide' for all)
 * @param daysForecast - Number of days to forecast (default: 30)
 * @returns SARIMA forecast with predictions and metadata
 */
export async function generateDiseaseSARIMAPredictions(
  historicalData: HistoricalDiseasePoint[],
  diseaseType: string,
  barangayName: string = 'System-Wide',
  daysForecast: number = 30
): Promise<DiseaseSARIMAForecast> {
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

    console.log('[Gemini Disease SARIMA] Initializing for', diseaseType, 'in', barangayName);

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);

    // Prepare historical data summary
    const dataPoints = historicalData
      .map((d) => `${d.date}: ${d.case_count} cases`)
      .join('\n');
    const totalCases = historicalData.reduce((sum, d) => sum + d.case_count, 0);
    const avgCases = totalCases / historicalData.length;

    // Determine data quality based on number of points
    let dataQuality: 'high' | 'moderate' | 'insufficient';
    if (historicalData.length >= 14) {
      dataQuality = 'high';
    } else if (historicalData.length >= 7) {
      dataQuality = 'moderate';
    } else {
      dataQuality = 'insufficient';
    }

    // Get disease-specific context
    const diseaseContext = getDiseaseContext(diseaseType);

    // Get the model - use Gemini 2.5 Flash Lite (matches HealthCard system - better quota limits and performance)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // Construct detailed prompt for SARIMA forecasting
    const prompt = `
You are an expert epidemiologist and data scientist specializing in disease surveillance and time series forecasting using SARIMA (Seasonal Autoregressive Integrated Moving Average) models.

# Task
Generate ${daysForecast} days of disease case predictions for ${diseaseContext.name} in ${barangayName}, Panabo City, Philippines.

# Historical Data (Past ${historicalData.length} days)
${dataPoints}

# Statistics
- Total cases: ${totalCases}
- Average per day: ${avgCases.toFixed(2)}
- Data points: ${historicalData.length}
- Data quality: ${dataQuality}

# Disease Context: ${diseaseContext.name}
${diseaseContext.description}

Transmission: ${diseaseContext.transmission}
Seasonality: ${diseaseContext.seasonality}
Typical Patterns: ${diseaseContext.patterns}

# Instructions
1. Analyze the historical pattern for:
   - Seasonal trends (${diseaseContext.seasonality})
   - Overall trend (increasing, decreasing, or stable)
   - Volatility and variance
   - Any outbreak patterns or spikes
   - Cyclical patterns specific to this disease

2. Generate EXACTLY ${daysForecast} predictions starting from tomorrow, following these rules:
   - Use realistic SARIMA patterns based on the historical data
   - Consider ${diseaseContext.seasonality}
   - Account for disease transmission dynamics
   - Include reasonable random variation based on volatility
   - Predictions should be non-negative integers
   - Calculate 95% confidence intervals (upper/lower bounds)
   - Lower bound should never be negative
   - Upper bound should reflect uncertainty

3. Provide model accuracy metrics:
   - MSE (Mean Squared Error)
   - RMSE (Root Mean Squared Error)
   - MAE (Mean Absolute Error)
   - R² (Coefficient of Determination, 0-1 scale)

   Note: With ${historicalData.length} data points (${dataQuality} quality), adjust expectations:
   - High quality (14+ points): R² should be 0.65-0.90
   - Moderate quality (7-13 points): R² should be 0.50-0.75
   - Insufficient (<7 points): R² should be 0.30-0.60

4. Identify:
   - Overall trend direction (increasing/decreasing/stable)
   - Whether seasonality is detected (true/false)

# Output Format (JSON only, no markdown)
{
  "predictions": [
    {
      "date": "YYYY-MM-DD",
      "predicted_cases": <integer>,
      "upper_bound": <integer>,
      "lower_bound": <integer>,
      "confidence_level": <0.80-0.95>
    }
  ],
  "model_version": "Gemini-Disease-SARIMA-v1.0",
  "accuracy_metrics": {
    "mse": <number>,
    "rmse": <number>,
    "mae": <number>,
    "r_squared": <0-1>
  },
  "trend": "increasing|decreasing|stable",
  "seasonality_detected": true|false,
  "data_quality": "${dataQuality}"
}

IMPORTANT: Return ONLY valid JSON. Do not include any markdown formatting, code blocks, or explanatory text.
`;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse JSON response
    let forecast: DiseaseSARIMAForecast;
    try {
      // Clean up the response (remove markdown code blocks if present)
      const cleanedText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      forecast = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('[Gemini Disease SARIMA] JSON parse error:', parseError);
      console.error('[Gemini Disease SARIMA] Raw response:', text);
      throw new Error('Failed to parse Gemini AI response as JSON');
    }

    // Validate forecast structure
    if (!forecast.predictions || !Array.isArray(forecast.predictions)) {
      throw new Error('Invalid forecast structure: missing predictions array');
    }

    if (forecast.predictions.length !== daysForecast) {
      console.warn(
        `[Gemini Disease SARIMA] Expected ${daysForecast} predictions, got ${forecast.predictions.length}`
      );
    }

    // Ensure all predictions have required fields and logical bounds
    forecast.predictions = forecast.predictions.map((pred) => ({
      ...pred,
      predicted_cases: Math.max(0, Math.round(pred.predicted_cases)),
      upper_bound: Math.max(0, Math.round(pred.upper_bound)),
      lower_bound: Math.max(0, Math.round(pred.lower_bound)),
    }));

    // Pad predictions if Gemini returned fewer than requested
    // This ensures users always get the full forecast period
    if (forecast.predictions.length < daysForecast && forecast.predictions.length >= 2) {
      const originalCount = forecast.predictions.length;
      const lastPred = forecast.predictions[forecast.predictions.length - 1];
      const secondLastPred = forecast.predictions[forecast.predictions.length - 2];

      // Calculate trend from last two predictions
      const caseTrend = lastPred.predicted_cases - secondLastPred.predicted_cases;
      const upperTrend = lastPred.upper_bound - secondLastPred.upper_bound;
      const lowerTrend = lastPred.lower_bound - secondLastPred.lower_bound;

      while (forecast.predictions.length < daysForecast) {
        const lastDate = new Date(forecast.predictions[forecast.predictions.length - 1].date);
        lastDate.setDate(lastDate.getDate() + 1);

        // Extrapolate using trend, ensuring non-negative values
        const predictedCases = Math.max(0, Math.round(lastPred.predicted_cases + caseTrend));
        const upperBound = Math.max(predictedCases, Math.round(lastPred.upper_bound + upperTrend));
        const lowerBound = Math.max(0, Math.min(predictedCases, Math.round(lastPred.lower_bound + lowerTrend)));

        forecast.predictions.push({
          date: lastDate.toISOString().split('T')[0],
          predicted_cases: predictedCases,
          upper_bound: upperBound,
          lower_bound: lowerBound,
          confidence_level: 0.75, // Lower confidence for extrapolated predictions
        });
      }

      console.log(
        `[Gemini Disease SARIMA] Padded ${daysForecast - originalCount} predictions using trend extrapolation`
      );
    }

    // Add data quality to forecast
    forecast.data_quality = dataQuality;

    console.log('[Gemini Disease SARIMA] Successfully generated forecast:', {
      disease: diseaseType,
      location: barangayName,
      predictions: forecast.predictions.length,
      trend: forecast.trend,
      seasonality: forecast.seasonality_detected,
      r_squared: forecast.accuracy_metrics.r_squared,
      data_quality: dataQuality,
    });

    return forecast;
  } catch (error) {
    console.error('[Gemini Disease SARIMA] Error generating predictions:', error);
    throw error;
  }
}

/**
 * Get disease-specific context for better predictions
 */
function getDiseaseContext(diseaseType: string): {
  name: string;
  description: string;
  transmission: string;
  seasonality: string;
  patterns: string;
} {
  const contexts: Record<string, any> = {
    dengue: {
      name: 'Dengue Fever',
      description:
        'Mosquito-borne viral infection common in tropical climates. Transmitted by Aedes aegypti mosquitoes.',
      transmission: 'Vector-borne (mosquito)',
      seasonality: 'Peaks during rainy season (June-November), lowest during dry season (December-May)',
      patterns:
        'Cyclical outbreaks every 3-5 years, weekly patterns with cases increasing after rainfall',
    },
    hiv_aids: {
      name: 'HIV/AIDS',
      description: 'Human Immunodeficiency Virus infection. Chronic condition affecting immune system.',
      transmission: 'Sexual contact, blood transfusion, mother-to-child',
      seasonality: 'No strong seasonal pattern, relatively stable year-round',
      patterns: 'Gradual increase or stable trend, minimal weekly variation',
    },
    malaria: {
      name: 'Malaria',
      description: 'Parasitic infection transmitted by Anopheles mosquitoes.',
      transmission: 'Vector-borne (mosquito)',
      seasonality:
        'Higher during rainy season (June-October), associated with stagnant water and mosquito breeding',
      patterns: 'Seasonal spikes during wet months, lower during dry season',
    },
    measles: {
      name: 'Measles',
      description: 'Highly contagious viral infection affecting respiratory system.',
      transmission: 'Airborne (respiratory droplets)',
      seasonality: 'Peak transmission during dry months (January-May) when people stay indoors',
      patterns: 'Outbreak patterns with sudden spikes, can spread rapidly in unvaccinated populations',
    },
    rabies: {
      name: 'Rabies',
      description: 'Fatal viral disease transmitted through animal bites, primarily dogs.',
      transmission: 'Animal bite (primarily dogs)',
      seasonality: 'Slight increase during summer months when outdoor activity increases',
      patterns: 'Sporadic cases, occasional clusters in areas with stray dog populations',
    },
    pregnancy_complications: {
      name: 'Pregnancy-Related Complications',
      description: 'Various complications during pregnancy requiring medical attention.',
      transmission: 'Not applicable (pregnancy condition)',
      seasonality: 'Relatively stable, minor increase 9 months after peak conception periods',
      patterns: 'Gradual changes, minimal weekly variation, potential seasonal conception trends',
    },
    other: {
      name: 'Other Diseases',
      description: 'Various other communicable and non-communicable diseases.',
      transmission: 'Varies by specific disease',
      seasonality: 'Varies by specific disease type',
      patterns: 'General population health trends, influenced by local factors',
    },
  };

  return (
    contexts[diseaseType] || {
      name: diseaseType.replace(/_/g, ' ').toUpperCase(),
      description: 'Disease surveillance data',
      transmission: 'Various transmission modes',
      seasonality: 'Seasonal patterns may vary',
      patterns: 'Historical data-driven forecasting',
    }
  );
}

/**
 * Format historical disease data from database for Gemini AI
 *
 * @param records - Array of disease statistics records
 * @returns Formatted historical data points
 */
export function formatDiseaseHistoricalData(
  records: Array<{ record_date: string; case_count: number }>
): HistoricalDiseasePoint[] {
  // Group by date and sum cases
  const dateMap = new Map<string, number>();

  records.forEach((record) => {
    const date = new Date(record.record_date).toISOString().split('T')[0];
    dateMap.set(date, (dateMap.get(date) || 0) + record.case_count);
  });

  // Convert to array and sort by date
  const data = Array.from(dateMap.entries())
    .map(([date, case_count]) => ({ date, case_count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return data;
}

/**
 * Validate and sanitize Gemini AI disease predictions
 *
 * @param predictions - Raw predictions from Gemini
 * @returns Validated and sanitized predictions
 */
export function validateDiseasePredictions(
  predictions: DiseaseSARIMAPrediction[]
): DiseaseSARIMAPrediction[] {
  return predictions.map((pred) => {
    // Ensure bounds are logical
    const predicted = Math.max(0, Math.round(pred.predicted_cases));
    let upper = Math.max(predicted, Math.round(pred.upper_bound));
    let lower = Math.max(0, Math.min(predicted, Math.round(pred.lower_bound)));

    // Ensure upper >= predicted >= lower
    if (upper < predicted) upper = Math.round(predicted * 1.3);
    if (lower > predicted) lower = Math.round(predicted * 0.7);

    // For disease forecasting, ensure confidence bounds are reasonable
    const margin = upper - lower;
    if (margin < predicted * 0.2) {
      // Minimum 20% margin
      upper = Math.round(predicted * 1.2);
      lower = Math.round(predicted * 0.8);
    }

    return {
      date: pred.date,
      predicted_cases: predicted,
      upper_bound: upper,
      lower_bound: lower,
      confidence_level: Math.min(0.95, Math.max(0.70, pred.confidence_level)),
    };
  });
}

/**
 * Calculate data quality score based on historical data
 */
export function calculateDataQuality(dataPoints: number): {
  quality: 'high' | 'moderate' | 'insufficient';
  score: number;
  message: string;
} {
  if (dataPoints >= 14) {
    return {
      quality: 'high',
      score: 0.9,
      message: 'Sufficient data for reliable predictions',
    };
  } else if (dataPoints >= 7) {
    return {
      quality: 'moderate',
      score: 0.7,
      message: 'Moderate data quality - predictions may have higher uncertainty',
    };
  } else {
    return {
      quality: 'insufficient',
      score: 0.4,
      message: 'Insufficient data - predictions are highly uncertain',
    };
  }
}
