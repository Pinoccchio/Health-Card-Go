'use client';

import { Database, Calendar, CreditCard, PieChart } from 'lucide-react';
import { format } from 'date-fns';

interface HealthcardStatsSummaryProps {
  summary: {
    total_records: number;
    total_cards_issued: number;
    food_handler_cards: number;
    non_food_cards: number;
    pink_cards: number; // ADDED: Pink Card support
    date_range: {
      earliest: string | null;
      latest: string | null;
    };
  };
  loading?: boolean;
  showPinkCards?: boolean; // NEW: Control visibility of pink cards
}

export function HealthcardStatsSummary({ summary, loading, showPinkCards = true }: HealthcardStatsSummaryProps) {
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
              {summary.total_records.toLocaleString()}
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
          {summary.date_range.earliest && summary.date_range.latest
            ? `Spanning ${Math.ceil(
                (new Date(summary.date_range.latest).getTime() - new Date(summary.date_range.earliest).getTime()) /
                  (1000 * 60 * 60 * 24 * 365)
              )} years of data`
            : 'No historical data imported yet'}
        </p>
      </div>

      {/* Total Cards Issued */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Cards Issued</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {summary.total_cards_issued.toLocaleString()}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Sum of all healthcard issuances
        </p>
      </div>

      {/* Card Type Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Card Type Distribution</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Yellow Card:
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {calculatePercentage(summary.food_handler_cards, summary.total_cards_issued)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Green Card:
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {calculatePercentage(summary.non_food_cards, summary.total_cards_issued)}%
                </span>
              </div>
              {showPinkCards && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 flex items-center gap-1">
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    Pink Card:
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {calculatePercentage(summary.pink_cards, summary.total_cards_issued)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
            <PieChart className="w-6 h-6 text-teal-600" />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {summary.food_handler_cards.toLocaleString()} yellow, {summary.non_food_cards.toLocaleString()} green{showPinkCards && `, ${summary.pink_cards.toLocaleString()} pink`}
        </p>
      </div>
    </div>
  );
}
