'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { MapPin } from 'lucide-react';
import { aggregateByBarangay, formatNumber } from '@/lib/utils/chartDataTransformers';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarangayDistributionChartProps {
  data: any[];
  barangays: Array<{ id: number; name: string; code?: string }>;
  timeRangeMonths?: number | 'all';
}

export default function BarangayDistributionChart({
  data,
  barangays,
  timeRangeMonths = 24,
}: BarangayDistributionChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0 || !barangays || barangays.length === 0) {
      return null;
    }

    const aggregated = aggregateByBarangay(data, barangays, timeRangeMonths);

    return {
      labels: aggregated.map((d) => d.name),
      datasets: [
        {
          label: 'Cases',
          data: aggregated.map((d) => d.count),
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [data, barangays, timeRangeMonths]);

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
            const value = context.parsed.x;
            return `Cases: ${formatNumber(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
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
      y: {
        ticks: {
          font: {
            size: 11,
          },
          callback: function(value, index) {
            const label = this.getLabelForValue(index);
            // Truncate long labels
            return label.length > 20 ? label.substring(0, 20) + '...' : label;
          },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  if (!chartData) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Cases by Barangay
          </h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p>No barangay data available</p>
          <p className="text-sm mt-2">Geographic distribution will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Top 10 Barangays by Cases
        </h3>
      </div>
      <div style={{ height: '350px' }}>
        <Bar data={chartData} options={options} />
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Showing top 10 barangays with highest disease case counts {timeRangeMonths === 'all' ? 'from all time' : `from the last ${timeRangeMonths} months`}
        </p>
      </div>
    </div>
  );
}
