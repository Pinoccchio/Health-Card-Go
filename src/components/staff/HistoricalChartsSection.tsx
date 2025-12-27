'use client';

import { useMemo } from 'react';
import HistoricalTrendChart from './charts/HistoricalTrendChart';
import HistoricalBarangayChart from './charts/HistoricalBarangayChart';
import HistoricalDiseaseChart from './charts/HistoricalDiseaseChart';

interface HistoricalChartsSectionProps {
  historicalStatistics: any[];
  barangays: Array<{ id: number; name: string; code?: string }>;
  isLoading?: boolean;
  onRefresh?: () => void;
  timeRangeMonths?: number | 'all';
}

export function HistoricalChartsSection({
  historicalStatistics,
  barangays,
  isLoading = false,
  onRefresh,
  timeRangeMonths = 24,
}: HistoricalChartsSectionProps) {
  // Memoize to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    return historicalStatistics || [];
  }, [historicalStatistics]);

  const hasData = chartData && chartData.length > 0;

  if (!hasData && !isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
        <p className="text-blue-900 font-medium mb-2">No Historical Chart Data Available</p>
        <p className="text-blue-700 text-sm">
          Historical disease trend charts will appear here once historical statistics are imported.
          Visit the{' '}
          <a
            href="/staff/disease-surveillance"
            className="underline hover:text-blue-900 font-semibold"
          >
            Disease Surveillance
          </a>{' '}
          page to import historical data from DOH bulletins or CHO records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Full-width line chart for historical trends */}
      <HistoricalTrendChart
        data={chartData}
        isLoading={isLoading}
        onRefresh={onRefresh}
        timeRangeMonths={timeRangeMonths}
      />

      {/* Two-column layout for bar and pie charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Barangay distribution - takes 60% */}
        <div className="lg:col-span-3">
          <HistoricalBarangayChart data={chartData} barangays={barangays} timeRangeMonths={timeRangeMonths} />
        </div>

        {/* Disease type distribution - takes 40% */}
        <div className="lg:col-span-2">
          <HistoricalDiseaseChart data={chartData} timeRangeMonths={timeRangeMonths} />
        </div>
      </div>

      {/* Footer note */}
      {hasData && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 text-center">
            Charts display aggregate case counts from historical disease statistics records.
            Click the refresh button on the Historical Disease Trends chart to manually update all charts with the latest data.
          </p>
        </div>
      )}
    </div>
  );
}
