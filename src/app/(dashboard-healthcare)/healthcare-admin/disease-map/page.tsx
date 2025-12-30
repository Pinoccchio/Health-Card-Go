'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import DiseaseHeatmap from '@/components/disease-surveillance/DiseaseHeatmap';
import { DISEASE_TYPE_LABELS } from '@/lib/constants/diseaseConstants';
import { format } from 'date-fns';
import { Map, Filter, Calendar, RefreshCw, AlertCircle, Info } from 'lucide-react';

interface HeatmapData {
  barangay_id: number;
  barangay_name: string;
  coordinates: any;
  statistics: {
    total_cases: number;
    active_cases: number;
    critical_cases: number;
    severe_cases: number;
    recovered_cases: number;
  };
  diseases: Array<{
    disease_type: string;
    custom_disease_name: string | null;
    total_count: number;
    active_count: number;
    critical_count: number;
  }>;
  intensity: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

export default function HealthcareAdminDiseaseMap() {
  const { user } = useAuth();
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [selectedDiseaseType, setSelectedDiseaseType] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'), // 30 days ago
    endDate: format(new Date(), 'yyyy-MM-dd'), // Today
  });

  useEffect(() => {
    fetchHeatmapData();
  }, [selectedDiseaseType, dateRange]);

  const fetchHeatmapData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      // Build query params
      const params = new URLSearchParams();
      if (selectedDiseaseType !== 'all') {
        params.append('disease_type', selectedDiseaseType);
      }
      params.append('start_date', dateRange.startDate);
      params.append('end_date', dateRange.endDate);

      const response = await fetch(`/api/diseases/heatmap-data?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setHeatmapData(data.data || []);
      } else {
        setError(data.message || 'Failed to load heatmap data');
      }
    } catch (err) {
      console.error('Error fetching heatmap data:', err);
      setError('An unexpected error occurred while loading the disease map');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchHeatmapData(true);
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const totalCases = heatmapData.reduce((sum, b) => sum + b.statistics.total_cases, 0);
  const activeCases = heatmapData.reduce((sum, b) => sum + b.statistics.active_cases, 0);
  const criticalCases = heatmapData.reduce((sum, b) => sum + b.statistics.critical_cases, 0);
  const barangaysAffected = heatmapData.filter(b => b.statistics.total_cases > 0).length;

  if (error) {
    return (
      <DashboardLayout
        roleId={2}
        pageTitle="Disease Map"
        pageDescription="View disease distribution across barangays"
      >
        <Container size="full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Disease Map</h3>
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Disease Map"
      pageDescription="View disease distribution across barangays"
    >
      <Container size="full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Map className="w-7 h-7 text-primary-teal" />
              Disease Surveillance Map
            </h2>
            <p className="text-gray-600">
              View real-time disease distribution across Panabo City barangays
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">About This Map</h4>
            <p className="text-sm text-blue-800">
              This disease surveillance map shows the geographic distribution of disease cases across barangays.
              Use the filters below to view specific diseases or date ranges. Circle size represents case count,
              and color indicates risk level.
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-600 mb-1">Total Cases</p>
            <p className="text-2xl font-bold text-gray-900">{totalCases}</p>
            <p className="text-xs text-gray-500 mt-1">
              in selected period
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-600 mb-1">Active Cases</p>
            <p className="text-2xl font-bold text-orange-600">{activeCases}</p>
            <p className="text-xs text-gray-500 mt-1">
              currently active
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-600 mb-1">Critical Cases</p>
            <p className="text-2xl font-bold text-red-600">{criticalCases}</p>
            <p className="text-xs text-gray-500 mt-1">
              requiring attention
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm font-medium text-gray-600 mb-1">Barangays Affected</p>
            <p className="text-2xl font-bold text-primary-teal">{barangaysAffected}</p>
            <p className="text-xs text-gray-500 mt-1">
              out of 41 total
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Disease Type Filter */}
            <div>
              <label htmlFor="disease-type" className="block text-sm font-medium text-gray-700 mb-2">
                Disease Type
              </label>
              <select
                id="disease-type"
                value={selectedDiseaseType}
                onChange={(e) => setSelectedDiseaseType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              >
                <option value="all">All Diseases</option>
                {Object.entries(DISEASE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                max={dateRange.endDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                min={dateRange.startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              />
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setDateRange({
                startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
              })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange({
                startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
              })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange({
                startDate: format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                endDate: format(new Date(), 'yyyy-MM-dd'),
              })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Last 90 Days
            </button>
          </div>
        </div>

        {/* Disease Heatmap */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Map className="w-5 h-5 text-primary-teal" />
            Disease Distribution Map
          </h3>

          {loading ? (
            <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 text-primary-teal animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Loading map data...</p>
              </div>
            </div>
          ) : heatmapData.length === 0 ? (
            <div className="h-96 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <Map className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-1">No disease data found for the selected filters</p>
                <p className="text-sm text-gray-500">Try adjusting the date range or disease type</p>
              </div>
            </div>
          ) : (
            <DiseaseHeatmap data={heatmapData} diseaseType={selectedDiseaseType} />
          )}
        </div>

        {/* Data Summary */}
        {!loading && heatmapData.length > 0 && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              <strong>Data Period:</strong> {format(new Date(dateRange.startDate), 'MMMM d, yyyy')} to{' '}
              {format(new Date(dateRange.endDate), 'MMMM d, yyyy')}
              {selectedDiseaseType !== 'all' && (
                <>
                  {' • '}
                  <strong>Disease:</strong> {DISEASE_TYPE_LABELS[selectedDiseaseType as keyof typeof DISEASE_TYPE_LABELS]}
                </>
              )}
            </p>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
