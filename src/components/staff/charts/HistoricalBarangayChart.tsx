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
import { aggregateHistoricalByBarangay, formatNumber } from '@/lib/utils/historicalChartDataTransformers';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface HistoricalBarangayChartProps {
  data: any[];
  barangays: Array<{ id: number; name: string; code?: string }>;
  timeRangeMonths?: number | 'all';
  diseaseType?: string;
}

// Helper function to get disease display name
function getDiseaseDisplayName(diseaseType?: string): string {
  if (!diseaseType || diseaseType === 'all') {
    return '';
  }

  const diseaseNames: Record<string, string> = {
    dengue: 'Dengue',
    hiv_aids: 'HIV/AIDS',
    pregnancy_complications: 'Pregnancy Complications',
    malaria: 'Malaria',
    measles: 'Measles',
    rabies: 'Rabies',
    other: 'Other Diseases',
  };

  return diseaseNames[diseaseType] || diseaseType;
}

export default function HistoricalBarangayChart({
  data,
  barangays,
  timeRangeMonths = 24,
  diseaseType,
}: HistoricalBarangayChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0 || !barangays || barangays.length === 0) {
      return null;
    }

    const aggregated = aggregateHistoricalByBarangay(data, barangays, timeRangeMonths, diseaseType);

    return {
      labels: aggregated.map((d) => d.name),
      datasets: [
        {
          label: 'Total Cases',
          data: aggregated.map((d) => d.totalCases),
          backgroundColor: '#8b5cf6',
          borderColor: '#7c3aed',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [data, barangays, timeRangeMonths, diseaseType]);

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
            return `Total Cases: ${formatNumber(value)}`;
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
          <MapPin className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Historical Cases by Barangay
          </h3>
        </div>
        <div className="text-center py-12 text-gray-500">
          <p>No barangay data available</p>
          <p className="text-sm mt-2">Geographic distribution will appear here</p>
        </div>
      </div>
    );
  }

  const diseaseName = getDiseaseDisplayName(diseaseType);
  const titleSuffix = diseaseName ? ` - ${diseaseName}` : '';
  const footerDisease = diseaseName ? `${diseaseName.toLowerCase()} ` : 'aggregate ';

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Top 10 Barangays{titleSuffix} (Historical Data)
        </h3>
      </div>
      <div style={{ height: '350px' }}>
        <Bar data={chartData} options={options} />
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Showing top 10 barangays with highest {footerDisease}case counts from historical records {timeRangeMonths === 'all' ? 'for all time' : `for the last ${timeRangeMonths} months`}
        </p>
      </div>
    </div>
  );
}
