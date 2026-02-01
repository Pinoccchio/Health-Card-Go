'use client';

/**
 * HealthCard SARIMA Chart Component
 *
 * Displays SARIMA predictions for health card issuance with:
 * - Historical actual issuances (solid line)
 * - Predicted future issuances (dashed line)
 * - 95% confidence intervals (shaded area)
 * - Separate views for Yellow Card (General) vs Green Card (General)
 */

import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
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
import {
  HealthCardSARIMAData,
  HealthCardType,
  HealthCardPredictionsResponse,
  DataQuality,
} from '@/types/healthcard';
import {
  getHealthCardTypeLabel,
  getHealthCardTypePrimaryColor,
  getHealthCardTypeLightColor,
} from '@/lib/utils/healthcardHelpers';
import { AlertCircle, TrendingUp, Calendar, MapPin, AlertTriangle, Info } from 'lucide-react';

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

interface HealthCardSARIMAChartProps {
  healthcardType: HealthCardType;
  barangayId?: number | null;
  monthsBack?: number; // NEW: Monthly granularity
  monthsForecast?: number; // NEW: Monthly granularity
  daysBack?: number; // Legacy support
  daysForecast?: number; // Legacy support
  granularity?: 'daily' | 'monthly'; // NEW: Granularity parameter
  showTitle?: boolean;
  height?: number;
  combinedSummary?: {
    total_cards_issued: number;
    food_handler_cards: number;
    non_food_cards: number;
    pink_cards?: number;
  };
}

