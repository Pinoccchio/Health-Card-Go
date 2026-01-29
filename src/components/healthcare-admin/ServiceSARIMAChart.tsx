'use client';

/**
 * Service SARIMA Chart Component
 *
 * Generic SARIMA predictions component for ALL services:
 * - HealthCard services (12-15): Uses health card issuance data
 * - HIV service (16): Uses appointment booking data
 * - Pregnancy service (17): Uses appointment booking data
 *
 * Displays:
 * - Historical actual data (solid line)
 * - Predicted future data (dashed line)
 * - 95% confidence intervals (shaded area)
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
import { AlertCircle, TrendingUp, Info, AlertTriangle, Activity, Calendar, MapPin, Briefcase, Database, Circle } from 'lucide-react';

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

interface ServiceSARIMAData {
  dates: string[];
  actualValues: (number | null)[];
  predictedValues: (number | null)[];
  lowerBound: (number | null)[];
  upperBound: (number | null)[];
  barangay_name?: string | null;
}

interface ServiceSARIMAChartProps {
  serviceId: number;
  serviceName: string;
  barangayId?: number | null;
  monthsBack?: number; // NEW: Monthly granularity
  monthsForecast?: number; // NEW: Monthly granularity
  daysBack?: number; // Legacy support
  daysForecast?: number; // Legacy support
  granularity?: 'daily' | 'monthly'; // NEW: Granularity parameter
  showTitle?: boolean;
  height?: number;
}

export default function ServiceSARIMAChart({
  serviceId,
  serviceName,
  barangayId = null,
  monthsBack,
  monthsForecast,
  daysBack,
  daysForecast,
  granularity = 'monthly', // Default to monthly
  showTitle = true,
  height = 400,
}: ServiceSARIMAChartProps) {
  // Use monthly by default, fallback to daily
  const periodsBack = granularity === 'monthly' ? (monthsBack || 12) : (daysBack || 30);
  const [chartData, setChartData] = useState<ServiceSARIMAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataQuality, setDataQuality] = useState<'high' | 'moderate' | 'insufficient'>('high');

  // Time Range filter state
  const currentYear = new Date().getFullYear();

  // Load saved filter preference or default to current year
  // Can be a number (specific year) or 'all' (all time)
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`service_${serviceId}_filter_year`);
      if (saved === 'all') return 'all';
      return saved ? Number(saved) : currentYear;
    }
    return currentYear;
  });

  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [yearsLoaded, setYearsLoaded] = useState(false);
  const [selectedMonthsForecast, setSelectedMonthsForecast] = useState(monthsForecast || 12);

  // Get service-specific color scheme
  const getServiceColor = (serviceId: number) => {
    const colors: Record<number, { primary: string; light: string }> = {
      12: { primary: 'rgb(234, 179, 8)', light: 'rgba(234, 179, 8, 0.2)' }, // Yellow Card - General Health Card
      13: { primary: 'rgb(234, 179, 8)', light: 'rgba(234, 179, 8, 0.2)' }, // Yellow Card Renewal - General
      14: { primary: 'rgb(34, 197, 94)', light: 'rgba(34, 197, 94, 0.2)' }, // Green Card - General Health Card
      15: { primary: 'rgb(34, 197, 94)', light: 'rgba(34, 197, 94, 0.2)' }, // Green Card Renewal - General
      16: { primary: 'rgb(236, 72, 153)', light: 'rgba(236, 72, 153, 0.2)' }, // HIV - Pink
      17: { primary: 'rgb(147, 51, 234)', light: 'rgba(147, 51, 234, 0.2)' }, // Pregnancy - Purple
    };
    return colors[serviceId] || { primary: 'rgb(20, 184, 166)', light: 'rgba(20, 184, 166, 0.2)' };
  };

  // Fetch available years from database (dynamically detect which years have data)
  useEffect(() => {
    async function fetchAvailableYears() {
      try {
        const response = await fetch(`/api/services/${serviceId}/available-years`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.years && data.years.length > 0) {
            setAvailableYears(data.years);
            // If saved year is not in available years, default to current year
            if (typeof selectedYear === 'number' && !data.years.includes(selectedYear)) {
              setSelectedYear(currentYear);
            }
          }
          setYearsLoaded(true);
        }
      } catch (err) {
        console.error('[ServiceSARIMAChart] Failed to fetch available years:', err);
        // Fallback to current year if API fails
        setAvailableYears([currentYear]);
        setYearsLoaded(true);
      }
    }
    fetchAvailableYears();
  }, [serviceId, currentYear]);

  // Save filter preference when year changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `service_${serviceId}_filter_year`,
        selectedYear === 'all' ? 'all' : selectedYear.toString()
      );
    }
  }, [selectedYear, serviceId]);

  // Format dates as YYYY-MM-DD
  // If "all" is selected, use full range from earliest year to current year
  const formatStartDate = () => {
    if (selectedYear === 'all') {
      return `${availableYears[0] || currentYear}-01-01`;
    }
    return `${selectedYear}-01-01`;
  };

  const formatEndDate = () => {
    if (selectedYear === 'all') {
      return `${currentYear}-12-31`;
    }
    return `${selectedYear}-12-31`;
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
          service_id: serviceId.toString(),
          granularity: granularity,
        });

        // Add period parameters based on granularity
        if (granularity === 'monthly') {
          // Pass explicit start_date and end_date for year-based filtering
          params.append('start_date', formatStartDate());
          params.append('end_date', formatEndDate());
          params.append('months_forecast', selectedMonthsForecast.toString());
        } else {
          params.append('days_back', periodsBack.toString());
          params.append('days_forecast', (daysForecast || 30).toString());
        }

        if (barangayId !== null) {
          params.append('barangay_id', barangayId.toString());
        }

        const response = await fetch(`/api/services/predictions?${params}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch predictions');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to load predictions');
        }

        setChartData(result.data);
        setDataQuality(result.data_quality || 'moderate');
      } catch (err) {
        console.error('[ServiceSARIMAChart] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    }

    fetchPredictions();
  }, [serviceId, barangayId, selectedYear, selectedMonthsForecast, granularity, availableYears, yearsLoaded]);

  // Format date labels based on granularity
  const formatDateLabel = (dateStr: string): string => {
    if (granularity === 'monthly') {
      // Format as "Jan 2025", "Feb 2025"
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
      // Format as "Jan 15" for daily
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Build Chart.js configuration
  const getChartConfig = () => {
    if (!chartData) return null;

    const colors = getServiceColor(serviceId);

    const data = {
      labels: chartData.dates.map(formatDateLabel),
      datasets: [
        // Actual values (solid line)
        {
          label: 'Actual Appointments',
          data: chartData.actualValues,
          borderColor: colors.primary,
          backgroundColor: colors.primary,
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: false,
          spanGaps: false,
        },
        // Predicted values (dashed line)
        {
          label: 'Predicted Appointments',
          data: chartData.predictedValues,
          borderColor: colors.primary,
          backgroundColor: colors.primary,
          borderWidth: 2,
          borderDash: [8, 4],
          pointRadius: 3,
          pointHoverRadius: 5,
          pointStyle: 'circle',
          tension: 0.3,
          fill: false,
          spanGaps: false,
        },
        // 95% Confidence Interval (shaded area)
        {
          label: '95% Confidence Interval',
          data: chartData.upperBound.map((upper, i) => {
            const lower = chartData.lowerBound[i];
            if (upper === null || lower === null) return null;
            return { y: [lower, upper] };
          }),
          backgroundColor: colors.light,
          borderColor: 'transparent',
          fill: true,
          pointRadius: 0,
          showLine: false,
          type: 'line' as const,
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
          },
        },
        title: {
          display: showTitle,
          text: `${serviceName} Appointment Forecast${
            chartData.barangay_name ? ` - ${chartData.barangay_name}` : ' (System-wide)'
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
              return `${label}: ${Math.round(value)} appointments`;
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
            text: 'Number of Appointments',
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

  const chartConfig = getChartConfig();

  // Data Quality Indicator
  const getDataQualityInfo = () => {
    switch (dataQuality) {
      case 'high':
        return { color: 'green', label: 'High Quality Data', icon: Info };
      case 'moderate':
        return { color: 'yellow', label: 'Moderate Quality Data', icon: AlertCircle };
      case 'insufficient':
        return { color: 'red', label: 'Insufficient Data', icon: AlertTriangle };
      default:
        return { color: 'gray', label: 'Unknown', icon: Info };
    }
  };

  const qualityInfo = getDataQualityInfo();
  const QualityIcon = qualityInfo.icon;

  // Loading State
  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm">Loading predictions...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200"
        style={{ height: `${height}px` }}
      >
        <div className="text-center px-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Failed to Load Predictions</h3>
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // No Data State
  if (!chartData || chartData.dates.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200"
        style={{ height: `${height}px` }}
      >
        <div className="text-center px-6">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p className="text-gray-600 text-sm">
            There is not enough historical appointment data to generate predictions.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            SARIMA requires at least 30 days of appointment history.
          </p>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalHistorical = chartData.actualValues.reduce(
    (sum: number, val) => sum + (val || 0),
    0
  );
  const totalPredicted = chartData.predictedValues.reduce(
    (sum: number, val) => sum + (val || 0),
    0
  );
  const locationDisplay = chartData.barangay_name || 'All Barangays';

  // Success: Render Chart
  return (
    <div className="space-y-4">
      {/* Comprehensive Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              {serviceName} Appointment Forecast
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              This chart displays historical appointment data and SARIMA-predicted future appointments for {serviceName}.
              The solid line represents actual appointments booked, while the dashed line shows SARIMA-forecasted demand.
              The shaded area indicates the 95% confidence interval, helping you understand prediction uncertainty and plan resource allocation effectively.
            </p>
          </div>
        </div>
      </div>

      {/* Data Quality Banner - shown before Time Range like HealthCard component */}
      {dataQuality !== 'high' && (
        <div className={`${
          dataQuality === 'insufficient'
            ? 'bg-yellow-50 border-l-4 border-yellow-400'
            : 'bg-blue-50 border-l-4 border-blue-400'
        } p-4 rounded-r-lg`}>
          <div className="flex items-start">
            <QualityIcon className={`h-5 w-5 ${
              dataQuality === 'insufficient' ? 'text-yellow-600' : 'text-blue-600'
            } mt-0.5 mr-3 flex-shrink-0`} />
            <div className="flex-1">
              <h3 className={`text-sm font-semibold ${
                dataQuality === 'insufficient' ? 'text-yellow-900' : 'text-blue-900'
              } mb-1`}>
                {dataQuality === 'insufficient' ? 'Limited Historical Data' : 'Moderate Data Quality'}
              </h3>
              <p className={`text-sm ${
                dataQuality === 'insufficient' ? 'text-yellow-800' : 'text-blue-800'
              } mb-2`}>
                {dataQuality === 'insufficient'
                  ? 'Predictions are based on limited historical data. SARIMA models typically require 30-50+ data points for reliable forecasting.'
                  : 'Predictions may be less accurate due to moderate historical data (7-29 days).'}
              </p>
              {dataQuality === 'insufficient' && (
                <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Current predictions may show limited variance or constant values</li>
                  <li>Accuracy will improve as more appointments are completed</li>
                  <li>Use these forecasts as rough estimates only</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time Range Filter (only for monthly granularity) - MOVED BEFORE STATS CARDS */}
      {granularity === 'monthly' && (
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200 relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">Time Range</h3>
          </div>
          <div className="space-y-4">
            {/* Year Selection Buttons */}
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
                  ? `Jan 1, ${availableYears[0] || currentYear} - Dec 31, ${currentYear}`
                  : `Jan 1 - Dec 31, ${selectedYear}`}
              </p>
            </div>

            {/* Forecast Period Dropdown */}
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

      {/* Summary Cards - NOW AFTER TIME RANGE (consistent with HealthCardSARIMAChart) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Historical */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-blue-700 uppercase">Total Historical</h4>
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{totalHistorical}</p>
          <p className="text-xs text-blue-600 mt-1">
            {granularity === 'monthly'
              ? selectedYear === 'all'
                ? `${availableYears[0] || currentYear}-${currentYear}`
                : `Year ${selectedYear}`
              : `Last ${periodsBack} days`}
          </p>
        </div>

        {/* Card 2: Predicted Total */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-purple-700 uppercase">Predicted Total</h4>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">{Math.round(totalPredicted)}</p>
          <p className="text-xs text-purple-600 mt-1">
            Next {granularity === 'monthly' ? selectedMonthsForecast : (daysForecast || 30)} {granularity === 'monthly' ? 'months' : 'days'}
          </p>
        </div>

        {/* Card 3: Location */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-green-700 uppercase">Location</h4>
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-xl font-bold text-green-900 truncate">{locationDisplay}</p>
          <p className="text-xs text-green-600 mt-1">
            {barangayId ? 'Barangay-specific' : 'System-wide'}
          </p>
        </div>

        {/* Card 4: Service Type */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-orange-700 uppercase">Service Type</h4>
            <Briefcase className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-xl font-bold text-orange-900 truncate">{serviceName}</p>
          <p className="text-xs text-orange-600 mt-1">Service #{serviceId}</p>
        </div>
      </div>

      {/* High Quality Data Banner - only show for high quality */}
      {dataQuality === 'high' && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-green-900">High Quality Data</h3>
              <p className="text-sm text-green-800">
                Predictions are based on robust historical data (30+ days).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div
        className="bg-white rounded-lg border border-gray-200 p-4"
        style={{ height: `${height}px` }}
      >
        {chartConfig && <Line data={chartConfig.data} options={chartConfig.options} />}
      </div>

      {/* Chart Guide */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Chart Guide</h4>
        <div className="space-y-2 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-teal-600"></div>
            <span>
              <strong>Solid Line:</strong> Actual appointments booked (historical data)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 border-t-2 border-dashed border-teal-600"></div>
            <span>
              <strong>Dashed Line:</strong> Predicted appointments (SARIMA forecast)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-4 bg-teal-200 opacity-50 rounded"></div>
            <span>
              <strong>Shaded Area:</strong> 95% confidence interval (prediction uncertainty range)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
