'use client';

import { Database, Calendar, TrendingUp, FileBarChart } from 'lucide-react';
import { format } from 'date-fns';
import { getDiseaseDisplayName } from '@/lib/constants/diseaseConstants';

interface HistoricalStatsSummaryProps {
  summary: {
    totalRecords: number;
    totalCases: number;
    earliestDate: string | null;
    latestDate: string | null;
    mostCommonDisease: string | null;
    mostCommonDiseaseName?: string | null;
    diseaseTypeCounts: Record<string, number>;
  };
  loading?: boolean;
}

export function HistoricalStatsSummary({ summary, loading }: HistoricalStatsSummaryProps) {
  const formatDateRange = () => {
    if (!summary.earliestDate || !summary.latestDate) {
      return 'No data';
    }

    const start = format(new Date(summary.earliestDate), 'MMM yyyy');
    const end = format(new Date(summary.latestDate), 'MMM yyyy');

    if (start === end) {
      return start;
    }

    return `${start} - ${end}`;
  };

  // Show loading skeletons
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded animate-pulse w-32 mb-3"></div>
                <div className="h-8 bg-gray-300 rounded animate-pulse w-20 mb-2"></div>
              </div>
              <div className="w-12 h-12 bg-gray-300 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-3 bg-gray-300 rounded animate-pulse w-40 mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Records */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Records Imported</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {summary.totalRecords.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Aggregate historical data entries
        </p>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Date Range</p>
            <p className="text-xl font-bold text-gray-900 mt-2">
              {formatDateRange()}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {summary.earliestDate && summary.latestDate
            ? `Spanning ${Math.ceil(
                (new Date(summary.latestDate).getTime() - new Date(summary.earliestDate).getTime()) /
                  (1000 * 60 * 60 * 24 * 365)
              )} years of data`
            : 'No historical data imported yet'}
        </p>
      </div>

      {/* Total Cases */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Cases</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {summary.totalCases.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-amber-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Sum of all case counts from imports
        </p>
      </div>

      {/* Most Common Disease */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Most Common Disease</p>
            <p className="text-xl font-bold text-gray-900 mt-2">
              {summary.mostCommonDisease
                ? getDiseaseDisplayName(summary.mostCommonDisease, summary.mostCommonDiseaseName)
                : 'N/A'}
            </p>
          </div>
          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
            <FileBarChart className="w-6 h-6 text-teal-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {summary.mostCommonDisease && summary.diseaseTypeCounts[summary.mostCommonDisease]
            ? `${summary.diseaseTypeCounts[summary.mostCommonDisease]} records`
            : 'Based on import frequency'}
        </p>
      </div>
    </div>
  );
}
