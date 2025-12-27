'use client';

import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { PieChart } from 'lucide-react';
import { aggregateHistoricalByDiseaseType, formatNumber, formatPercentage } from '@/lib/utils/historicalChartDataTransformers';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface HistoricalDiseaseChartProps {
  data: any[];
  timeRangeMonths?: number | 'all';
}

export default function HistoricalDiseaseChart({ data, timeRangeMonths = 24 }: HistoricalDiseaseChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const aggregated = aggregateHistoricalByDiseaseType(data, timeRangeMonths);

    return {
      labels: aggregated.map((d) => d.type),
      datasets: [
        {
          label: 'Total Cases',
          data: aggregated.map((d) => d.totalCases),
          backgroundColor: aggregated.map((d) => d.color),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [data, timeRangeMonths]);

  const diseaseStats = useMemo(() => {
    if (!data || data.length === 0) return [];
    return aggregateHistoricalByDiseaseType(data, timeRangeMonths);
  }, [data, timeRangeMonths]);

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Custom legend below
      },
      tooltip: {
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
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: any) => a + Number(b), 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${formatNumber(value)} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '65%', // Creates donut effect
  };

  if (!chartData) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Historical Disease Distribution
          </h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p>No disease data available</p>
          <p className="text-sm mt-2">Disease breakdown will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <PieChart className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Historical Disease Type Distribution
        </h3>
      </div>
      <div style={{ height: '300px' }} className="mb-6">
        <Doughnut data={chartData} options={options} />
      </div>
      {/* Custom Legend */}
      <div className="space-y-2">
        {diseaseStats.map((disease, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: disease.color }}
              />
              <span className="font-medium text-gray-700">{disease.type}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-600">{formatNumber(disease.totalCases)}</span>
              <span className="text-gray-500 text-xs font-medium min-w-[45px] text-right">
                {formatPercentage(disease.percentage)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Showing percentage distribution of aggregate cases from historical records {timeRangeMonths === 'all' ? 'for all time' : `for the last ${timeRangeMonths} months`}
        </p>
      </div>
    </div>
  );
}
