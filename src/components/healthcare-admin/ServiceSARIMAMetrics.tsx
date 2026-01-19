'use client';

/**
 * Service SARIMA Metrics Component
 *
 * Displays model accuracy metrics for service appointment SARIMA predictions:
 * - MSE (Mean Squared Error)
 * - RMSE (Root Mean Squared Error)
 * - MAE (Mean Absolute Error)
 * - R² (Coefficient of Determination)
 * - Confidence Level
 * - Overall Interpretation
 *
 * Used for HIV (Service 16), Pregnancy (Service 17), and other service forecasts
 */

import React from 'react';
import { CheckCircle2, AlertTriangle, Info, TrendingUp, Database } from 'lucide-react';

interface ServiceModelAccuracy {
  r_squared: number;
  rmse: number;
  mae: number;
  mse: number;
  interpretation?: 'excellent' | 'good' | 'fair' | 'poor';
  confidence_level?: number;
}

interface ServiceSARIMAMetricsProps {
  metrics: ServiceModelAccuracy | null;
  showDetails?: boolean;
  dataPointsCount?: number; // Optional: historical data points count
  dataQuality?: 'high' | 'moderate' | 'insufficient'; // Optional: overall data quality assessment
}

export default function ServiceSARIMAMetrics({
  metrics,
  showDetails = true,
  dataPointsCount,
  dataQuality,
}: ServiceSARIMAMetricsProps) {
  // Component will not render if metrics is null (handled by parent)
  // This ensures we only display when real metrics exist
  if (!metrics) {
    return null;
  }

  const displayMetrics = metrics;

  // Calculate interpretation if not provided
  const interpretation = displayMetrics.interpretation || getInterpretationFromRSquared(displayMetrics.r_squared);
  const confidenceLevel = displayMetrics.confidence_level || 0.95;

  function getInterpretationFromRSquared(r_squared: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (r_squared >= 0.9) return 'excellent';
    if (r_squared >= 0.7) return 'good';
    if (r_squared >= 0.5) return 'fair';
    return 'poor';
  }

  // Determine icon and color based on interpretation
  const getInterpretationConfig = () => {
    switch (interpretation) {
      case 'excellent':
        return {
          icon: CheckCircle2,
          color: 'green',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-900',
          iconColor: 'text-green-600',
          label: 'Excellent',
          description: 'The model is highly accurate and reliable for predictions.',
        };
      case 'good':
        return {
          icon: CheckCircle2,
          color: 'blue',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-900',
          iconColor: 'text-blue-600',
          label: 'Good',
          description: 'The model performs well and provides reliable predictions.',
        };
      case 'fair':
        return {
          icon: AlertTriangle,
          color: 'yellow',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-900',
          iconColor: 'text-yellow-600',
          label: 'Fair',
          description:
            'The model is acceptable but predictions should be used with caution.',
        };
      case 'poor':
        return {
          icon: AlertTriangle,
          color: 'red',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-900',
          iconColor: 'text-red-600',
          label: 'Poor',
          description:
            'The model accuracy is low. Predictions should not be relied upon without verification.',
        };
      default:
        return {
          icon: Info,
          color: 'gray',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-900',
          iconColor: 'text-gray-600',
          label: 'Unknown',
          description: 'Model accuracy interpretation unavailable.',
        };
    }
  };

  const config = getInterpretationConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      {/* Overall Interpretation */}
      <div className={`p-6 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-start gap-3">
          <Icon className={`h-6 w-6 ${config.iconColor} mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <h4 className={`font-bold text-lg ${config.textColor} mb-1`}>
              Model Accuracy: {config.label}
            </h4>
            <p className={`text-sm ${config.textColor} opacity-90 mb-3`}>
              {config.description}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white bg-opacity-50 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    config.color === 'green' ? 'bg-green-600' :
                    config.color === 'blue' ? 'bg-blue-600' :
                    config.color === 'yellow' ? 'bg-yellow-600' :
                    config.color === 'red' ? 'bg-red-600' :
                    'bg-gray-600'
                  }`}
                  style={{ width: `${confidenceLevel * 100}%` }}
                ></div>
              </div>
              <span className={`text-sm font-semibold ${config.textColor}`}>
                {Math.round(confidenceLevel * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Quality Summary (if available) */}
      {dataPointsCount !== undefined && (
        <div className={`p-4 rounded-lg border ${
          (dataQuality === 'insufficient' || (dataPointsCount < 30))
            ? 'bg-yellow-50 border-yellow-200'
            : dataQuality === 'moderate'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            <Database className={`h-5 w-5 ${
              (dataQuality === 'insufficient' || (dataPointsCount < 30))
                ? 'text-yellow-600'
                : dataQuality === 'moderate'
                ? 'text-blue-600'
                : 'text-green-600'
            }`} />
            <div className="flex-1">
              <h5 className={`font-semibold text-sm ${
                (dataQuality === 'insufficient' || (dataPointsCount < 30))
                  ? 'text-yellow-900'
                  : dataQuality === 'moderate'
                  ? 'text-blue-900'
                  : 'text-green-900'
              }`}>
                Training Data: {dataPointsCount} historical data points
              </h5>
              <p className={`text-xs mt-1 ${
                (dataQuality === 'insufficient' || (dataPointsCount < 30))
                  ? 'text-yellow-800'
                  : dataQuality === 'moderate'
                  ? 'text-blue-800'
                  : 'text-green-800'
              }`}>
                {dataPointsCount < 30
                  ? `Limited data available. SARIMA models perform best with 30-50+ data points. Predictions will improve as more appointments are booked.`
                  : dataPointsCount < 50
                  ? `Moderate data availability. Model accuracy should be good.`
                  : `Sufficient data for reliable predictions.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* R² (Coefficient of Determination) */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-gray-600 uppercase">
                R² Score
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {displayMetrics.r_squared.toFixed(3)}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {displayMetrics.r_squared >= 0.8
                ? 'Strong fit'
                : displayMetrics.r_squared >= 0.6
                  ? 'Moderate fit'
                  : 'Weak fit'}
            </p>
          </div>

          {/* RMSE (Root Mean Squared Error) */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-600 uppercase">RMSE</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {displayMetrics.rmse.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Avg. prediction error</p>
          </div>

          {/* MAE (Mean Absolute Error) */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-gray-600 uppercase">MAE</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {displayMetrics.mae.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Mean absolute error</p>
          </div>

          {/* MSE (Mean Squared Error) */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-gray-600 uppercase">MSE</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {displayMetrics.mse.toFixed(2)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Mean squared error</p>
          </div>
        </div>
      )}

      {/* Interpretation Guide */}
      {showDetails && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h5 className="font-semibold text-gray-900 mb-3 text-sm">
            Understanding Model Metrics
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
            <div>
              <strong className="text-gray-900">R² (R-Squared):</strong>
              <p className="mt-1">
                Measures how well predictions match actual values. Ranges from 0-1, where 1
                is perfect fit.
              </p>
              <ul className="list-disc list-inside mt-1 ml-2 space-y-0.5">
                <li>0.9-1.0: Excellent</li>
                <li>0.7-0.9: Good</li>
                <li>0.5-0.7: Fair</li>
                <li>&lt;0.5: Poor</li>
              </ul>
            </div>
            <div>
              <strong className="text-gray-900">RMSE & MAE:</strong>
              <p className="mt-1">
                Measure average prediction error in same units as data (number of appointments).
                Lower is better.
              </p>
              <ul className="list-disc list-inside mt-1 ml-2 space-y-0.5">
                <li>&lt;1.0: Excellent precision</li>
                <li>1.0-2.0: Good precision</li>
                <li>2.0-3.0: Fair precision</li>
                <li>&gt;3.0: Poor precision</li>
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
