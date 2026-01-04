'use client';

import BaseLineChart from './BaseLineChart';
import BasePieChart from './BasePieChart';
import BaseBarChart from './BaseBarChart';
import { ensureArray, safeNumber } from '@/lib/utils/reportHelpers';
import { getDiseaseColor } from '@/lib/utils/colorUtils';
import { formatDiseaseType } from '@/lib/utils/chartDataTransformers';

interface DiseaseChartsProps {
  data: any;
}

export function DiseaseDistributionChart({ data }: DiseaseChartsProps) {
  const byDiseaseType = ensureArray(data?.by_disease_type);

  if (byDiseaseType.length === 0) {
    return <div className="text-center text-gray-500 py-12">No disease data available</div>;
  }

  const chartData = {
    labels: byDiseaseType.map((d: any) => {
      // Format label using custom disease name if available
      return formatDiseaseType(d.disease_type || 'Unknown', d.custom_disease_name);
    }),
    datasets: [
      {
        data: byDiseaseType.map((d: any) => safeNumber(d.count, 0)),
        backgroundColor: byDiseaseType.map((d: any) =>
          getDiseaseColor(d.disease_type || 'other', d.custom_disease_name)
        ),
        borderColor: byDiseaseType.map((d: any) =>
          getDiseaseColor(d.disease_type || 'other', d.custom_disease_name)
        ),
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Disease Type Distribution</h3>
      <BasePieChart data={chartData} height={300} />
    </div>
  );
}

export function DiseaseTrendChart({ data }: DiseaseChartsProps) {
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
        label: 'New Cases',
        data: trendData.map((d: any) => safeNumber(d.new_cases, 0)),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Active Cases',
        data: trendData.map((d: any) => safeNumber(d.active_cases, 0)),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Recovered',
        data: trendData.map((d: any) => safeNumber(d.recovered, 0)),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Disease Trends Over Time</h3>
      <BaseLineChart data={chartData} height={350} />
    </div>
  );
}

export function DiseaseByBarangayChart({ data }: DiseaseChartsProps) {
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
        label: 'Cases',
        data: topBarangays.map((d: any) => safeNumber(d.count, 0)),
        backgroundColor: '#3b82f6',
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Top 10 Barangays by Cases</h3>
      <BaseBarChart data={chartData} height={300} horizontal={true} />
    </div>
  );
}

export function DiseaseSeverityChart({ data }: DiseaseChartsProps) {
  const bySeverity = ensureArray(data?.by_severity);

  if (bySeverity.length === 0) {
    return <div className="text-center text-gray-500 py-12">No severity data available</div>;
  }

  const severityColors: Record<string, string> = {
    mild: '#10b981',
    moderate: '#f59e0b',
    severe: '#ef4444',
  };

  const chartData = {
    labels: bySeverity.map((d: any) =>
      (d.severity || 'Unknown').toUpperCase()
    ),
    datasets: [
      {
        data: bySeverity.map((d: any) => safeNumber(d.count, 0)),
        backgroundColor: bySeverity.map(
          (d: any) => severityColors[d.severity] || '#6b7280'
        ),
        borderColor: ['#059669', '#d97706', '#dc2626'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Severity Distribution</h3>
      <BasePieChart data={chartData} height={250} />
    </div>
  );
}
