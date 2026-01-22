'use client';

import { useEffect, useRef, useState } from 'react';
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
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';

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

interface MonthlyData {
  year: number;
  month: number;
  completed: number;
  cancelled: number;
  no_show: number;
  total: number;
}

interface AppointmentStatusChartProps {
  data: MonthlyData[];
  loading?: boolean;
  title?: string;
  height?: number;
}

export function AppointmentStatusChart({
  data,
  loading = false,
  title = 'Monthly Appointment Statistics',
  height = 400,
}: AppointmentStatusChartProps) {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    if (!data || data.length === 0) {
      setChartData(null);
      return;
    }

    // Generate labels (e.g., "Jan 2023", "Feb 2023", etc.)
    const labels = data.map((item) => {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return `${monthNames[item.month - 1]} ${item.year}`;
    });

    // Prepare datasets
    const datasets = [
      {
        label: 'Completed',
        data: data.map((item) => item.completed),
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Cancelled',
        data: data.map((item) => item.cancelled),
        borderColor: 'rgb(234, 179, 8)', // yellow-500
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(234, 179, 8)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'No Show',
        data: data.map((item) => item.no_show),
        borderColor: 'rgb(239, 68, 68)', // red-500
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ];

    setChartData({
      labels,
      datasets,
    });
  }, [data]);

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
          padding: 20,
          font: {
            size: 12,
            weight: '500',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        bodySpacing: 6,
        usePointStyle: true,
        callbacks: {
          footer: (tooltipItems) => {
            const total = tooltipItems.reduce((sum, item) => sum + (item.parsed.y || 0), 0);
            return `Total: ${total} appointments`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          maxRotation: 45,
          minRotation: 45,
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
          precision: 0,
        },
      },
    },
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-gray-300 rounded animate-pulse w-64"></div>
          <div className="h-4 bg-gray-300 rounded animate-pulse w-32"></div>
        </div>
        <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  // Empty state
  if (!chartData || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
          <AlertCircle className="w-12 h-12 mb-4 text-gray-400" />
          <p className="text-sm">No appointment data available</p>
          <p className="text-xs text-gray-400 mt-1">Complete appointments will appear here</p>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalCompleted = data.reduce((sum, item) => sum + item.completed, 0);
  const totalCancelled = data.reduce((sum, item) => sum + item.cancelled, 0);
  const totalNoShow = data.reduce((sum, item) => sum + item.no_show, 0);
  const grandTotal = totalCompleted + totalCancelled + totalNoShow;

  const completionRate = grandTotal > 0 ? ((totalCompleted / grandTotal) * 100).toFixed(1) : '0';
  const cancellationRate = grandTotal > 0 ? ((totalCancelled / grandTotal) * 100).toFixed(1) : '0';
  const noShowRate = grandTotal > 0 ? ((totalNoShow / grandTotal) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-sm text-gray-500">
          {data.length} months
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs font-medium text-gray-600 mb-1">Total Appointments</p>
          <p className="text-2xl font-bold text-gray-900">{grandTotal.toLocaleString()}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-xs font-medium text-green-700 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{totalCompleted.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">{completionRate}%</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <p className="text-xs font-medium text-yellow-700 mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-yellow-600">{totalCancelled.toLocaleString()}</p>
          <p className="text-xs text-yellow-600 mt-1">{cancellationRate}%</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-xs font-medium text-red-700 mb-1">No Show</p>
          <p className="text-2xl font-bold text-red-600">{totalNoShow.toLocaleString()}</p>
          <p className="text-xs text-red-600 mt-1">{noShowRate}%</p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        <Line data={chartData} options={options} />
      </div>

      {/* Date Range Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500">
          Data range: {data[0]?.month}/{data[0]?.year} - {data[data.length - 1]?.month}/{data[data.length - 1]?.year}
        </p>
      </div>
    </div>
  );
}
