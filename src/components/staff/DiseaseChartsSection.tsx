'use client';

import { useMemo } from 'react';
import DiseaseTrendChart from './charts/DiseaseTrendChart';
import BarangayDistributionChart from './charts/BarangayDistributionChart';
import DiseaseTypeChart from './charts/DiseaseTypeChart';

interface DiseaseChartsSectionProps {
  individualCases: any[];
  barangays: Array<{ id: number; name: string; code?: string }>;
  isLoading?: boolean;
  onRefresh?: () => void;
  timeRangeMonths?: number | 'all';
}

export function DiseaseChartsSection({
  individualCases,
  barangays,
  isLoading = false,
  onRefresh,
  timeRangeMonths = 24,
}: DiseaseChartsSectionProps) {
  // Memoize to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    return individualCases || [];
  }, [individualCases]);

  const hasData = chartData && chartData.length > 0;

  if (!hasData && !isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <p className="text-blue-900 font-medium mb-2">No Chart Data Available</p>
        <p className="text-blue-700 text-sm">
          Disease trend charts will appear here once disease cases are recorded.
          Visit the{' '}
          <a
            href="/staff/disease-surveillance"
            className="underline hover:text-blue-900 font-semibold"
          >
            Disease Surveillance
          </a>{' '}
          page to add new cases.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Full-width line chart for trends */}
      <DiseaseTrendChart
        data={chartData}
        isLoading={isLoading}
        onRefresh={onRefresh}
        timeRangeMonths={timeRangeMonths}
      />

      {/* Two-column layout for bar and pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Barangay distribution - takes 60% */}
        <div className="lg:col-span-3">
          <BarangayDistributionChart data={chartData} barangays={barangays} timeRangeMonths={timeRangeMonths} />
        </div>

        {/* Disease type distribution - takes 40% */}
        <div className="lg:col-span-2">
          <DiseaseTypeChart data={chartData} timeRangeMonths={timeRangeMonths} />
        </div>
      </div>

      {/* Footer note */}
      {hasData && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 text-center">
            Charts are updated in real-time based on recorded disease cases. Click the refresh
            button on the Disease Trends chart to manually update all charts with the latest data.
          </p>
        </div>
      )}
    </div>
  );
}