export default function HealthCardSARIMAChart({
  healthcardType,
  barangayId = null,
  monthsBack,
  monthsForecast,
  daysBack,
  daysForecast,
  granularity = 'monthly', // Default to monthly
  showTitle = true,
  height = 400,
  combinedSummary,
}: HealthCardSARIMAChartProps) {
  // Filter state for year selection (simplified - no month picker)
  const currentYear = new Date().getFullYear();

  // Load saved filter preference or default to current year
  // Can be a number (specific year) or 'all' (all time)
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('healthcard_filter_year');
      if (saved === 'all') return 'all';
      return saved ? Number(saved) : currentYear;
    }
    return currentYear;
  });

  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [yearsLoaded, setYearsLoaded] = useState(false);
  const [yearsWithCounts, setYearsWithCounts] = useState<Array<{ year: number; count: number }>>([]);
  const [selectedMonthsForecast, setSelectedMonthsForecast] = useState(monthsForecast || 12);

  // Fetch available years from database (dynamically detect which years have data)
  useEffect(() => {
    async function fetchAvailableYears() {
      try {
        const response = await fetch('/api/healthcards/available-years');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.years && data.years.length > 0) {
            setAvailableYears(data.years);
            if (data.yearsWithCounts) {
              setYearsWithCounts(data.yearsWithCounts);
            }
            // Default to the most recent year
            if (!data.years.includes(selectedYear)) {
              setSelectedYear(data.years[data.years.length - 1]);
            }
          }
          setYearsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to fetch available years:', err);
        // Dynamic fallback: use current year only if API fails
        setAvailableYears([currentYear]);
        setYearsLoaded(true);
      }
    }
    fetchAvailableYears();
  }, []);

  // Save filter preference when year changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('healthcard_filter_year', selectedYear === 'all' ? 'all' : selectedYear.toString());
    }
  }, [selectedYear]);

  // Format dates as YYYY-MM-DD
  // If "all" is selected, use full range from earliest year to current year
  const formatStartDate = () => {
    if (selectedYear === 'all') {
      return `${availableYears[0]}-01-01`;
    }
    return `${selectedYear}-01-01`;
  };

  const formatEndDate = () => {
    if (selectedYear === 'all') {
      return `${currentYear}-12-31`;
    }
    return `${selectedYear}-12-31`;
  };

  // Use monthly by default, fallback to daily
  const periodsForecast = granularity === 'monthly' ? selectedMonthsForecast : (daysForecast || 30);
  const [chartData, setChartData] = useState<HealthCardSARIMAData | null>(null);
  const [metadata, setMetadata] = useState<HealthCardPredictionsResponse['metadata'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper: Get data quality color and label
  const getDataQualityInfo = (quality: DataQuality | undefined) => {
    switch (quality) {
      case 'high':
        return { color: 'green', label: 'High Quality', icon: Info };
      case 'moderate':
        return { color: 'yellow', label: 'Moderate Quality', icon: AlertCircle };
      case 'insufficient':
        return { color: 'red', label: 'Insufficient Data', icon: AlertTriangle };
      default:
        return { color: 'gray', label: 'Unknown', icon: Info };
    }
  };

  // Fetch predictions data
  useEffect(() => {
    async function fetchPredictions() {
      // Don't fetch with stale availableYears when "All Time" is selected
      if (selectedYear === 'all' && !yearsLoaded) return;

      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          healthcard_type: healthcardType,
          granularity: granularity,
        });

        if (granularity === 'monthly') {
          // Pass explicit start_date and end_date
          params.append('start_date', formatStartDate());
          params.append('end_date', formatEndDate());
          params.append('months_forecast', periodsForecast.toString());
        } else {
          params.append('days_back', (daysBack || 30).toString());
          params.append('days_forecast', periodsForecast.toString());
        }

        if (barangayId !== null) {
          params.append('barangay_id', barangayId.toString());
        }

        const response = await fetch(`/api/healthcards/predictions?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch predictions');
        }

        const result: HealthCardPredictionsResponse = await response.json();

        if (!result.success) {
          throw new Error(result.data as any);
        }

        setChartData(result.data);
        setMetadata(result.metadata);
      } catch (err) {
        console.error('[HealthCardSARIMAChart] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    }

    fetchPredictions();
  }, [healthcardType, barangayId, selectedYear, periodsForecast, granularity, availableYears, yearsLoaded]);

  // Helper: Format date labels based on granularity
  const formatDateLabel = (dateStr: string): string => {
    if (granularity === 'monthly') {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Build Chart.js configuration
  const getChartConfig = () => {
    if (!chartData) return null;

    const color = getHealthCardTypePrimaryColor(healthcardType);
    const lightColor = getHealthCardTypeLightColor(healthcardType);

    const data = {
      labels: chartData.dates.map(formatDateLabel),
      datasets: [
        // Actual issuances (solid line)
        {
          label: 'Actual Cards Issued',
          data: chartData.actualCards,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: false,
          spanGaps: false,
        },
        // Predicted issuances (dashed line)
        {
          label: 'Predicted Cards',
          data: chartData.predictedCards,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 3,
          pointHoverRadius: 5,
          pointStyle: 'circle',
          tension: 0.3,
          fill: false,
          spanGaps: false,
        },
        // Lower Bound (hidden line for fill reference)
        {
          label: 'Lower Bound',
          data: chartData.lowerBound,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: 0,
          tension: 0.3,
          fill: false,
        },
        // Upper Bound with fill to Lower Bound (creates shaded confidence interval)
        {
          label: 'Upper Bound',
          data: chartData.upperBound,
          borderColor: 'transparent',
          backgroundColor: lightColor,
          pointRadius: 0,
          tension: 0.3,
          fill: '-1', // Fill to previous dataset (lower bound)
        },
      ],
    };

    const options: ChartOptions<'line'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
            },
            // Hide the "Lower Bound" dataset from legend (it's only used for fill reference)
            filter: (legendItem) => legendItem.text !== 'Lower Bound',
          },
        },
        title: {
          display: showTitle,
          text: `${getHealthCardTypeLabel(healthcardType)} Health Card Issuance Forecast - Combined Dataset (Historical + Appointments)${
            chartData.barangay_name ? ` - ${chartData.barangay_name}` : ''
          }`,
          font: {
            size: 16,
            weight: 'bold',
          },
          padding: {
            top: 10,
            bottom: 20,
          },
        },
        tooltip: {
          callbacks: {
            title: (context) => {
              const date = context[0].label;
              return new Date(date).toLocaleDateString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              if (value === null) return '';
              return `${label}: ${Math.round(value)} cards`;
            },
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          bodyFont: {
            size: 13,
          },
          titleFont: {
            size: 14,
            weight: 'bold',
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
              // Show every 5th date
              if (index % 5 === 0) {
                const date = chartData.dates[index];
                return new Date(date).toLocaleDateString('en-PH', {
                  month: 'short',
                  day: 'numeric',
                });
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
            stepSize: 1,
            font: {
              size: 11,
            },
            callback: function (value) {
              return Math.round(value as number);
            },
          },
          title: {
            display: true,
            text: 'Number of Health Cards',
            font: {
              size: 12,
              weight: 'bold',
            },
          },
        },
      },
    };

    return { data, options };
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-sm text-gray-600">Loading SARIMA predictions...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error || !chartData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center max-w-md p-6 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="mx-auto h-12 w-12 text-red-600 mb-3" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Failed to Load Predictions
          </h3>
          <p className="text-sm text-red-700">{error || 'No data available'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const chartConfig = getChartConfig();
  if (!chartConfig) return null;

  const qualityInfo = getDataQualityInfo(metadata?.data_quality);
  const hasInsufficientData = metadata?.data_quality === 'insufficient' || !metadata?.has_sufficient_data;
  const noVariance = metadata?.variance_detected === false;

  return (
    <div className="space-y-4">
      {/* Data Quality Warning Banner */}
      {hasInsufficientData && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-900 mb-1">
                Limited Historical Data
              </h3>
              <p className="text-sm text-yellow-800 mb-2">
                Predictions are based on only {metadata?.data_points_count || 0} historical data points.
                SARIMA models typically require 30-50+ data points for reliable forecasting.
              </p>
              <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                <li>Current predictions may show limited variance or constant values</li>
                <li>Accuracy will improve as more appointments are completed</li>
                <li>Use these forecasts as rough estimates only</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Zero Variance Warning */}
      {noVariance && !hasInsufficientData && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Stable Prediction Pattern
              </h3>
              <p className="text-sm text-blue-800">
                The model detected a stable trend with minimal variance in historical data,
                resulting in consistent prediction values. This is expected when health card
                issuance patterns are regular.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Year Filter (Industry Standard - Clean Shortcuts Only) */}
      {granularity === 'monthly' && (
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Time Range</h3>
          </div>
          <div className="space-y-4">
            {/* Quick Date Shortcuts - This Year, All Time */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Select Year
              </label>
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <button
                  onClick={() => setSelectedYear(currentYear)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    selectedYear === currentYear
                      ? 'bg-[#20C997] text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                  style={{ pointerEvents: 'auto' }}
                >
                  <div className="font-semibold">This Year</div>
                  <div className="text-xs mt-1 opacity-90">{currentYear}</div>
                </button>
                <button
                  onClick={() => setSelectedYear('all')}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                    selectedYear === 'all'
                      ? 'bg-[#20C997] text-white shadow-md'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                  style={{ pointerEvents: 'auto' }}
                >
                  <div className="font-semibold">All Time</div>
                  <div className="text-xs mt-1 opacity-90">
                    {availableYears.length > 0 ? `${availableYears[0]}-${currentYear}` : currentYear}
                  </div>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Showing data: {selectedYear === 'all'
                  ? `Jan 1, ${availableYears[0]} - Dec 31, ${currentYear}`
                  : `Jan 1 - Dec 31, ${selectedYear}`}
              </p>
            </div>

            {/* Forecast Period */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Forecast Period
              </label>
              <select
                value={selectedMonthsForecast}
                onChange={(e) => setSelectedMonthsForecast(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
              >
                <option value={3}>3 Months Ahead</option>
                <option value={6}>6 Months Ahead</option>
                <option value={12}>12 Months Ahead (1 Year)</option>
                <option value={18}>18 Months Ahead</option>
                <option value={24}>24 Months Ahead (2 Years)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm font-medium text-gray-600 mb-1">Total Cards Issued</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {combinedSummary?.total_cards_issued || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Used for time series forecasting</p>
          <div className="mt-3 space-y-1">
            {healthcardType === 'pink' ? (
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                  <span className="text-gray-700">Pink Cards:</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {combinedSummary?.pink_cards || combinedSummary?.total_cards_issued || 0}
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span className="text-gray-700">Yellow Cards:</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {combinedSummary?.food_handler_cards || 0} ({combinedSummary ? Math.round((combinedSummary.food_handler_cards / combinedSummary.total_cards_issued) * 100) : 0}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span className="text-gray-700">Green Cards:</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {combinedSummary?.non_food_cards || 0} ({combinedSummary ? Math.round((combinedSummary.non_food_cards / combinedSummary.total_cards_issued) * 100) : 0}%)
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-900">Predicted Total</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{chartData.total_predicted}</p>
          <p className="text-xs text-green-700 mt-1">
            Next {periodsForecast} {granularity === 'monthly' ? 'months' : 'days'}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-900">Location</span>
          </div>
          <p className="text-sm font-bold text-purple-900">
            {chartData.barangay_name || 'All Barangays'}
          </p>
          <p className="text-xs text-purple-700 mt-1">System-wide forecast</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-medium text-orange-900">Card Type</span>
            </div>
            {metadata?.data_quality && (
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  qualityInfo.color === 'green'
                    ? 'bg-green-100 text-green-800'
                    : qualityInfo.color === 'yellow'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {metadata.data_points_count || 0} pts
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-orange-900">
            {healthcardType === 'pink'
              ? 'Pink Card (Service/Clinical)'
              : healthcardType === 'food_handler'
              ? 'Yellow Card (Food Handler)'
              : 'Green Card (Non-Food)'}
          </p>
          {/* Service ID Mapping:
              - Food Handler (Yellow): Services 12-13
              - Non-Food (Green): Services 14-15
              - Pink Card: Service 24
          */}
          <p className="text-xs text-orange-700 mt-1">
            {healthcardType === 'food_handler'
              ? 'Services 12-13'
              : healthcardType === 'pink'
              ? 'Service 24'
              : 'Services 14-15'}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div
        className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm relative z-0"
        style={{ height }}
      >
        <Line data={chartConfig.data} options={chartConfig.options} />
      </div>

      {/* Legend Info */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm">
        <p className="font-semibold text-gray-900 mb-2">Chart Guide:</p>
        <ul className="space-y-1 text-gray-700">
          <li>
            <strong>Solid Line:</strong> Actual health cards issued (historical data)
          </li>
          <li>
            <strong>Dashed Line:</strong> Predicted health cards (SARIMA forecast)
          </li>
          <li>
            <strong>Shaded Area:</strong> 95% confidence interval (prediction uncertainty)
          </li>
        </ul>
      </div>
    </div>
  );
}
