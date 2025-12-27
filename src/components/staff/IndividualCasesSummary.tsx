'use client';

import { Activity, Calendar, AlertTriangle } from 'lucide-react';

interface IndividualCasesSummaryProps {
  stats: {
    total: number;
    this_month: number;
    active: number;
  };
  loading?: boolean;
}

export function IndividualCasesSummary({ stats, loading }: IndividualCasesSummaryProps) {
  // Show loading skeletons
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Total Records */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Records</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.total.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          All individual disease cases
        </p>
      </div>

      {/* This Month */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">This Month</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.this_month.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Cases diagnosed this month
        </p>
      </div>

      {/* Active Cases */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Active Cases</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.active.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Currently active or ongoing treatment
        </p>
      </div>
    </div>
  );
}
