'use client';

/**
 * Disease SARIMA Prediction Chart Component
 *
 * Displays historical disease cases and future predictions using SARIMA (Seasonal AutoRegressive
 * Integrated Moving Average) time series forecasting with 95% confidence intervals.
 *
 * CONFIDENCE INTERVALS & MARGIN OF ERROR:
 * -----------------------------------------
 * The shaded blue area around predictions represents the 95% confidence interval, meaning:
 * - We are 95% confident that actual future cases will fall within this range
 * - Wider intervals indicate higher uncertainty in predictions (volatile historical patterns)
 * - Narrower intervals indicate more stable and reliable predictions
 *
 * Margin of Error Calculation:
 * - Margin = (Upper Bound - Lower Bound) / 2
 * - Example: If Upper=50, Lower=30, then Margin = ±10 cases
 *
 * STATISTICAL METRICS EXPLAINED:
 * --------------------------------
 * The chart includes key accuracy metrics:
 *
 * R² (Coefficient of Determination):
 * - Range: 0.0 to 1.0 (higher is better)
 * - Measures how well predictions match actual values
 * - 0.8+ = Excellent, 0.6-0.8 = Good, <0.6 = Needs improvement
 *
 * RMSE (Root Mean Squared Error):
 * - Average prediction error in same units as data (cases)
 * - Penalizes larger errors more heavily
 * - Lower values indicate better accuracy
 *
 * MAE (Mean Absolute Error):
 * - Average absolute difference between predicted and actual
 * - More interpretable than RMSE (direct case count difference)
 * - Lower values indicate better accuracy
 *
 * MSE (Mean Squared Error):
 * - Squared prediction error (penalizes outliers heavily)
 * - Used in model optimization
 * - Lower values indicate better accuracy
 *
 * VISUALIZATION FEATURES:
 * ------------------------
 * - Historical data shown with solid blue line
 * - Predictions shown with dashed green line
 * - Confidence bounds shown with light blue shaded area
 * - Hover over predicted points to see margin of error
 * - Vertical line separates historical from predicted data
 */

import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  generateMetricsReport,
  getMetricColor,
  getMetricBackgroundColor,
  formatMetric,
  validatePredictionData,
  type MetricsReport,
} from '@/lib/utils/sarimaMetrics';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SARIMAChartProps {
  diseaseType: string;
  barangayId?: number;
}

