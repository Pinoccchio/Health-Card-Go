'use client';

import { useEffect, useState } from 'react';

interface Barangay {
  id: number;
  name: string;
  code: string;
}

interface ReportsFiltersProps {
  startDate: string;
  endDate: string;
  barangayId: number | undefined;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onBarangayChange: (barangayId: number | undefined) => void;
  onApplyFilters: () => void;
}

export default function ReportsFilters({
  startDate,
  endDate,
  barangayId,
  onStartDateChange,
  onEndDateChange,
  onBarangayChange,
  onApplyFilters,
}: ReportsFiltersProps) {
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loadingBarangays, setLoadingBarangays] = useState(true);

  // Fetch barangays on mount
  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const response = await fetch('/api/barangays');
        if (response.ok) {
          const data = await response.json();
          setBarangays(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching barangays:', error);
      } finally {
        setLoadingBarangays(false);
      }
    };

    fetchBarangays();
  }, []);

  // Quick preset handlers
  const handlePresetClick = (preset: 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'allTime') => {
    const today = new Date();
    let newStartDate = '';
    let newEndDate = today.toISOString().split('T')[0];

    switch (preset) {
      case 'last7days':
        newStartDate = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
        break;
      case 'last30days':
        newStartDate = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
        break;
      case 'thisMonth':
        newStartDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        newEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'lastMonth':
        newStartDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
        newEndDate = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'allTime':
        // Wide date range to include all historical data
        newStartDate = '2000-01-01';
        newEndDate = '2099-12-31';
        break;
    }

    onStartDateChange(newStartDate);
    onEndDateChange(newEndDate);
  };

  const handleReset = () => {
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    onStartDateChange(last30Days.toISOString().split('T')[0]);
    onEndDateChange(today.toISOString().split('T')[0]);
    onBarangayChange(undefined);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h3>

        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => handlePresetClick('last7days')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Last 7 Days
          </button>
          <button
            onClick={() => handlePresetClick('last30days')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Last 30 Days
          </button>
          <button
            onClick={() => handlePresetClick('thisMonth')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            This Month
          </button>
          <button
            onClick={() => handlePresetClick('lastMonth')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Last Month
          </button>
          <button
            onClick={() => handlePresetClick('allTime')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            All Time
          </button>
        </div>

        {/* Date Range Inputs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="barangay" className="block text-sm font-medium text-gray-700 mb-1">
              Barangay (Optional)
            </label>
            {loadingBarangays ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                <span className="text-sm text-gray-500">Loading barangays...</span>
              </div>
            ) : (
              <select
                id="barangay"
                value={barangayId || ''}
                onChange={(e) => onBarangayChange(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Barangays</option>
                {barangays.map((barangay) => (
                  <option key={barangay.id} value={barangay.id}>
                    {barangay.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onApplyFilters}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Current Filter Summary */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Showing:</span>{' '}
          {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          {barangayId && (
            <>
              {' • '}
              <span className="font-medium">Barangay:</span>{' '}
              {barangays.find(b => b.id === barangayId)?.name || 'Unknown'}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
