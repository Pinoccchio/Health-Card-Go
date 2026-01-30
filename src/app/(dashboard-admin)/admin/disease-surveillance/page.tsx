'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { HistoricalStatsSummary } from '@/components/staff/HistoricalStatsSummary';
import { HistoricalStatisticsTable } from '@/components/staff/HistoricalStatisticsTable';
import DiseaseHeatmap from '@/components/disease-surveillance/DiseaseHeatmap';
import { HistoricalChartsSection } from '@/components/staff/HistoricalChartsSection';
import {
  ALL_DISEASE_TYPES,
  DISEASE_TYPE_LABELS,
} from '@/lib/constants/diseaseConstants';
import {
  Activity,
  Calendar,
  MapPin,
  AlertTriangle,
  Filter,
  Database,
  BarChart3,
  RefreshCw,
  Info,
} from 'lucide-react';

type TabType = 'data-view' | 'geographic-view' | 'analytics';
type TimeRange = 6 | 12 | 24 | 'all';
type DiseaseType = 'all' | string;

interface SummaryStats {
  totalCases: number;
  affectedBarangays: number;
  mostAffectedBarangay: string;
  dateRange: string;
}

// All disease types for Super Admin (includes HIV/AIDS, Pregnancy Complications)
const DISEASE_TYPES = ALL_DISEASE_TYPES.map(type => ({
  value: type,
  label: DISEASE_TYPE_LABELS[type] || type,
}));

