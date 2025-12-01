'use client';

import BaseLineChart from './BaseLineChart';
import BaseDoughnutChart from './BaseDoughnutChart';
import BaseBarChart from './BaseBarChart';

interface PatientChartsProps {
  data: any;
}

export function PatientRegistrationTrendChart({ data }: PatientChartsProps) {
  if (!data?.trend_data || data.trend_data.length === 0) {
    return <div className="text-center text-gray-500 py-12">No trend data available</div>;
  }

  const chartData = {
    labels: data.trend_data.map((d: any) => d.date),
    datasets: [
      {
        label: 'New Registrations',
        data: data.trend_data.map((d: any) => d.registrations || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Approved',
        data: data.trend_data.map((d: any) => d.approved || 0),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Patient Registration Trends</h3>
      <BaseLineChart data={chartData} height={350} />
    </div>
  );
}

export function PatientStatusChart({ data }: PatientChartsProps) {
  if (!data?.summary) {
    return <div className="text-center text-gray-500 py-12">No summary data available</div>;
  }

  const { active = 0, pending = 0, rejected = 0, inactive = 0 } = data.summary;

  const chartData = {
    labels: ['Active', 'Pending', 'Rejected', 'Inactive'],
    datasets: [
      {
        data: [active, pending, rejected, inactive],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6b7280'],
        borderColor: ['#059669', '#d97706', '#dc2626', '#4b5563'],
        borderWidth: 1,
      },
    ],
  };

  const totalPatients = active + pending + rejected + inactive;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Patient Status Distribution</h3>
      <BaseDoughnutChart
        data={chartData}
        height={300}
        centerText={totalPatients.toString()}
      />
    </div>
  );
}

export function PatientByBarangayChart({ data }: PatientChartsProps) {
  if (!data?.by_barangay || data.by_barangay.length === 0) {
    return <div className="text-center text-gray-500 py-12">No barangay data available</div>;
  }

  // Sort by count and take top 10
  const topBarangays = [...data.by_barangay]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 10);

  const chartData = {
    labels: topBarangays.map((d: any) => d.barangay_name || 'Unknown'),
    datasets: [
      {
        label: 'Patients',
        data: topBarangays.map((d: any) => d.count || 0),
        backgroundColor: '#3b82f6',
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Top 10 Barangays by Patient Count</h3>
      <BaseBarChart data={chartData} height={300} horizontal={true} />
    </div>
  );
}

export function PatientAgeDistributionChart({ data }: PatientChartsProps) {
  if (!data?.by_age_group || data.by_age_group.length === 0) {
    return <div className="text-center text-gray-500 py-12">No age data available</div>;
  }

  const chartData = {
    labels: data.by_age_group.map((d: any) => d.age_group || 'Unknown'),
    datasets: [
      {
        label: 'Patients',
        data: data.by_age_group.map((d: any) => d.count || 0),
        backgroundColor: [
          '#3b82f6',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#ec4899',
        ],
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Age Distribution</h3>
      <BaseBarChart data={chartData} height={300} />
    </div>
  );
}
