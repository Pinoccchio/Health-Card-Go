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
  diseaseType?: string;
}

export function HistoricalChartsSection({
  historicalStatistics,
  barangays,
  isLoading = false,
  onRefresh,
  timeRangeMonths = 24,
  diseaseType,
}: HistoricalChartsSectionProps) {
  // Memoize to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    return historicalStatistics || [];
  }, [historicalStatistics]);

  const hasData = chartData && chartData.length > 0;

  // Show loading skeleton while data is being fetched
  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Full-width line chart skeleton */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-56 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-[400px] bg-gray-100 rounded animate-pulse"></div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="h-3 w-96 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>
        </div>

        {/* Two-column layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Barangay distribution skeleton - 60% */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-64 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-[400px] bg-gray-100 rounded animate-pulse"></div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="h-3 w-80 bg-gray-200 rounded mx-auto animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Disease type distribution skeleton - 40% */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-56 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-[400px] bg-gray-100 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <HistoricalBarangayChart data={chartData} barangays={barangays} timeRangeMonths={timeRangeMonths} diseaseType={diseaseType} />
        </div>

        {/* Disease type distribution - takes 40% */}
        <div className="lg:col-span-2">
          <HistoricalDiseaseChart data={chartData} timeRangeMonths={timeRangeMonths} diseaseType={diseaseType} />
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
