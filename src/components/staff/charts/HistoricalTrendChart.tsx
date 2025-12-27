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
import { aggregateHistoricalByMonthAndDisease, formatNumber } from '@/lib/utils/historicalChartDataTransformers';

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

    // Disease configurations with colors and labels
    const diseases = [
      { key: 'dengue', label: 'Dengue', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)' },
      { key: 'hiv_aids', label: 'HIV/AIDS', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)' },
      { key: 'pregnancy_complications', label: 'Pregnancy Complications', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.1)' },
      { key: 'measles', label: 'Measles', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.1)' },
      { key: 'malaria', label: 'Malaria', color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.1)' },
      { key: 'rabies', label: 'Rabies', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.1)' },
      { key: 'other', label: 'Other Diseases', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.1)' },
    ];

    return {
      labels: aggregated.map((d) => d.month),
      datasets: diseases.map((disease) => ({
        label: disease.label,
        data: aggregated.map((d) => (d as any)[disease.key]),
        borderColor: disease.color,
        backgroundColor: disease.bgColor,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        spanGaps: true,
      })),
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
