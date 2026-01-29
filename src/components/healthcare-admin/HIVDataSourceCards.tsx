'use client';

import { Activity, FileSpreadsheet, TrendingUp, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface DateRange {
  earliest: string | null;
  latest: string | null;
}

interface HIVDataSourceCardsProps {
  summary: {
    from_appointments: {
      total: number;
      completed: number;
      cancelled: number;
    };
    from_historical: {
      total_appointments: number;
      record_count: number;
    };
    combined: {
      total: number;
    };
    date_range: DateRange;
    historical_date_range?: DateRange;
    appointments_date_range?: DateRange;
  };
  loading?: boolean;
}

export function HIVDataSourceCards({ summary, loading }: HIVDataSourceCardsProps) {
  const formatDateRange = (range: DateRange) => {
    if (!range.earliest || !range.latest) {
      return 'No data';
    }

    const start = format(new Date(range.earliest), 'MMM yyyy');
    const end = format(new Date(range.latest), 'MMM yyyy');

    if (start === end) return start;
    return `${start} - ${end}`;
  };

  const calculateYears = (range: DateRange) => {
    if (!range.earliest || !range.latest) return 0;
    return Math.ceil(
      (new Date(range.latest).getTime() - new Date(range.earliest).getTime()) /
        (1000 * 60 * 60 * 24 * 365)
    );
  };

  // Use separate date ranges: historical for imports, appointments for system data
  const historicalRange = summary.historical_date_range ?? summary.date_range;
  const appointmentsRange = summary.appointments_date_range ?? summary.date_range;

  if (loading) {
    return (
      <div className="space-y-6 mb-6">
        {[1, 2, 3].map((section) => (
          <div key={section} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="h-6 bg-gray-300 rounded animate-pulse w-64 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="h-4 bg-gray-300 rounded animate-pulse w-32 mb-3"></div>
                  <div className="h-8 bg-gray-300 rounded animate-pulse w-20"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Section 1: Current System Appointments */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md border border-purple-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Current System Appointments</h3>
            <p className="text-sm text-gray-600">HIV testing appointments from the booking system</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <p className="text-sm font-medium text-gray-600">Total Appointments</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">
              {summary.from_appointments.total.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {summary.from_appointments.completed.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <p className="text-sm font-medium text-gray-600">Cancelled</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {summary.from_appointments.cancelled.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: Historical Data (Excel Imports) */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-lg shadow-md border border-indigo-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Historical Data (Excel Imports)</h3>
            <p className="text-sm text-gray-600">Pre-existing HIV testing records imported from spreadsheets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-200">
            <p className="text-sm font-medium text-gray-600">Total Imported Appointments</p>
            <p className="text-3xl font-bold text-indigo-600 mt-1">
              {summary.from_historical.total_appointments.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.from_historical.record_count} Excel records
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <p className="text-sm font-medium text-gray-600">Import Date Range</p>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {formatDateRange(historicalRange)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {historicalRange.earliest ? `${calculateYears(historicalRange)} years of data` : 'No data available'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Combined Dataset (For SARIMA) */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg shadow-md border border-green-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Combined Dataset (For SARIMA Predictions)</h3>
            <p className="text-sm text-gray-600">
              Total: {summary.from_appointments.completed} appointments + {summary.from_historical.total_appointments} historical records
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="text-sm font-medium text-gray-600">Total HIV Testing Appointments</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {summary.combined.total.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Used for time series forecasting</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="text-sm font-medium text-gray-600">From Appointments</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary.from_appointments.completed.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.combined.total > 0
                ? `${Math.round((summary.from_appointments.completed / summary.combined.total) * 100)}% of total`
                : '0%'}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="text-sm font-medium text-gray-600">From Excel Imports</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary.from_historical.total_appointments.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.combined.total > 0
                ? `${Math.round((summary.from_historical.total_appointments / summary.combined.total) * 100)}% of total`
                : '0%'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
