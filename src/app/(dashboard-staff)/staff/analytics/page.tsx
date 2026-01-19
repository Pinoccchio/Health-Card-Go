'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import DiseaseHeatmap from '@/components/disease-surveillance/DiseaseHeatmap';
import SARIMAChart from '@/components/disease-surveillance/SARIMAChart';
import OutbreakAlerts from '@/components/disease-surveillance/OutbreakAlerts';
import { HistoricalChartsSection } from '@/components/staff/HistoricalChartsSection';
import { interpretMAPE, getMAPEColor } from '@/lib/utils/sarimaMetrics';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar,
  BarChart3,
  Database,
  LineChart,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

type DiseaseType = 'all' | 'dengue' | 'hiv_aids' | 'pregnancy_complications' | 'malaria' | 'measles' | 'rabies' | 'other';
type TabType = 'historical-statistics' | 'predictions';
type TimeRange = 6 | 12 | 24 | 'all';

interface SummaryStats {
  historicalStats: {
    totalRecords: number;
    totalCases: number;
    dateRange: string;
  };
}

export default function StaffAnalyticsPage() {
  // Tab and filter states
  const [activeTab, setActiveTab] = useState<TabType>('predictions');
  // FIX: Tab-specific disease filters to prevent cross-tab filter sharing
  const [diseaseFilterByTab, setDiseaseFilterByTab] = useState<Record<TabType, DiseaseType>>({
    'predictions': 'all',
    'historical-statistics': 'all'
  });
  // Tab-specific barangay filters (null = all barangays)
  const [barangayFilterByTab, setBarangayFilterByTab] = useState<Record<TabType, number | null>>({
    'predictions': null,
    'historical-statistics': null
  });
  const [timeRange, setTimeRange] = useState<TimeRange>(24);

  // Data states
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    historicalStats: { totalRecords: 0, totalCases: 0, dateRange: '-' },
  });

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prediction generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
    details?: any; // Full API response for detailed display
  }>({ type: 'idle' });
  const [refreshKey, setRefreshKey] = useState(0);

  // FIX: Helper to get current tab's selected disease filter
  const selectedDisease = diseaseFilterByTab[activeTab];
  // Helper to get current tab's selected barangay filter
  const selectedBarangay = barangayFilterByTab[activeTab];

  // OPTIMIZATION: Load data based on active tab instead of all at once
  useEffect(() => {
    setLoading(true); // CRITICAL FIX: Set loading state before fetching data
    loadBarangays(); // Always load barangays for dropdowns

    if (activeTab === 'predictions') {
      loadHeatmapData();
    } else if (activeTab === 'historical-statistics') {
      loadChartsData();
    }
  }, [activeTab]);

  // FIX: Reload data when TAB-SPECIFIC filters change (not shared across tabs)
  useEffect(() => {
    if (activeTab === 'predictions') {
      loadHeatmapData();
    } else if (activeTab === 'historical-statistics') {
      loadChartsData();
    }
  }, [diseaseFilterByTab[activeTab], barangayFilterByTab[activeTab], timeRange]); // NEW: Watch barangay filter changes

  const loadHeatmapData = async () => {
    setLoading(true); // CRITICAL FIX: Show loading indicator when heatmap data is being fetched
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedDisease !== 'all') {
        params.append('disease_type', selectedDisease); // FIX: Changed from 'type' to 'disease_type' to match API expectation
      }
      if (selectedBarangay !== null) {
        params.append('barangay_id', selectedBarangay.toString()); // NEW: Add barangay filter
      }

      const response = await fetch(`/api/diseases/heatmap-data?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setHeatmapData(data);
      } else {
        setError(data.error || 'Failed to load heatmap data');
      }
    } catch (err) {
      console.error('Error loading heatmap data:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false); // CRITICAL FIX: Ensure loading state is always reset
    }
  };

  const loadChartsData = async () => {
    setChartsLoading(true);
    setError(null);

    try {
      // FIX: Build disease filter parameters for Historical Statistics API
      const historicalParams = new URLSearchParams();
      if (selectedDisease !== 'all') {
        historicalParams.append('disease_type', selectedDisease); // Note: /api/diseases/historical uses 'disease_type' parameter
      }
      if (selectedBarangay !== null) {
        historicalParams.append('barangay_id', selectedBarangay.toString()); // NEW: Add barangay filter
      }

      // Fetch historical statistics WITH disease filter
      const historicalRes = await fetch(`/api/diseases/historical?${historicalParams.toString()}`);
      const historicalResData = await historicalRes.json();
      const allHistorical = historicalResData.data || [];
      const summary = historicalResData.summary || {};

      // Apply time range filter to historical data
      const filteredHistorical = filterByTimeRange(allHistorical, 'record_date');
      setHistoricalData(filteredHistorical);

      // Calculate summary stats
      const totalHistoricalCases = filteredHistorical.reduce((sum: number, record: any) => {
        return sum + (record.case_count || 0);
      }, 0);

      setStats({
        historicalStats: {
          totalRecords: filteredHistorical.length,
          totalCases: totalHistoricalCases,
          dateRange: summary.earliestDate && summary.latestDate
            ? `${new Date(summary.earliestDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${new Date(summary.latestDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
            : '-',
        },
      });
    } catch (err) {
      console.error('Error loading charts data:', err);
      setError('Failed to load charts data');
    } finally {
      setChartsLoading(false);
    }
  };

  const loadBarangays = async () => {
    try {
      const response = await fetch('/api/barangays');
      const data = await response.json();
      if (data.success) {
        setBarangays(data.data || []);
      }
    } catch (err) {
      console.error('Error loading barangays:', err);
    }
  };

  const filterByTimeRange = (data: any[], dateField: string = 'diagnosis_date') => {
    if (timeRange === 'all') return data;

    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setMonth(now.getMonth() - timeRange);

    return data.filter((item: any) => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= cutoffDate;
    });
  };

  const handleGeneratePredictions = async () => {
    setIsGenerating(true);
    setGenerationStatus({ type: 'idle' });
    setError(null);

    try {
      const response = await fetch('/api/diseases/generate-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diseaseType: selectedDisease,
          // Removed barangayId - SARIMA predictions are system-wide for better accuracy
          daysForecast: 30,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGenerationStatus({
          type: 'success',
          message: data.message || 'Predictions generated successfully',
          details: data, // Store full response for detailed display
        });
        // Force SARIMAChart to reload by changing key
        setRefreshKey((prev) => prev + 1);
        // Don't auto-hide - let user dismiss manually
      } else {
        // Check if error is quota-related
        const isQuotaError = data.error?.includes('quota') || data.error?.includes('429') || data.error?.includes('Too Many Requests');
        const errorMessage = isQuotaError
          ? 'System temporarily busy. Displaying cached predictions. Please wait a moment and try again, or try generating predictions for a single disease instead of "All Diseases".'
          : data.error || 'Failed to generate predictions';

        setGenerationStatus({
          type: 'error',
          message: errorMessage,
        });
      }
    } catch (err) {
      console.error('Error generating predictions:', err);
      setGenerationStatus({
        type: 'error',
        message: 'An unexpected error occurred while generating predictions',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // OPTIMIZATION: Memoize disease options to prevent re-creation on every render
  const diseaseOptions = useMemo(() => [
    { id: 'all', label: 'All Diseases', color: 'blue' },
    { id: 'dengue', label: 'Dengue', color: 'red' },
    { id: 'hiv_aids', label: 'HIV/AIDS', color: 'purple' },
    { id: 'pregnancy_complications', label: 'Pregnancy', color: 'pink' },
    { id: 'malaria', label: 'Malaria', color: 'yellow' },
    { id: 'measles', label: 'Measles', color: 'orange' },
    { id: 'rabies', label: 'Rabies', color: 'gray' },
    { id: 'other', label: 'Other (Custom Diseases)', color: 'slate' },
  ], []);

  // OPTIMIZATION: Memoize selected disease label to prevent lookups on every render
  const selectedDiseaseLabel = useMemo(() =>
    diseaseOptions.find(d => d.id === selectedDisease)?.label ?? 'All Diseases',
    [selectedDisease, diseaseOptions]
  );

  // OPTIMIZATION: Memoize selected barangay label to prevent lookups on every render
  const selectedBarangayLabel = useMemo(() => {
    if (selectedBarangay === null) {
      return 'across barangays';
    }
    const barangay = barangays.find(b => b.id === selectedBarangay);
    return barangay ? `in ${barangay.name}` : 'across barangays';
  }, [selectedBarangay, barangays]);

  return (
    <DashboardLayout
      roleId={5}
      pageTitle="Disease Analytics"
      pageDescription="Comprehensive disease analytics with visualizations, predictions, and outbreak detection"
    >
      <Container size="full">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('predictions')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'predictions'
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Predictions & Forecasts
              </div>
            </button>
            <button
              onClick={() => setActiveTab('historical-statistics')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'historical-statistics'
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Historical Statistics
              </div>
            </button>
          </nav>
        </div>

        {/* Statistics Cards - Historical Statistics Tab */}
        {activeTab === 'historical-statistics' && !chartsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Records</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.historicalStats.totalRecords}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Database className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Cases</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.historicalStats.totalCases}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date Range</p>
                  <p className="text-sm font-bold text-gray-900">{stats.historicalStats.dateRange}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* Statistics Cards - Predictions Tab */}
        {activeTab === 'predictions' && !loading && heatmapData?.metadata && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Cases</p>
                  <p className="text-3xl font-bold text-gray-900">{heatmapData.metadata.total_cases}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Affected Barangays</p>
                  <p className="text-3xl font-bold text-gray-900">{heatmapData.metadata.total_barangays_affected}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Most Affected</p>
                  <p className="text-lg font-bold text-gray-900">
                    {heatmapData.metadata.most_affected_barangay || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {heatmapData.metadata.highest_case_count || 0} cases
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Latest Case</p>
                  <p className="text-sm font-bold text-gray-900">
                    {heatmapData.metadata.latest_case_date
                      ? new Date(heatmapData.metadata.latest_case_date).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

        {/* TAB CONTENT: Historical Statistics */}
        {activeTab === 'historical-statistics' && (
          <>
            {/* Disease Type, Time Range & Barangay Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Disease Type Selector */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-5 h-5 text-primary-teal" />
                  <h3 className="text-sm font-medium text-gray-700">Disease Type</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {diseaseOptions.map((disease) => (
                    <button
                      key={disease.id}
                      onClick={() => {
                        setDiseaseFilterByTab(prev => ({
                          ...prev,
                          'historical-statistics': disease.id as DiseaseType
                        }));
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        diseaseFilterByTab['historical-statistics'] === disease.id
                          ? 'bg-primary-teal text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {disease.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Range Selector */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-primary-teal" />
                  <h3 className="text-sm font-medium text-gray-700">Time Range</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 6, label: '6 Months' },
                    { value: 12, label: '12 Months' },
                    { value: 24, label: '24 Months' },
                    { value: 'all', label: 'All Time' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTimeRange(option.value as TimeRange)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        timeRange === option.value
                          ? 'bg-primary-teal text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barangay Selector */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-primary-teal" />
                  <h3 className="text-sm font-medium text-gray-700">Barangay</h3>
                </div>
                <select
                  value={barangayFilterByTab['historical-statistics'] || ''}
                  onChange={(e) => {
                    setBarangayFilterByTab(prev => ({
                      ...prev,
                      'historical-statistics': e.target.value ? Number(e.target.value) : null
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                >
                  <option value="">All Barangays</option>
                  {barangays.map((barangay: any) => (
                    <option key={barangay.id} value={barangay.id}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              {chartsLoading ? (
              <div className="py-12 text-center bg-white rounded-lg shadow">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                <p className="mt-2 text-sm text-gray-500">Loading charts...</p>
              </div>
            ) : (
              <HistoricalChartsSection
                historicalStatistics={historicalData}
                barangays={barangays}
                isLoading={chartsLoading}
                timeRangeMonths={timeRange}
              />
            )}
            </div>
          </>
        )}

        {/* TAB CONTENT: Predictions & Forecasts */}
        {activeTab === 'predictions' && (
          <div>
            {/* Outbreak Alerts */}
            <div className="mb-6">
              <OutbreakAlerts diseaseType={selectedDisease !== 'all' ? selectedDisease : undefined} />
            </div>

            {/* Disease Type Filter (below Outbreak Alerts - matches admin page layout) */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-primary-teal" />
                <h3 className="text-sm font-medium text-gray-700">Disease Type</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {diseaseOptions.map((disease) => (
                  <button
                    key={disease.id}
                    onClick={() => {
                      setDiseaseFilterByTab(prev => ({
                        ...prev,
                        'predictions': disease.id as DiseaseType
                      }));
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      diseaseFilterByTab['predictions'] === disease.id
                        ? 'bg-primary-teal text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {disease.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Barangay Filter */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Filter by Barangay</h4>
              <select
                value={barangayFilterByTab['predictions'] || ''}
                onChange={(e) => {
                  setBarangayFilterByTab(prev => ({
                    ...prev,
                    'predictions': e.target.value ? Number(e.target.value) : null
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              >
                <option value="">All Barangays</option>
                {barangays.map((barangay: any) => (
                  <option key={barangay.id} value={barangay.id}>
                    {barangay.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Disease Heatmap */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary-teal" />
                    Disease Distribution Heatmap
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Geographic distribution of {selectedDiseaseLabel} cases {selectedBarangayLabel}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading heatmap...</p>
                </div>
              ) : (
                <DiseaseHeatmap
                  diseaseType={selectedDisease}
                  data={heatmapData?.data || []}
                />
              )}
            </div>

            {/* SARIMA Prediction Chart */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              {/* Header with Generate Button */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary-teal" />
                    SARIMA Predictive Model with Error Metrics
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Seasonal Auto-Regressive Integrated Moving Average predictions for {selectedDiseaseLabel} {selectedBarangayLabel}
                  </p>
                </div>
                <button
                  onClick={handleGeneratePredictions}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-teal to-teal-600 text-white rounded-lg hover:from-primary-teal/90 hover:to-teal-600/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Predictions
                    </>
                  )}
                </button>
              </div>

              {/* Generation Status Messages */}

              {/* Progress Indicator (Option C) */}
              {isGenerating && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0 animate-spin" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-900">Generating Predictions...</h4>
                      <p className="text-sm text-blue-800 mt-1">
                        This may take up to 60 seconds for all diseases. Using local SARIMA model.
                      </p>
                      <div className="mt-2">
                        <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Success Message (Option A) */}
              {generationStatus.type === 'success' && generationStatus.details && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-green-900">Prediction Generation Complete</h4>
                        <p className="text-sm text-green-800 mt-1">
                          Successfully generated predictions for {generationStatus.details.summary.successful}/{generationStatus.details.summary.total_diseases} disease(s)
                        </p>

                        {/* Disease Results List */}
                        {generationStatus.details.results && generationStatus.details.results.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {generationStatus.details.results.map((result: any, index: number) => (
                              <div key={index} className={`flex items-center justify-between text-xs ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                                <div className="flex items-center gap-2">
                                  {result.success ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <XCircle className="w-3.5 h-3.5" />
                                  )}
                                  <span className="font-medium capitalize">
                                    {result.disease_type.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                {result.success && (
                                  <div className="flex items-center gap-3 text-xs">
                                    <span>{result.predictions_count} predictions</span>
                                    <span className="text-gray-500">•</span>
                                    {/* Conditional Metric Display: MAPE for low-variance, R² for high-variance */}
                                    {result.test_variance !== undefined && result.test_variance < 5.0 ? (
                                      // Low-variance disease: Show MAPE (primary metric for surveillance)
                                      <span className={`font-medium ${
                                        result.accuracy_mape !== undefined
                                          ? getMAPEColor(result.accuracy_mape)
                                          : 'text-gray-600'
                                      }`} title={`Low variance data (${result.test_variance?.toFixed(2)}) - MAPE is primary metric`}>
                                        MAPE: {result.accuracy_mape?.toFixed(1)}% ({interpretMAPE(result.accuracy_mape || 50)})
                                      </span>
                                    ) : (
                                      // High-variance disease: Show R² (traditional metric for trending data)
                                      <span className={`font-medium ${
                                        result.accuracy_r_squared !== undefined && result.accuracy_r_squared >= 0.7
                                          ? 'text-green-600'
                                          : result.accuracy_r_squared !== undefined && result.accuracy_r_squared >= 0.5
                                          ? 'text-blue-600'
                                          : result.accuracy_r_squared !== undefined && result.accuracy_r_squared >= 0.3
                                          ? 'text-yellow-600'
                                          : 'text-red-600'
                                      }`} title={result.test_variance !== undefined ? `High variance data (${result.test_variance?.toFixed(2)}) - R² is primary metric` : 'Model accuracy metric'}>
                                        R²: {result.accuracy_r_squared?.toFixed(2) || 'N/A'}
                                      </span>
                                    )}
                                    <span className="text-gray-500">•</span>
                                    <span className="capitalize">{result.data_quality} Quality</span>
                                    {result.cached && result.cache_age_hours !== undefined && (
                                      <>
                                        <span className="text-gray-500">•</span>
                                        <span className="text-blue-600 font-medium">
                                          Cached ({result.cache_age_hours}h ago)
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Summary Stats */}
                        <div className="mt-3 pt-3 border-t border-green-200 text-xs text-green-700 flex items-center gap-4">
                          <span className="font-semibold">Total: {generationStatus.details.summary.total_predictions} predictions</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setGenerationStatus({ type: 'idle' })}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="Dismiss"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {generationStatus.type === 'error' && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-red-900">Error</h4>
                      <p className="text-sm text-red-800 mt-1">{generationStatus.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chart */}
              {loading ? (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading predictions...</p>
                </div>
              ) : (
                <SARIMAChart
                  key={refreshKey}
                  diseaseType={selectedDisease}
                  barangayId={selectedBarangay || undefined}
                />
              )}
            </div>

            {/* Information Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">About Disease Analytics & Predictions</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• The heatmap visualizes disease distribution across all 41 barangays in Panabo City</p>
                    <p>• Darker colors indicate higher case concentrations in specific areas</p>
                    <p>• SARIMA predictions use historical data to forecast future disease trends</p>
                    <p>• <strong>MAPE (Mean Absolute Percentage Error)</strong> is shown for low-variance diseases (sporadic patterns like Rabies, HIV) - industry standard for disease surveillance</p>
                    <p>• <strong>R² (Coefficient of Determination)</strong> is shown for high-variance diseases (seasonal patterns like Dengue, Malaria) - traditional accuracy metric</p>
                    <p>• MAPE Quality: &lt;10% Excellent, 10-20% Good, 20-50% Fair, &gt;50% Poor</p>
                    <p>• Confidence intervals indicate the range of uncertainty in predictions</p>
                    <p>• Outbreak alerts automatically detect unusual disease pattern spikes</p>
                    <p>• Use this data to identify high-risk areas and allocate resources effectively</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
