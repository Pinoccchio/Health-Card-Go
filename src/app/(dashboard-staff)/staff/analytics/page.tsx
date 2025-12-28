'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import DiseaseHeatmap from '@/components/disease-surveillance/DiseaseHeatmap';
import SARIMAChart from '@/components/disease-surveillance/SARIMAChart';
import OutbreakAlerts from '@/components/disease-surveillance/OutbreakAlerts';
import { DiseaseChartsSection } from '@/components/staff/DiseaseChartsSection';
import { HistoricalChartsSection } from '@/components/staff/HistoricalChartsSection';
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Calendar,
  BarChart3,
  Database,
  LineChart,
} from 'lucide-react';

type DiseaseType = 'all' | 'dengue' | 'hiv_aids' | 'pregnancy_complications' | 'malaria' | 'measles' | 'rabies' | 'other';
type TabType = 'individual-cases' | 'historical-statistics' | 'predictions';
type TimeRange = 6 | 12 | 24 | 'all';

interface SummaryStats {
  individualCases: {
    total: number;
    thisMonth: number;
    active: number;
    recovered: number;
  };
  historicalStats: {
    totalRecords: number;
    totalCases: number;
    dateRange: string;
  };
}

export default function StaffAnalyticsPage() {
  // Tab and filter states
  const [activeTab, setActiveTab] = useState<TabType>('predictions');
  const [selectedDisease, setSelectedDisease] = useState<DiseaseType>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>(24);

  // Data states
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [stats, setStats] = useState<SummaryStats>({
    individualCases: { total: 0, thisMonth: 0, active: 0, recovered: 0 },
    historicalStats: { totalRecords: 0, totalCases: 0, dateRange: '-' },
  });

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Reload data when filters change
  useEffect(() => {
    if (activeTab === 'predictions') {
      loadHeatmapData();
    } else if (activeTab === 'individual-cases' || activeTab === 'historical-statistics') {
      loadChartsData();
    }
  }, [selectedDisease, timeRange, activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadHeatmapData(),
      loadChartsData(),
      loadBarangays(),
    ]);
    setLoading(false);
  };

  const loadHeatmapData = async () => {
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedDisease !== 'all') {
        params.append('type', selectedDisease);
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
    }
  };

  const loadChartsData = async () => {
    setChartsLoading(true);
    setError(null);

    try {
      // Fetch individual cases
      const diseasesRes = await fetch('/api/diseases');
      const diseasesData = await diseasesRes.json();
      const allDiseases = diseasesData.data || [];

      // Apply time range filter
      const filteredDiseases = filterByTimeRange(allDiseases);
      setDiseases(filteredDiseases);

      // Calculate individual cases stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthCases = filteredDiseases.filter((d: any) => {
        const diagnosisDate = new Date(d.diagnosis_date);
        return diagnosisDate >= startOfMonth;
      }).length;

      const activeCases = filteredDiseases.filter((d: any) =>
        d.status === 'active' || d.status === 'ongoing_treatment'
      ).length;

      const recoveredCases = filteredDiseases.filter((d: any) =>
        d.status === 'recovered'
      ).length;

      // Fetch historical statistics
      const historicalRes = await fetch('/api/diseases/historical');
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
        individualCases: {
          total: filteredDiseases.length,
          thisMonth: thisMonthCases,
          active: activeCases,
          recovered: recoveredCases,
        },
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

  const diseaseOptions = [
    { id: 'all', label: 'All Diseases', color: 'blue' },
    { id: 'dengue', label: 'Dengue', color: 'red' },
    { id: 'hiv_aids', label: 'HIV/AIDS', color: 'purple' },
    { id: 'pregnancy_complications', label: 'Pregnancy', color: 'pink' },
    { id: 'malaria', label: 'Malaria', color: 'yellow' },
    { id: 'measles', label: 'Measles', color: 'orange' },
    { id: 'rabies', label: 'Rabies', color: 'gray' },
    { id: 'other', label: 'Other (Custom Diseases)', color: 'slate' },
  ];

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
              onClick={() => setActiveTab('individual-cases')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'individual-cases'
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Individual Cases
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

        {/* Time Range Selector & Disease Type Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
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
                  onClick={() => setSelectedDisease(disease.id as DiseaseType)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedDisease === disease.id
                      ? 'bg-primary-teal text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {disease.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range Selector (hidden for predictions tab) */}
          {activeTab !== 'predictions' && (
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
          )}
        </div>

        {/* Statistics Cards - Individual Cases Tab */}
        {activeTab === 'individual-cases' && !chartsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Cases</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.individualCases.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Activity className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">This Month</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.individualCases.thisMonth}</p>
                </div>
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Cases</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.individualCases.active}</p>
                </div>
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Recovered</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.individualCases.recovered}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </ProfessionalCard>
          </div>
        )}

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

        {/* TAB CONTENT: Individual Cases */}
        {activeTab === 'individual-cases' && (
          <div>
            {chartsLoading ? (
              <div className="py-12 text-center bg-white rounded-lg shadow">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                <p className="mt-2 text-sm text-gray-500">Loading charts...</p>
              </div>
            ) : (
              <DiseaseChartsSection
                individualCases={diseases}
                barangays={barangays}
                isLoading={chartsLoading}
                timeRangeMonths={timeRange}
              />
            )}
          </div>
        )}

        {/* TAB CONTENT: Historical Statistics */}
        {activeTab === 'historical-statistics' && (
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
        )}

        {/* TAB CONTENT: Predictions & Forecasts */}
        {activeTab === 'predictions' && (
          <div>
            {/* Outbreak Alerts */}
            <div className="mb-6">
              <OutbreakAlerts diseaseType={selectedDisease !== 'all' ? selectedDisease : undefined} />
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
                    Geographic distribution of {diseaseOptions.find(d => d.id === selectedDisease)?.label || 'disease'} cases across barangays
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary-teal" />
                    SARIMA Predictive Model with Error Metrics
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Seasonal Auto-Regressive Integrated Moving Average predictions for {diseaseOptions.find(d => d.id === selectedDisease)?.label || 'disease'}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading predictions...</p>
                </div>
              ) : (
                <SARIMAChart diseaseType={selectedDisease} />
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
                    <p>• Error metrics (MSE, RMSE, R²) show model accuracy and reliability</p>
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
