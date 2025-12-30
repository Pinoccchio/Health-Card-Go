'use client';

/**
 * HealthCard SARIMA Metrics Component
 *
 * Displays model accuracy metrics for SARIMA predictions:
 * - MSE (Mean Squared Error)
 * - RMSE (Root Mean Squared Error)
 * - MAE (Mean Absolute Error)
 * - R² (Coefficient of Determination)
 * - Confidence Level
 * - Overall Interpretation
 */

import React from 'react';
import { ModelAccuracy } from '@/types/healthcard';
import { CheckCircle2, AlertTriangle, Info, TrendingUp } from 'lucide-react';

interface HealthCardSARIMAMetricsProps {
  metrics: ModelAccuracy | null;
  showDetails?: boolean;
}

export default function HealthCardSARIMAMetrics({
  metrics,
  showDetails = true,
}: HealthCardSARIMAMetricsProps) {
  // Component will not render if metrics is null (handled by parent)
  // This ensures we only display when real metrics exist
  if (!metrics) {
    return null;
  }

  const displayMetrics = metrics;

  // Determine icon and color based on interpretation
  const getInterpretationConfig = () => {
    switch (displayMetrics.interpretation) {
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
                  style={{ width: `${displayMetrics.confidence_level * 100}%` }}
                ></div>
              </div>
              <span className={`text-sm font-semibold ${config.textColor}`}>
                {Math.round(displayMetrics.confidence_level * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

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
                Measure average prediction error in same units as data (number of cards).
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
