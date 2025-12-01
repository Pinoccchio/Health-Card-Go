'use client';

import BaseLineChart from './BaseLineChart';
import BasePieChart from './BasePieChart';
import BaseBarChart from './BaseBarChart';

interface AppointmentChartsProps {
  data: any;
}

export function AppointmentTrendChart({ data }: AppointmentChartsProps) {
  if (!data?.trend_data || data.trend_data.length === 0) {
    return <div className="text-center text-gray-500 py-12">No trend data available</div>;
  }

  const chartData = {
    labels: data.trend_data.map((d: any) => d.date),
    datasets: [
      {
        label: 'Scheduled',
        data: data.trend_data.map((d: any) => d.scheduled || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Completed',
        data: data.trend_data.map((d: any) => d.completed || 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Cancelled',
        data: data.trend_data.map((d: any) => d.cancelled || 0),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'No Show',
        data: data.trend_data.map((d: any) => d.no_show || 0),
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

  const { completed = 0, cancelled = 0, no_show = 0, scheduled = 0 } = data.summary;

  const chartData = {
    labels: ['Completed', 'Scheduled', 'Cancelled', 'No Show'],
    datasets: [
      {
        data: [completed, scheduled, cancelled, no_show],
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
  if (!data?.by_service || data.by_service.length === 0) {
    return <div className="text-center text-gray-500 py-12">No service data available</div>;
  }

  const chartData = {
    labels: data.by_service.map((d: any) => d.service_name || 'Unknown'),
    datasets: [
      {
        label: 'Appointments',
        data: data.by_service.map((d: any) => d.count || 0),
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
