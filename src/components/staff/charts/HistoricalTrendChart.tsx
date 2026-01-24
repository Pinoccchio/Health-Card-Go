'use client';

import { useMemo } from 'react';
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
import { TrendingUp, RefreshCw } from 'lucide-react';
import { aggregateHistoricalByMonthAndDisease, formatNumber, formatDiseaseType } from '@/lib/utils/historicalChartDataTransformers';
import { getDiseaseColor } from '@/lib/utils/colorUtils';

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

interface HistoricalTrendChartProps {
  data: any[];
  isLoading?: boolean;
  onRefresh?: () => void;
  timeRangeMonths?: number | 'all';
}

export default function HistoricalTrendChart({
  data,
  isLoading = false,
  onRefresh,
  timeRangeMonths = 24,
}: HistoricalTrendChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const aggregated = aggregateHistoricalByMonthAndDisease(data, timeRangeMonths);

    // Extract all disease keys from the aggregated data (excluding month and date properties)
    const diseaseKeys = new Set<string>();
    aggregated.forEach((monthData) => {
      Object.keys(monthData).forEach((key) => {
        if (key !== 'month' && key !== 'date') {
          diseaseKeys.add(key);
        }
      });
    });

    // Helper function to convert hex color to rgba
    const hexToRgba = (hex: string, alpha: number): string => {
      // Handle HSL colors
      if (hex.startsWith('hsl')) {
        const match = hex.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
        if (match) {
          const h = parseInt(match[1]);
          const s = parseInt(match[2]);
          const l = parseInt(match[3]);
          return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
        }
        return hex;
      }

      // Handle hex colors
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Create datasets dynamically for each disease
    const datasets = Array.from(diseaseKeys).map((diseaseKey) => {
      // Determine if this is a standard disease or custom disease
      const isStandardDisease = ['dengue', 'hiv_aids', 'pregnancy_complications', 'measles', 'malaria', 'rabies', 'animal_bite'].includes(diseaseKey);

      // Get color (standard or generated for custom diseases)
      const color = getDiseaseColor(isStandardDisease ? diseaseKey : 'other', !isStandardDisease ? diseaseKey : undefined);
      const bgColor = hexToRgba(color, 0.1);

      // Format label
      const label = formatDiseaseType(isStandardDisease ? diseaseKey : 'other', !isStandardDisease ? diseaseKey : undefined);

      return {
        label,
        data: aggregated.map((d) => (d as any)[diseaseKey] || 0),
        borderColor: color,
        backgroundColor: bgColor,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        spanGaps: true,
      };
    });

    return {
      labels: aggregated.map((d) => d.month),
      datasets,
    };
  }, [data, timeRangeMonths]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 13,
          weight: 'bold',
        },
        bodyFont: {
          size: 12,
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${formatNumber(value)} cases`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: {
            size: 11,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        ticks: {
          font: {
            size: 10,
          },
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 12,
        },
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  if (!chartData) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-teal" />
            <h3 className="text-lg font-semibold text-gray-900">
              Historical Disease Trends
            </h3>
          </div>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p>No historical data available for trend analysis</p>
          <p className="text-sm mt-2">Import historical statistics to see trends</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-teal" />
          <h3 className="text-lg font-semibold text-gray-900">
            Historical Disease Trends
          </h3>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh chart data"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        )}
      </div>
      <div style={{ height: '400px' }}>
        <Line data={chartData} options={options} />
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Showing disease-specific trend lines from historical records {timeRangeMonths === 'all' ? 'for all time' : `for the last ${timeRangeMonths} months`}
        </p>
      </div>
    </div>
  );
}