export default function AdminDiseaseSurveillancePage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam && ['data-view', 'geographic-view', 'analytics'].includes(tabParam)
      ? tabParam
      : 'data-view'
  );
  const [barangays, setBarangays] = useState<any[]>([]);

  // Historical statistics state (read-only)
  const [historicalStatistics, setHistoricalStatistics] = useState<any[]>([]);
  const [historicalSummary, setHistoricalSummary] = useState<any>({
    totalRecords: 0,
    totalCases: 0,
    earliestDate: null,
    latestDate: null,
    mostCommonDisease: null,
    diseaseTypeCounts: {},
  });
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [historicalFilters, setHistoricalFilters] = useState({
    disease_type: 'all',
    barangay_id: 'all',
    start_date: '',
    end_date: '',
  });

  // Geographic view and analytics states
  const [diseaseFilter, setDiseaseFilter] = useState<DiseaseType>('all');
  const [barangayFilter, setBarangayFilter] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>(24);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    totalCases: 0,
    affectedBarangays: 0,
    mostAffectedBarangay: '-',
    dateRange: '-',
  });
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Timeout fallback
  useEffect(() => {
    if (loading || chartsLoading) {
      setLoadingTimeout(false);
      const timer = setTimeout(() => {
        console.warn('⚠️ Loading timeout reached (30s) - forcing render');
        setLoadingTimeout(true);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [loading, chartsLoading]);

  useEffect(() => {
    fetchBarangays();
    if (activeTab === 'data-view') {
      fetchHistoricalStatistics();
    } else if (activeTab === 'geographic-view' || activeTab === 'analytics') {
      setLoading(true);
      setChartsLoading(true);
      Promise.all([loadHeatmapData(), loadChartsData()]).catch((err) => {
        console.error('Error loading geographic data:', err);
      });
    }
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'data-view') {
      fetchHistoricalStatistics();
    }
  }, [historicalFilters]);

  useEffect(() => {
    if (activeTab === 'geographic-view' || activeTab === 'analytics') {
      setLoading(true);
      setChartsLoading(true);
      Promise.all([loadHeatmapData(), loadChartsData()]).catch((err) => {
        console.error('Error loading geographic data:', err);
      });
    }
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [diseaseFilter, barangayFilter, timeRange]);

  const fetchBarangays = async () => {
    try {
      const response = await fetch('/api/barangays');
      const data = await response.json();
      if (data.success) {
        setBarangays(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching barangays:', err);
    }
  };

  const fetchHistoricalStatistics = async () => {
    try {
      setLoadingHistorical(true);
      const params = new URLSearchParams();
      if (historicalFilters.disease_type !== 'all') {
        params.append('disease_type', historicalFilters.disease_type);
      }
      if (historicalFilters.barangay_id !== 'all') {
        params.append('barangay_id', historicalFilters.barangay_id);
      }
      if (historicalFilters.start_date) {
        params.append('start_date', historicalFilters.start_date);
      }
      if (historicalFilters.end_date) {
        params.append('end_date', historicalFilters.end_date);
      }

      const response = await fetch(`/api/diseases/historical?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setHistoricalStatistics(data.data || []);
        setHistoricalSummary(data.summary || {
          totalRecords: 0,
          totalCases: 0,
          earliestDate: null,
          latestDate: null,
          mostCommonDisease: null,
          diseaseTypeCounts: {},
        });
      }
    } catch (err) {
      console.error('Error fetching historical statistics:', err);
    } finally {
      setLoadingHistorical(false);
    }
  };

  const loadHeatmapData = async () => {
    if (abortController) {
      abortController.abort();
    }
    const controller = new AbortController();
    setAbortController(controller);
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('⚠️ Heatmap data fetch timeout (15s)');
    }, 15000);

    try {
      setError(null);
      const params = new URLSearchParams();
      if (diseaseFilter !== 'all') {
        params.append('disease_type', diseaseFilter);
      }
      if (barangayFilter) {
        params.append('barangay_id', barangayFilter.toString());
      }
      if (timeRange !== 'all') {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - timeRange);
        params.append('start_date', startDate.toISOString().split('T')[0]);
      }

      const response = await fetch(`/api/diseases/heatmap-data?${params.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success) {
        setHeatmapData(data.data);
        if (data.data?.metadata) {
          const { metadata } = data.data;
          setStats({
            totalCases: metadata.total_cases || 0,
            affectedBarangays: metadata.affected_barangays || 0,
            mostAffectedBarangay: metadata.most_affected_barangay || '-',
            dateRange: metadata.date_range || '-',
          });
        }
      } else {
        setError(data.error || 'Failed to load heatmap data');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[Heatmap] Request aborted');
      } else {
        console.error('Failed to load heatmap data:', err);
        setError('Failed to load disease distribution data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadChartsData = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('⚠️ Charts data fetch timeout (15s)');
    }, 15000);

    try {
      setChartsLoading(true);
      const params = new URLSearchParams();
      if (diseaseFilter !== 'all') {
        params.append('disease_type', diseaseFilter);
      }
      if (barangayFilter) {
        params.append('barangay_id', barangayFilter.toString());
      }
      if (timeRange !== 'all') {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - timeRange);
        params.append('start_date', startDate.toISOString().split('T')[0]);
      }

      const response = await fetch(`/api/diseases/historical?${params.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success) {
        setHistoricalData(data.data || []);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[Charts] Request aborted');
      } else {
        console.error('Failed to load historical data:', err);
      }
    } finally {
      setChartsLoading(false);
    }
  };

  // Disease options for Super Admin (all disease types)
  const diseaseOptions = useMemo(() => [
    { id: 'all', label: 'All Diseases', color: 'blue' },
    ...ALL_DISEASE_TYPES.map(type => ({
      id: type,
      label: DISEASE_TYPE_LABELS[type] || type,
      color: type === 'dengue' ? 'red' :
             type === 'malaria' ? 'yellow' :
             type === 'measles' ? 'orange' :
             type === 'animal_bite' ? 'gray' :
             type === 'hiv_aids' ? 'purple' :
             type === 'pregnancy_complications' ? 'pink' :
             type === 'custom_disease' ? 'slate' : 'blue'
    }))
  ], []);

  const selectedDiseaseLabel = useMemo(() =>
    diseaseOptions.find(d => d.id === diseaseFilter)?.label ?? 'All Diseases',
    [diseaseFilter, diseaseOptions]
  );

  const selectedBarangayLabel = useMemo(() => {
    if (!barangayFilter) return '';
    const barangay = barangays.find(b => b.id === barangayFilter);
    return barangay ? `in ${barangay.name}` : '';
  }, [barangayFilter, barangays]);

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Disease Monitoring"
      pageDescription="Disease surveillance and predictive analytics overview"
    >
      <Container size="full">
        {/* Page Header */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Disease Monitoring</h1>
          </div>
          <p className="text-gray-600">View disease surveillance data, geographic distribution, and analytics trends across all barangays</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('data-view')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'data-view'
                  ? 'text-primary-teal border-b-2 border-primary-teal bg-teal-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Database className="w-4 h-4" />
              Data View
            </button>
            <button
              onClick={() => setActiveTab('geographic-view')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'geographic-view'
                  ? 'text-primary-teal border-b-2 border-primary-teal bg-teal-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Geographic View
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-primary-teal border-b-2 border-primary-teal bg-teal-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics & Trends
            </button>
          </div>
        </div>

        {/* Data View Tab (read-only) */}
        {activeTab === 'data-view' && (
          <div className="space-y-6">
            {/* Summary Statistics */}
            <HistoricalStatsSummary summary={historicalSummary} loading={loadingHistorical} />

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Filter Historical Data</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Disease Type</label>
                  <select
                    value={historicalFilters.disease_type}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, disease_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    <option value="all">All Diseases</option>
                    {DISEASE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Barangay</label>
                  <select
                    value={historicalFilters.barangay_id}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, barangay_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    <option value="all">All Barangays</option>
                    {barangays.map(barangay => (
                      <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={historicalFilters.start_date}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={historicalFilters.end_date}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Historical Statistics Table (read-only) */}
            {loadingHistorical ? (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
                <p className="text-gray-600">Loading historical statistics...</p>
              </div>
            ) : (
              <HistoricalStatisticsTable
                statistics={historicalStatistics}
                readOnly
              />
            )}
          </div>
        )}

        {/* Geographic View Tab */}
        {activeTab === 'geographic-view' && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            {!loading && heatmapData?.metadata && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ProfessionalCard className="bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-red-500" />
                        <p className="text-sm text-gray-600 font-medium">Total Cases</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalCases.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedDiseaseLabel}</p>
                    </div>
                  </div>
                </ProfessionalCard>

                <ProfessionalCard className="bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <p className="text-sm text-gray-600 font-medium">Affected Barangays</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.affectedBarangays}</p>
                      <p className="text-xs text-gray-500 mt-1">Out of 41 barangays</p>
                    </div>
                  </div>
                </ProfessionalCard>

                <ProfessionalCard className="bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <p className="text-sm text-gray-600 font-medium">Most Affected</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900 truncate">{stats.mostAffectedBarangay}</p>
                      <p className="text-xs text-gray-500 mt-1">Highest case count</p>
                    </div>
                  </div>
                </ProfessionalCard>

                <ProfessionalCard className="bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-green-500" />
                        <p className="text-sm text-gray-600 font-medium">Date Range</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{stats.dateRange}</p>
                      <p className="text-xs text-gray-500 mt-1">Analysis period</p>
                    </div>
                  </div>
                </ProfessionalCard>
              </div>
            )}

            {/* Filters */}
            <ProfessionalCard>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Filter Options</h3>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Disease Type</label>
                  <div className="flex flex-wrap gap-2">
                    {diseaseOptions.map((disease) => (
                      <button
                        key={disease.id}
                        onClick={() => setDiseaseFilter(disease.id as DiseaseType)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          diseaseFilter === disease.id
                            ? 'bg-primary-teal text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {disease.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Barangay</label>
                    <select
                      value={barangayFilter || ''}
                      onChange={(e) => setBarangayFilter(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                    >
                      <option value="">All Barangays</option>
                      {barangays.map(barangay => (
                        <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                    >
                      <option value={6}>Last 6 Months</option>
                      <option value={12}>Last 12 Months</option>
                      <option value={24}>Last 24 Months</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>
                </div>
              </div>
            </ProfessionalCard>

            {/* Main Content */}
            {loading && !loadingTimeout ? (
              <ProfessionalCard>
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal"></div>
                    <p className="mt-4 text-base font-medium text-gray-700">Loading geographic data...</p>
                    <p className="mt-1 text-sm text-gray-500">Please wait while we fetch disease distribution information</p>
                  </div>
                </div>
              </ProfessionalCard>
            ) : (
              <div className="space-y-6">
                {loadingTimeout && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <strong>Loading timeout:</strong> Data is taking longer than expected to load. The page is displayed with potentially incomplete data. Try refreshing or changing filters.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <ProfessionalCard>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Disease Distribution Heatmap</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Geographic visualization of {selectedDiseaseLabel} {selectedBarangayLabel}
                      </p>
                    </div>
                    <button
                      onClick={loadHeatmapData}
                      disabled={loading}
                      className="p-2 text-gray-600 hover:text-primary-teal hover:bg-gray-50 rounded-lg transition-colors"
                      title="Refresh heatmap"
                    >
                      <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Case Severity</label>
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                    >
                      <option value="all">All Risk</option>
                      <option value="high">High Risk Only (&ge;70%)</option>
                      <option value="medium">Medium Risk Only (50-69%)</option>
                      <option value="low">Low Risk Only (&lt;50%)</option>
                      <option value="no_cases">No Cases Only</option>
                    </select>
                  </div>

                  {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  ) : (
                    <DiseaseHeatmap
                      data={heatmapData}
                      diseaseType={diseaseFilter}
                      severityFilter={severityFilter}
                    />
                  )}
                </ProfessionalCard>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">About Geographic View</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>The heatmap shows disease distribution across all barangays in real-time</p>
                    <p>Darker colors and larger circles indicate higher case concentrations</p>
                    <p>Filter by disease type, barangay, and time range for focused analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics & Trends Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <ProfessionalCard>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Analysis Filters</h3>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Disease Type</label>
                  <div className="flex flex-wrap gap-2">
                    {diseaseOptions.map((disease) => (
                      <button
                        key={disease.id}
                        onClick={() => setDiseaseFilter(disease.id as DiseaseType)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          diseaseFilter === disease.id
                            ? 'bg-primary-teal text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {disease.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Barangay</label>
                    <select
                      value={barangayFilter || ''}
                      onChange={(e) => setBarangayFilter(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                    >
                      <option value="">All Barangays</option>
                      {barangays.map(barangay => (
                        <option key={barangay.id} value={barangay.id}>{barangay.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                    >
                      <option value={6}>Last 6 Months</option>
                      <option value={12}>Last 12 Months</option>
                      <option value={24}>Last 24 Months</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Historical Statistics & Trends</h3>
                <p className="text-sm text-gray-600">Disease patterns and predictive analytics over time</p>
              </div>

              {chartsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                    <p className="mt-2 text-sm text-gray-500">Loading charts...</p>
                  </div>
                </div>
              ) : historicalData.length > 0 ? (
                <HistoricalChartsSection
                  historicalStatistics={historicalData}
                  barangays={barangays}
                  selectedDisease={diseaseFilter}
                  selectedBarangay={barangayFilter}
                />
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">No historical data available for the selected filters</p>
                  </div>
                </div>
              )}
            </ProfessionalCard>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">About Analytics & Trends</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>View historical disease trends and patterns over time</p>
                    <p>Analyze seasonal variations and disease progression</p>
                    <p>Compare disease cases across different barangays</p>
                    <p>Use predictive analytics for outbreak preparedness</p>
                    <p>Filter data by disease type, location, and time range</p>
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
