'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import OutbreakAlerts from '@/components/disease-surveillance/OutbreakAlerts';
import DiseaseHeatmap from '@/components/disease-surveillance/DiseaseHeatmap';
import SARIMAChart from '@/components/disease-surveillance/SARIMAChart';
import {
  Activity,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Users,
  RefreshCw,
  Filter,
  Calendar,
  Download,
} from 'lucide-react';

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

interface SummaryStats {
  totalActiveCases: number;
  criticalCases: number;
  activeOutbreaks: number;
  predictionAccuracy: number | null;
}

interface Barangay {
  id: number;
  name: string;
}

export default function AdminDiseaseSurveillancePage() {
  // State
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalActiveCases: 0,
    criticalCases: 0,
    activeOutbreaks: 0,
    predictionAccuracy: null,
  });
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Filters
  const [selectedDiseaseType, setSelectedDiseaseType] = useState<string>('all');
  const [selectedBarangay, setSelectedBarangay] = useState<number | null>(null);
  const [selectedTab, setSelectedTab] = useState<'heatmap' | 'predictions'>('heatmap');

  // Disease types for filtering
  const diseaseTypes = [
    { value: 'all', label: 'All Diseases' },
    { value: 'dengue', label: 'Dengue' },
    { value: 'hiv_aids', label: 'HIV/AIDS' },
    { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
    { value: 'malaria', label: 'Malaria' },
    { value: 'measles', label: 'Measles' },
    { value: 'rabies', label: 'Rabies' },
    { value: 'other', label: 'Other Diseases' },
  ];

  // Load initial data
  useEffect(() => {
    loadAllData();
    loadBarangays();
  }, []);

  // Reload data when filters change
  useEffect(() => {
    loadHeatmapData();
  }, [selectedDiseaseType, selectedBarangay]);

  const loadBarangays = async () => {
    try {
      const response = await fetch('/api/barangays');
      const result = await response.json();
      if (result.success) {
        setBarangays(result.data || []);
      }
    } catch (error) {
      console.error('Error loading barangays:', error);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([loadHeatmapData(), loadSummaryStats()]);
    setLastRefreshed(new Date());
    setLoading(false);
  };

  const loadHeatmapData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDiseaseType !== 'all') {
        params.append('disease_type', selectedDiseaseType);
      }
      if (selectedBarangay) {
        params.append('barangay_id', selectedBarangay.toString());
      }

      const response = await fetch(`/api/diseases/heatmap-data?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setHeatmapData(result.data || []);
      }
    } catch (error) {
      console.error('Error loading heatmap data:', error);
    }
  };

  const loadSummaryStats = async () => {
    try {
      // Get total active cases
      const diseasesResponse = await fetch('/api/diseases');
      const diseasesResult = await diseasesResponse.json();

      if (diseasesResult.success) {
        const diseases = diseasesResult.data || [];
        const activeCases = diseases.filter((d: any) => d.status === 'active' || d.status === 'ongoing_treatment');
        const critical = diseases.filter((d: any) => d.severity === 'critical');

        // Get active outbreaks
        const outbreaksResponse = await fetch('/api/diseases/outbreak-detection');
        const outbreaksResult = await outbreaksResponse.json();
        const activeOutbreaks = outbreaksResult.success ? (outbreaksResult.data?.length || 0) : 0;

        // Get latest prediction accuracy (if available)
        const predictionsResponse = await fetch('/api/diseases/predictions?limit=1');
        const predictionsResult = await predictionsResponse.json();
        const predictionAccuracy =
          predictionsResult.success && predictionsResult.data?.length > 0
            ? predictionsResult.data[0].accuracy_r_squared
            : null;

        setSummaryStats({
          totalActiveCases: activeCases.length,
          criticalCases: critical.length,
          activeOutbreaks,
          predictionAccuracy,
        });
      }
    } catch (error) {
      console.error('Error loading summary stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const handleExport = () => {
    // Export current view data (future enhancement)
    alert('Export functionality coming soon. This will export disease data to CSV/Excel.');
  };

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Disease Surveillance"
      pageDescription="Real-time disease tracking, outbreak detection, and predictive analytics"
    >
      <Container size="full">
        {/* Header Actions */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
            {lastRefreshed && (
              <span className="text-sm text-gray-500">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Active Cases */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Active Cases</h3>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{summaryStats.totalActiveCases}</p>
            <p className="text-xs text-gray-500 mt-1">Across all barangays</p>
          </div>

          {/* Critical Cases */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Critical Cases</h3>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{summaryStats.criticalCases}</p>
            <p className="text-xs text-gray-500 mt-1">Requiring immediate attention</p>
          </div>

          {/* Active Outbreaks */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Active Outbreaks</h3>
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{summaryStats.activeOutbreaks}</p>
            <p className="text-xs text-gray-500 mt-1">Above threshold levels</p>
          </div>

          {/* Prediction Accuracy */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Prediction Accuracy</h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {summaryStats.predictionAccuracy
                ? `${(summaryStats.predictionAccuracy * 100).toFixed(1)}%`
                : 'N/A'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {summaryStats.predictionAccuracy
                ? summaryStats.predictionAccuracy >= 0.8
                  ? 'Excellent model accuracy'
                  : summaryStats.predictionAccuracy >= 0.6
                  ? 'Good model accuracy'
                  : 'Fair model accuracy'
                : 'No predictions yet'}
            </p>
          </div>
        </div>

        {/* Outbreak Alerts Section */}
        <div className="mb-8">
          <OutbreakAlerts autoNotify={true} refreshInterval={300000} />
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Disease Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Disease Type</label>
              <select
                value={selectedDiseaseType}
                onChange={(e) => setSelectedDiseaseType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              >
                {diseaseTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Barangay Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Barangay</label>
              <select
                value={selectedBarangay || ''}
                onChange={(e) => setSelectedBarangay(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              >
                <option value="">All Barangays</option>
                {barangays.map((barangay) => (
                  <option key={barangay.id} value={barangay.id}>
                    {barangay.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setSelectedTab('heatmap')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === 'heatmap'
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Disease Heatmap
                </div>
              </button>
              <button
                onClick={() => setSelectedTab('predictions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === 'predictions'
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  SARIMA Predictions
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'heatmap' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Disease Distribution Map</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Interactive map showing disease cases across all barangays in Panabo City
                </p>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 text-primary-teal animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Loading heatmap data...</p>
                </div>
              </div>
            ) : heatmapData.length === 0 ? (
              <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No disease cases found with current filters</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Try adjusting your filter selections or refresh the data
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[600px]">
                <DiseaseHeatmap data={heatmapData} diseaseType={selectedDiseaseType} />
              </div>
            )}
          </div>
        )}

        {selectedTab === 'predictions' && (
          <div className="space-y-6">
            {/* Disease Type Tabs for Predictions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Disease Case Predictions (SARIMA Model)
              </h3>
              <div className="space-y-8">
                {diseaseTypes
                  .filter((dt) => dt.value !== 'all')
                  .map((diseaseType) => (
                    <div key={diseaseType.value} className="border-t pt-6 first:border-t-0 first:pt-0">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">{diseaseType.label}</h4>
                      <SARIMAChart
                        diseaseType={diseaseType.value}
                        barangayId={selectedBarangay || undefined}
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* Health Card Predictions (Existing) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Health Card Issuance Predictions
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                SARIMA forecasts for Food Handler and Non-Food health card demand (used for resource planning)
              </p>
              <div className="space-y-8">
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Food Handler Health Cards</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Predictions for Services 12 (Processing) and 13 (Renewal) combined
                  </p>
                  {/* Placeholder for health card predictions - to be implemented */}
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Health card prediction integration coming soon</p>
                  </div>
                </div>
                <div className="border-t pt-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Non-Food Health Cards</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Predictions for Services 14 (Processing) and 15 (Renewal) combined
                  </p>
                  {/* Placeholder for health card predictions - to be implemented */}
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Health card prediction integration coming soon</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View-Only Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Super Admin View-Only Mode</h4>
              <p className="text-sm text-blue-700">
                This dashboard provides comprehensive disease surveillance analytics for oversight purposes. Disease
                case data entry is managed by Staff members via their disease surveillance page. Healthcare Admins
                automatically contribute data when creating medical records with diagnoses.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
