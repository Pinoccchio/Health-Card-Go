'use client';

import { Database, Calendar, CreditCard, PieChart, Activity, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface HealthcardDataSourceCardsProps {
  summary: {
    total_records: number;
    total_cards_issued: number;
    food_handler_cards: number;
    non_food_cards: number;
    pink_cards: number;
    from_historical?: {
      total: number;
      food_handler: number;
      non_food: number;
      pink: number;
    };
    from_appointments?: {
      total: number;
      food_handler: number;
      non_food: number;
      pink: number;
    };
    date_range: {
      earliest: string | null;
      latest: string | null;
    };
  };
  loading?: boolean;
  showPinkCards?: boolean;
  pinkCardOnly?: boolean;
}

export function HealthcardDataSourceCards({
  summary,
  loading,
  showPinkCards = true,
  pinkCardOnly = false
}: HealthcardDataSourceCardsProps) {
  const formatDateRange = () => {
    if (!summary.date_range.earliest || !summary.date_range.latest) {
      return 'No data';
    }

    const start = format(new Date(summary.date_range.earliest), 'MMM yyyy');
    const end = format(new Date(summary.date_range.latest), 'MMM yyyy');

    if (start === end) {
      return start;
    }

    return `${start} - ${end}`;
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Show loading skeletons
  if (loading) {
    return (
      <div className="space-y-6 mb-6">
        {/* Loading state */}
        {[1, 2, 3].map((section) => (
          <div key={section} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="h-6 bg-gray-300 rounded animate-pulse w-64 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
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

  // Extract separated data
  const historicalData = summary.from_historical || { total: 0, food_handler: 0, non_food: 0, pink: 0 };
  const appointmentsData = summary.from_appointments || { total: 0, food_handler: 0, non_food: 0, pink: 0 };

  return (
    <div className="space-y-6 mb-6">
      {/* Section 1: Current System Appointments */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg shadow-md border border-blue-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Current System Appointments</h3>
            <p className="text-sm text-gray-600">Health cards issued through appointment bookings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Appointments */}
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <p className="text-sm font-medium text-gray-600">Total Completed</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {appointmentsData.total.toLocaleString()}
            </p>
          </div>

          {/* Yellow Cards */}
          {!pinkCardOnly && (
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <p className="text-sm font-medium text-gray-600">Yellow Cards</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {appointmentsData.food_handler.toLocaleString()}
              </p>
            </div>
          )}

          {/* Green Cards */}
          {!pinkCardOnly && (
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <p className="text-sm font-medium text-gray-600">Green Cards</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {appointmentsData.non_food.toLocaleString()}
              </p>
            </div>
          )}

          {/* Pink Cards */}
          {showPinkCards && (
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
                <p className="text-sm font-medium text-gray-600">Pink Cards</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {appointmentsData.pink.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Service 24 appointments</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Historical Data (Excel Imports) */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md border border-purple-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Historical Data (Excel Imports)</h3>
            <p className="text-sm text-gray-600">Pre-existing records imported from Excel spreadsheets</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Historical */}
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <p className="text-sm font-medium text-gray-600">Total Imported</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">
              {historicalData.total.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">{summary.total_records} Excel records</p>
          </div>

          {/* Yellow Cards Historical */}
          {!pinkCardOnly && (
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <p className="text-sm font-medium text-gray-600">Yellow Cards</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {historicalData.food_handler.toLocaleString()}
              </p>
            </div>
          )}

          {/* Green Cards Historical */}
          {!pinkCardOnly && (
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <p className="text-sm font-medium text-gray-600">Green Cards</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {historicalData.non_food.toLocaleString()}
              </p>
            </div>
          )}

          {/* Pink Cards Historical */}
          {showPinkCards && (
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
                <p className="text-sm font-medium text-gray-600">Pink Cards</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {historicalData.pink.toLocaleString()}
              </p>
            </div>
          )}
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
              Total: {appointmentsData.total} appointments + {historicalData.total} historical records
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Combined */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <p className="text-sm font-medium text-gray-600">Total Cards Issued</p>
            <p className="text-3xl font-bold text-green-600 mt-1">
              {summary.total_cards_issued.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Used for time series forecasting</p>
          </div>

          {/* Yellow Cards Combined */}
          {!pinkCardOnly && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                <p className="text-sm font-medium text-gray-600">Yellow Cards</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.food_handler_cards.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {calculatePercentage(summary.food_handler_cards, summary.total_cards_issued)}% of total
              </p>
            </div>
          )}

          {/* Green Cards Combined */}
          {!pinkCardOnly && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <p className="text-sm font-medium text-gray-600">Green Cards</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.non_food_cards.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {calculatePercentage(summary.non_food_cards, summary.total_cards_issued)}% of total
              </p>
            </div>
          )}

          {/* Pink Cards Combined */}
          {showPinkCards && (
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
                <p className="text-sm font-medium text-gray-600">Pink Cards</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary.pink_cards.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {calculatePercentage(summary.pink_cards, summary.total_cards_issued)}% of total
              </p>
            </div>
          )}

          {/* Date Range */}
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <p className="text-sm font-medium text-gray-600">Date Range</p>
            </div>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {formatDateRange()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.date_range.earliest && summary.date_range.latest
                ? `${Math.ceil(
                    (new Date(summary.date_range.latest).getTime() - new Date(summary.date_range.earliest).getTime()) /
                      (1000 * 60 * 60 * 24 * 365)
                  )} years of data`
                : 'No data available'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
