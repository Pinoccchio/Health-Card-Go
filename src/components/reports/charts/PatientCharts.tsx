'use client';

import BaseLineChart from './BaseLineChart';
import BaseDoughnutChart from './BaseDoughnutChart';
import BaseBarChart from './BaseBarChart';
import { ensureArray, safeNumber, getSummaryValue } from '@/lib/utils/reportHelpers';

interface PatientChartsProps {
  data: any;
}

export function PatientRegistrationTrendChart({ data }: PatientChartsProps) {
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
        label: 'New Registrations',
        data: trendData.map((d: any) => safeNumber(d.registrations, 0)),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Approved',
        data: trendData.map((d: any) => safeNumber(d.approved, 0)),
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

  const active = safeNumber(getSummaryValue(data, 'active', 0), 0);
  const pending = safeNumber(getSummaryValue(data, 'pending', 0), 0);
  const rejected = safeNumber(getSummaryValue(data, 'rejected', 0), 0);
  const inactive = safeNumber(getSummaryValue(data, 'inactive', 0), 0);

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
  const byBarangay = ensureArray(data?.by_barangay);

  if (byBarangay.length === 0) {
    return <div className="text-center text-gray-500 py-12">No barangay data available</div>;
  }

  // Sort by count and take top 10
  const topBarangays = [...byBarangay]
    .sort((a, b) => safeNumber(b.count, 0) - safeNumber(a.count, 0))
    .slice(0, 10);

  const chartData = {
    labels: topBarangays.map((d: any) => d.barangay_name || 'Unknown'),
    datasets: [
      {
        label: 'Patients',
        data: topBarangays.map((d: any) => safeNumber(d.count, 0)),
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
  const byAgeGroup = ensureArray(data?.by_age_group);

  if (byAgeGroup.length === 0) {
    return <div className="text-center text-gray-500 py-12">No age data available</div>;
  }

  const chartData = {
    labels: byAgeGroup.map((d: any) => d.age_group || 'Unknown'),
    datasets: [
      {
        label: 'Patients',
        data: byAgeGroup.map((d: any) => safeNumber(d.count, 0)),
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
