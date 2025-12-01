'use client';

import BaseLineChart from './BaseLineChart';
import BasePieChart from './BasePieChart';
import BaseBarChart from './BaseBarChart';
import { ensureArray, safeNumber, getSummaryValue } from '@/lib/utils/reportHelpers';

interface AppointmentChartsProps {
  data: any;
}

export function AppointmentTrendChart({ data }: AppointmentChartsProps) {
  const trendData = ensureArray(data?.trend_data);

  if (trendData.length === 0) {
    return <div className="text-center text-gray-500 py-12">No trend data available</div>;
  }

  // ✅ FIX: Check for insufficient data points
  if (trendData.length < 2) {
    return (
      <div className="text-center text-gray-500 py-12">
        <p className="font-medium">Insufficient data for trend analysis</p>
        <p className="text-sm mt-2">
          {trendData.length} data point(s) available. Minimum 2 data points across different dates are required to display trends.
        </p>
      </div>
    );
  }

  const chartData = {
    labels: trendData.map((d: any) => d.date || ''),
    datasets: [
      {
        label: 'Scheduled',
        data: trendData.map((d: any) => safeNumber(d.scheduled, 0)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Completed',
        data: trendData.map((d: any) => safeNumber(d.completed, 0)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Cancelled',
        data: trendData.map((d: any) => safeNumber(d.cancelled, 0)),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'No Show',
        data: trendData.map((d: any) => safeNumber(d.no_show, 0)),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Appointment Trends Over Time</h3>
      <BaseLineChart data={chartData} height={350} />
    </div>
  );
}

export function AppointmentStatusChart({ data }: AppointmentChartsProps) {
  if (!data?.summary) {
    return <div className="text-center text-gray-500 py-12">No summary data available</div>;
  }

  const completed = safeNumber(getSummaryValue(data, 'completed', 0), 0);
  const cancelled = safeNumber(getSummaryValue(data, 'cancelled', 0), 0);
  const noShow = safeNumber(getSummaryValue(data, 'no_show', 0), 0);
  const scheduled = safeNumber(getSummaryValue(data, 'scheduled', 0), 0);

  const chartData = {
    labels: ['Completed', 'Scheduled', 'Cancelled', 'No Show'],
    datasets: [
      {
        data: [completed, scheduled, cancelled, noShow],
        backgroundColor: [
          '#10b981', // green
          '#3b82f6', // blue
          '#ef4444', // red
          '#f59e0b', // amber
        ],
        borderColor: ['#059669', '#2563eb', '#dc2626', '#d97706'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Status Distribution</h3>
      <BasePieChart data={chartData} height={300} />
    </div>
  );
}

export function AppointmentByServiceChart({ data }: AppointmentChartsProps) {
  const byService = ensureArray(data?.by_service);

  if (byService.length === 0) {
    return <div className="text-center text-gray-500 py-12">No service data available</div>;
  }

  const chartData = {
    labels: byService.map((d: any) => d.service_name || 'Unknown'),
    datasets: [
      {
        label: 'Appointments',
        data: byService.map((d: any) => safeNumber(d.count, 0)),
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#ec4899',
          '#14b8a6',
        ],
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Appointments by Service</h3>
      <BaseBarChart data={chartData} height={300} horizontal={true} />
    </div>
  );
}
