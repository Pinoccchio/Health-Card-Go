'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { aggregateByMonth, formatNumber } from '@/lib/utils/chartDataTransformers';

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

interface DiseaseTrendChartProps {
  data: any[];
  isLoading?: boolean;
  onRefresh?: () => void;
  timeRangeMonths?: number | 'all';
}

export default function DiseaseTrendChart({
  data,
  isLoading = false,
  onRefresh,
  timeRangeMonths = 24,
}: DiseaseTrendChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const aggregated = aggregateByMonth(data, timeRangeMonths);

    return {
      labels: aggregated.map((d) => d.month),
      datasets: [
        {
          label: 'New Cases',
          data: aggregated.map((d) => d.newCases),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Active Cases',
          data: aggregated.map((d) => d.activeCases),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Recovered',
          data: aggregated.map((d) => d.recovered),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
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
              Disease Trends Over Time
            </h3>
          </div>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p>No data available for trend analysis</p>
          <p className="text-sm mt-2">Disease cases will appear here once recorded</p>
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
            Disease Trends Over Time
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
          {timeRangeMonths === 'all'
            ? 'Showing all available case trends by status category'
            : `Showing case trends for the last ${timeRangeMonths} months by status category`}
        </p>
      </div>
    </div>
  );
}