export default function SARIMAChart({ diseaseType, barangayId }: SARIMAChartProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [metricsReport, setMetricsReport] = useState<MetricsReport | null>(null);

  useEffect(() => {
    loadPredictions();
  }, [diseaseType, barangayId]);

  const loadPredictions = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (diseaseType !== 'all') {
        params.append('disease_type', diseaseType); // FIX: Changed from 'type' to 'disease_type' to match API expectation
      }
      if (barangayId) {
        params.append('barangay_id', barangayId.toString());
      }
      params.append('days_back', '30');
      params.append('days_forecast', '30');

      const response = await fetch(`/api/diseases/predictions?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        const { historical, predictions } = result.data;

        // Combine labels from both historical and predictions
        const labels = [
          ...historical.map((d: any) => d.date),
          ...predictions.map((d: any) => d.date),
        ];

        // Create datasets
        const datasets = [
          // Actual cases (historical)
          {
            label: 'Actual Cases',
            data: [
              ...historical.map((d: any) => d.actual_cases),
              ...Array(predictions.length).fill(null), // null for future dates
            ],
            borderColor: 'rgb(34, 197, 94)', // green-600
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          // Predicted cases
          {
            label: 'Predicted Cases',
            data: [
              ...Array(historical.length).fill(null), // null for past dates
              ...predictions.map((d: any) => d.predicted_cases),
            ],
            borderColor: 'rgb(59, 130, 246)', // blue-600
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          // Upper confidence interval
          {
            label: 'Upper Confidence',
            data: [
              ...Array(historical.length).fill(null),
              ...predictions.map((d: any) => d.confidence_upper),
            ],
            borderColor: 'rgba(59, 130, 246, 0.3)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 1,
            borderDash: [2, 2],
            fill: '+1',
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
          // Lower confidence interval
          {
            label: 'Lower Confidence',
            data: [
              ...Array(historical.length).fill(null),
              ...predictions.map((d: any) => d.confidence_lower),
            ],
            borderColor: 'rgba(59, 130, 246, 0.3)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 1,
            borderDash: [2, 2],
            fill: false,
            tension: 0.3,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ];

        setChartData({ labels, datasets });
        setMetadata(result.metadata);

        // Calculate error metrics ONLY if we have actual predicted_cases data in historical records
        // This ensures we don't compare actual cases to themselves (which gives 100% accuracy)
        if (historical.length >= 2) {
          try {
            // Check if any historical data has real predicted_cases (not null/undefined)
            const hasRealPredictions = historical.some((d: any) =>
              d.predicted_cases !== null && d.predicted_cases !== undefined
            );

            if (hasRealPredictions) {
              // Extract only records that have both actual and predicted values
              const validRecords = historical.filter((d: any) =>
                d.predicted_cases !== null && d.predicted_cases !== undefined
              );

              if (validRecords.length >= 2) {
                const actualValues = validRecords.map((d: any) => d.actual_cases);
                const predictedValues = validRecords.map((d: any) => d.predicted_cases);

                // Validate data before calculating metrics
                const validation = validatePredictionData(actualValues, predictedValues);

                if (validation.valid) {
                  const report = generateMetricsReport(actualValues, predictedValues);
                  setMetricsReport(report);
                } else {
                  console.warn('Invalid prediction data for metrics:', validation.error);
                  setMetricsReport(null);
                }
              } else {
                console.info('Not enough historical predictions for metrics calculation');
                setMetricsReport(null);
              }
            } else {
              // No real predictions in historical data - using mock/demo data
              console.info('Using demo prediction data - metrics not shown');
              setMetricsReport(null);
            }
          } catch (metricsError) {
            console.error('Error calculating metrics:', metricsError);
            setMetricsReport(null);
          }
        }
      } else {
        setError(result.error || 'Failed to load predictions');
      }
    } catch (err) {
      console.error('Error loading predictions:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
          },
          filter: (item) => {
            // Hide confidence interval labels to reduce clutter
            return !item.text.includes('Confidence');
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13,
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].label);
            return date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          },
          label: (context) => {
            const label = context.dataset.label || '';
            if (label.includes('Confidence')) {
              return null; // Don't show confidence in tooltip
            }

            // For predicted cases, show confidence interval and margin of error
            if (label === 'Predicted Cases') {
              const chart = context.chart;
              const datasets = chart.data.datasets;
              const dataIndex = context.dataIndex;

              // Find upper and lower confidence datasets
              const upperDataset = datasets.find(d => d.label === 'Upper Confidence');
              const lowerDataset = datasets.find(d => d.label === 'Lower Confidence');

              if (upperDataset && lowerDataset && upperDataset.data && lowerDataset.data) {
                const upperValue = upperDataset.data[dataIndex];
                const lowerValue = lowerDataset.data[dataIndex];

                // Only show confidence info if both bounds exist (i.e., this is a prediction)
                if (upperValue !== null && lowerValue !== null &&
                    typeof upperValue === 'number' && typeof lowerValue === 'number') {
                  const margin = ((upperValue - lowerValue) / 2).toFixed(1);
                  const predictedValue = context.parsed.y;

                  return [
                    `${label}: ${predictedValue} cases`,
                    `95% CI: ${Math.round(lowerValue)}-${Math.round(upperValue)} cases`,
                    `Margin of Error: ±${margin} cases`
                  ];
                }
              }
            }

            return `${label}: ${context.parsed.y} cases`;
          },
          footer: (context) => {
            // Add helpful footer for predicted values
            const firstItem = context[0];
            if (firstItem && firstItem.dataset.label === 'Predicted Cases') {
              return '\n95% confidence interval shown';
            }
            return '';
          },
        },
        filter: (tooltipItem) => {
          // Only show actual and predicted in tooltip
          return !tooltipItem.dataset.label?.includes('Confidence');
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 10,
          },
          callback: function (value, index) {
            // Show every 5th label to reduce clutter
            if (index % 5 === 0) {
              const label = this.getLabelForValue(value as number);
              const date = new Date(label);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            return '';
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: function (value) {
            return Math.round(value as number);
          },
        },
        title: {
          display: true,
          text: 'Number of Cases',
          font: {
            size: 12,
            weight: 'bold',
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal mx-auto mb-2"></div>
          <p className="text-gray-600">Loading predictions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
        <div className="text-center text-red-600">
          <p className="font-medium">Error loading predictions</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
        <p className="text-gray-600">No prediction data available</p>
      </div>
    );
  }

  return (
    <div>
      {/* Chart */}
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>

      {/* Metadata */}
      {metadata && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <p className="text-gray-600">Past 30 Days</p>
            <p className="font-semibold text-gray-900">{metadata.total_actual_cases} cases</p>
          </div>
          <div className="bg-blue-50 p-2 rounded">
            <p className="text-gray-600">Next 30 Days</p>
            <p className="font-semibold text-blue-900">{metadata.total_predicted_cases} cases</p>
          </div>
          <div className="bg-teal-50 p-2 rounded">
            <p className="text-gray-600">Avg Confidence</p>
            <p className="font-semibold text-teal-900">{metadata.average_confidence}%</p>
          </div>
          <div className="bg-purple-50 p-2 rounded">
            <p className="text-gray-600">Model</p>
            <p className="font-semibold text-purple-900">{metadata.model_version}</p>
          </div>
        </div>
      )}

      {/* Legend explanation with confidence interval details */}
      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-900 space-y-1">
            <p>
              <span className="font-semibold">SARIMA Forecast:</span> The green dashed line shows predicted cases for the next 30 days based on historical patterns and seasonal trends.
            </p>
            <p>
              <span className="font-semibold">95% Confidence Interval:</span> The shaded blue area represents the range where we are 95% confident actual values will fall. Hover over predicted points to see the margin of error.
            </p>
            <p className="text-blue-800">
              <span className="font-semibold">Interpreting Uncertainty:</span> Wider intervals indicate higher uncertainty (volatile patterns), while narrower intervals suggest more stable and reliable predictions.
            </p>
          </div>
        </div>
      </div>

      {/* Data Quality & Generation Info */}
      {metadata && metadata.data_quality && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-medium">Prediction Quality:</span>
              {metadata.data_quality === 'high' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                  <CheckCircle2 className="w-3 h-3" />
                  High Quality
                </span>
              )}
              {metadata.data_quality === 'moderate' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                  <AlertTriangle className="w-3 h-3" />
                  Moderate Quality
                </span>
              )}
              {metadata.data_quality === 'insufficient' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                  <AlertTriangle className="w-3 h-3" />
                  Insufficient Data
                </span>
              )}
              <span className="text-xs text-gray-500">
                ({metadata.data_points_count || 0} data points)
              </span>
            </div>
            {metadata.generated_at && (() => {
              const generatedDate = new Date(metadata.generated_at);
              const now = new Date();
              const diffMs = now.getTime() - generatedDate.getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

              return (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Info className="w-3 h-3" />
                  <span>
                    Generated: {diffHours > 0
                      ? `${diffHours}h ${diffMinutes}m ago`
                      : `${diffMinutes}m ago`}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Staleness Warning */}
      {metadata && metadata.generated_at && (() => {
        const generatedDate = new Date(metadata.generated_at);
        const now = new Date();
        const daysSinceGeneration = Math.floor((now.getTime() - generatedDate.getTime()) / (1000 * 60 * 60 * 24));
        const isStale = daysSinceGeneration > 7;

        if (isStale) {
          return (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-900">Predictions May Be Outdated</h4>
                  <p className="text-xs text-yellow-800 mt-1">
                    These predictions were generated {daysSinceGeneration} day{daysSinceGeneration !== 1 ? 's' : ''} ago.
                    Click "Generate Predictions" to refresh with the latest data.
                  </p>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Model Accuracy Panel */}
      {metricsReport && (
        <div className={`mt-4 p-4 rounded-lg border ${getMetricBackgroundColor(metricsReport.rSquared)}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {metricsReport.interpretation === 'Excellent' && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              {metricsReport.interpretation === 'Good' && (
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              )}
              {(metricsReport.interpretation === 'Fair' || metricsReport.interpretation === 'Poor') && (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              <h4 className="text-sm font-semibold text-gray-900">Model Accuracy Metrics</h4>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded ${getMetricColor(metricsReport.rSquared)}`}>
              {metricsReport.interpretation}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* R-squared */}
            <div className="bg-white/50 p-3 rounded">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-gray-600">R² (Accuracy)</p>
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      Proportion of variance explained (0-1)
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatMetric(metricsReport.rSquared, 3)}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {formatMetric(metricsReport.accuracy, 1)}% accurate
              </p>
            </div>

            {/* RMSE */}
            <div className="bg-white/50 p-3 rounded">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-gray-600">RMSE</p>
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      Root Mean Squared Error (lower is better)
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatMetric(metricsReport.rmse, 2)}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">cases</p>
            </div>

            {/* MSE */}
            <div className="bg-white/50 p-3 rounded">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-gray-600">MSE</p>
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      Mean Squared Error (lower is better)
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatMetric(metricsReport.mse, 2)}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">squared cases</p>
            </div>

            {/* MAE */}
            <div className="bg-white/50 p-3 rounded">
              <div className="flex items-center gap-1 mb-1">
                <p className="text-xs text-gray-600">MAE</p>
                <div className="relative group">
                  <Info className="w-3 h-3 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                      Mean Absolute Error (lower is better)
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatMetric(metricsReport.mae, 2)}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">cases</p>
            </div>
          </div>

          {/* Interpretation Guide */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-700">
              <span className="font-semibold">Interpretation:</span> This {metricsReport.interpretation.toLowerCase()} model
              explains {formatMetric(metricsReport.accuracy, 1)}% of the variance in disease cases.
              {metricsReport.interpretation === 'Excellent' && ' The predictions are highly reliable.'}
              {metricsReport.interpretation === 'Good' && ' The predictions are generally reliable.'}
              {metricsReport.interpretation === 'Fair' && ' The predictions have moderate reliability. Consider gathering more data.'}
              {metricsReport.interpretation === 'Poor' && ' The predictions have low reliability. More data or model refinement needed.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
