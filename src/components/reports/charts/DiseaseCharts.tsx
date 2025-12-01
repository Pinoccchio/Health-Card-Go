'use client';

import BaseLineChart from './BaseLineChart';
import BasePieChart from './BasePieChart';
import BaseBarChart from './BaseBarChart';

interface DiseaseChartsProps {
  data: any;
}

export function DiseaseDistributionChart({ data }: DiseaseChartsProps) {
  if (!data?.by_disease_type || data.by_disease_type.length === 0) {
    return <div className="text-center text-gray-500 py-12">No disease data available</div>;
  }

  const diseaseColors: Record<string, string> = {
    hiv_aids: '#ef4444',
    dengue: '#f59e0b',
    malaria: '#14b8a6',
    measles: '#8b5cf6',
    rabies: '#ec4899',
    pregnancy_complications: '#f97316',
  };

  const chartData = {
    labels: data.by_disease_type.map((d: any) =>
      (d.disease_type || 'Unknown').replace(/_/g, ' ').toUpperCase()
    ),
    datasets: [
      {
        data: data.by_disease_type.map((d: any) => d.count || 0),
        backgroundColor: data.by_disease_type.map(
          (d: any) => diseaseColors[d.disease_type] || '#6b7280'
        ),
        borderColor: data.by_disease_type.map((d: any) => {
          const color = diseaseColors[d.disease_type] || '#6b7280';
          return color.replace('0.8', '1');
        }),
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
  if (!data?.trend_data || data.trend_data.length === 0) {
    return <div className="text-center text-gray-500 py-12">No trend data available</div>;
  }

  const chartData = {
    labels: data.trend_data.map((d: any) => d.date),
    datasets: [
      {
        label: 'New Cases',
        data: data.trend_data.map((d: any) => d.new_cases || 0),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Active Cases',
        data: data.trend_data.map((d: any) => d.active_cases || 0),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Recovered',
        data: data.trend_data.map((d: any) => d.recovered || 0),
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
        label: 'Cases',
        data: topBarangays.map((d: any) => d.count || 0),
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
  if (!data?.by_severity || data.by_severity.length === 0) {
    return <div className="text-center text-gray-500 py-12">No severity data available</div>;
  }

  const severityColors: Record<string, string> = {
    mild: '#10b981',
    moderate: '#f59e0b',
    severe: '#ef4444',
  };

  const chartData = {
    labels: data.by_severity.map((d: any) =>
      (d.severity || 'Unknown').toUpperCase()
    ),
    datasets: [
      {
        data: data.by_severity.map((d: any) => d.count || 0),
        backgroundColor: data.by_severity.map(
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
