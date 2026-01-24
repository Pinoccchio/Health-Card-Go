'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import { HistoricalDataForm } from '@/components/staff/HistoricalDataForm';
import ExcelImportModal from '@/components/staff/ExcelImportModal';
import { HistoricalStatsSummary } from '@/components/staff/HistoricalStatsSummary';
import { HistoricalStatisticsTable } from '@/components/staff/HistoricalStatisticsTable';
import { EditHistoricalRecordModal } from '@/components/staff/EditHistoricalRecordModal';
import { HistoricalStatisticsReportGenerator } from '@/components/staff/HistoricalStatisticsReportGenerator';
import { GeographicOutbreakReportGenerator } from '@/components/staff/GeographicOutbreakReportGenerator';
import { TrendsAnalysisReportGenerator } from '@/components/staff/TrendsAnalysisReportGenerator';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/contexts/ToastContext';
import DiseaseHeatmap from '@/components/disease-surveillance/DiseaseHeatmap';
import OutbreakAlerts from '@/components/disease-surveillance/OutbreakAlerts';
import { HistoricalChartsSection } from '@/components/staff/HistoricalChartsSection';
import { OutbreakDataProvider } from '@/contexts/OutbreakDataContext';
import { ResetDataDialog } from '@/components/disease-surveillance/ResetDataDialog';
import {
  STAFF_DISEASE_TYPES,
  DISEASE_TYPE_LABELS,
  getDiseaseDisplayName as getDiseaseName
} from '@/lib/constants/diseaseConstants';
import {
  Activity,
  PlusCircle,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  Database,
  User,
  Users,
  Filter,
  MoreVertical,
  Eye,
  Edit2,
  Trash2,
  Upload,
  Download,
  BarChart3,
  LineChart,
  RefreshCw,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';

interface DiseaseRecord {
  id: string;
  disease_type: string;
  custom_disease_name?: string;
  diagnosis_date: string;
  severity?: string;
  status: string;
  barangay_id: number;
  patient_id?: string;
  notes?: string;
  created_at: string;
  barangays?: {
    name: string;
    code: string;
  };
  patients?: {
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
  anonymous_patient_data?: {
    name: string;
    age: number;
    gender: string;
    barangay_id?: number;
  };
}

// Staff-specific disease types (excludes HIV/AIDS and Pregnancy Complications)
const DISEASE_TYPES = STAFF_DISEASE_TYPES.map(type => ({
  value: type,
  label: DISEASE_TYPE_LABELS[type] || type,
}));

const SEVERITY_LEVELS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
  { value: 'critical', label: 'Critical' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'recovered', label: 'Recovered' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'under_treatment', label: 'Under Treatment' },
];

/**
 * Get display name for disease type - delegates to imported function
 * Shows custom_disease_name for 'custom_disease' or 'other' type, otherwise shows standard label
 */
function getDiseaseDisplayName(diseaseType: string, customDiseaseName?: string): string {
  return getDiseaseName(diseaseType, customDiseaseName);
}

type TabType = 'data-management' | 'geographic-view' | 'analytics';
type TimeRange = 6 | 12 | 24 | 'all';
type DiseaseType = 'all' | 'dengue' | 'malaria' | 'measles' | 'animal_bite' | 'custom_disease';

interface SummaryStats {
  totalCases: number;
  affectedBarangays: number;
  mostAffectedBarangay: string;
  dateRange: string;
}

export default function StaffDiseaseSurveillancePage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam && ['data-management', 'geographic-view', 'analytics'].includes(tabParam)
      ? tabParam
      : 'data-management'
  );
  const [barangays, setBarangays] = useState<any[]>([]);
  const [isHistoricalFormOpen, setIsHistoricalFormOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isHistoricalStatsReportOpen, setIsHistoricalStatsReportOpen] = useState(false);
  const [isGeographicReportOpen, setIsGeographicReportOpen] = useState(false);
  const [isTrendsReportOpen, setIsTrendsReportOpen] = useState(false);
  const [showResetDataDialog, setShowResetDataDialog] = useState(false);

  // Toast notifications
  const toast = useToast();

  // Historical statistics state
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
  const [editingHistoricalRecord, setEditingHistoricalRecord] = useState<any | null>(null);
  const [isEditHistoricalModalOpen, setIsEditHistoricalModalOpen] = useState(false);

  // Delete confirmation states for historical records
  const [showDeleteHistoricalDialog, setShowDeleteHistoricalDialog] = useState(false);
  const [historicalRecordToDelete, setHistoricalRecordToDelete] = useState<any | null>(null);
  const [deleteHistoricalLoading, setDeleteHistoricalLoading] = useState(false);

  // Geographic view and analytics states (from analytics page)
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
  const [outbreakRiskFilter, setOutbreakRiskFilter] = useState<string>('all');
  const [outbreakAlertsLoading, setOutbreakAlertsLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Timeout fallback: Force render after 30 seconds to prevent infinite loading
  useEffect(() => {
    if (loading || chartsLoading || outbreakAlertsLoading) {
      setLoadingTimeout(false);
      const timer = setTimeout(() => {
        console.warn('⚠️ Loading timeout reached (30s) - forcing render');
        setLoadingTimeout(true);
      }, 30000); // 30 seconds

      return () => clearTimeout(timer);
    }
  }, [loading, chartsLoading, outbreakAlertsLoading]);

  useEffect(() => {
    fetchBarangays();
    if (activeTab === 'data-management') {
      fetchHistoricalStatistics();
    } else if (activeTab === 'geographic-view' || activeTab === 'analytics') {
      setLoading(true);
      setChartsLoading(true);
      // Load heatmap and charts in parallel using Promise.all
      Promise.all([loadHeatmapData(), loadChartsData()])
        .catch((err) => {
          console.error('Error loading geographic data:', err);
        });
    }

    // Cleanup: abort on unmount or tab change
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [activeTab]);

  // Fetch historical statistics when filters change
  useEffect(() => {
    if (activeTab === 'data-management') {
      fetchHistoricalStatistics();
    }
  }, [historicalFilters]);

  // Fetch geographic data when filters change
  useEffect(() => {
    if (activeTab === 'geographic-view' || activeTab === 'analytics') {
      setLoading(true);
      setChartsLoading(true);
      // Load heatmap and charts in parallel using Promise.all
      Promise.all([loadHeatmapData(), loadChartsData()])
        .catch((err) => {
          console.error('Error loading geographic data:', err);
        });
    }

    // Cleanup: abort on filter change
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
      } else {
        toast.error('Failed to load historical disease statistics');
      }
    } catch (err) {
      console.error('Error fetching historical statistics:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoadingHistorical(false);
    }
  };

  const loadHeatmapData = async () => {
    // Cancel previous request if still pending
    if (abortController) {
      abortController.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    // Timeout after 15 seconds
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

      // Apply time range filter
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

        // Update stats from heatmap metadata
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
      // Don't set error if request was aborted
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
    // Create AbortController with 15-second timeout
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

      // Apply time range
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
      // Don't log error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('[Charts] Request aborted');
      } else {
        console.error('Failed to load historical data:', err);
      }
    } finally {
      setChartsLoading(false);
    }
  };


  const handleEditHistoricalRecord = (record: any) => {
    setEditingHistoricalRecord(record);
    setIsEditHistoricalModalOpen(true);
  };

  const handleDeleteHistoricalClick = (record: any) => {
    setHistoricalRecordToDelete(record);
    setShowDeleteHistoricalDialog(true);
  };

  const handleConfirmDeleteHistorical = async (reason?: string) => {
    if (!historicalRecordToDelete) return;

    setDeleteHistoricalLoading(true);
    try {
      const response = await fetch(`/api/diseases/historical/${historicalRecordToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Historical record deleted successfully');
        fetchHistoricalStatistics();
        setShowDeleteHistoricalDialog(false);
        setHistoricalRecordToDelete(null);
      } else {
        toast.error(data.error || 'Failed to delete historical record');
      }
    } catch (err) {
      console.error('Error deleting historical record:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setDeleteHistoricalLoading(false);
    }
  };

  // Memoized disease options for staff
  const diseaseOptions = useMemo(() => [
    { id: 'all', label: 'All Diseases', color: 'blue' },
    ...STAFF_DISEASE_TYPES.map(type => ({
      id: type,
      label: DISEASE_TYPE_LABELS[type],
      color: type === 'dengue' ? 'red' :
             type === 'malaria' ? 'yellow' :
             type === 'measles' ? 'orange' :
             type === 'animal_bite' ? 'gray' :
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
      roleId={5}
      pageTitle="Disease Surveillance"
      pageDescription="Comprehensive disease monitoring and analytics for Panabo City"
    >
      <Container size="full">
        {/* Page Header */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Disease Surveillance</h1>
          </div>
          <p className="text-gray-600">Record, monitor, and analyze disease cases with geographic visualization and predictive analytics</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('data-management')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'data-management'
                  ? 'text-primary-teal border-b-2 border-primary-teal bg-teal-50/50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Database className="w-4 h-4" />
              Data Management
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

        {/* Tab Content */}
        {activeTab === 'data-management' && (
          <div className="space-y-6">
            {/* Action Bar for Historical Statistics */}
            <div className="flex justify-between gap-3 items-center">
              <button
                onClick={() => setShowResetDataDialog(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
                title="Clear all disease surveillance data for testing"
              >
                <Trash2 className="w-4 h-4" />
                Reset All Data
              </button>

              <div className="flex justify-end gap-3">
                <a
                  href="/templates/disease-historical-import-template.xlsx"
                  download
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                  title="Download Excel Template"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </a>
                <button
                  onClick={() => setIsExcelImportOpen(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                  title="Import from Excel"
                >
                  <Upload className="w-4 h-4" />
                  Import Excel
                </button>
                <button
                  onClick={() => setIsHistoricalFormOpen(true)}
                  className="px-4 py-2 bg-white text-primary-teal border border-primary-teal rounded-md hover:bg-teal-50 transition-colors flex items-center gap-2 shadow-sm"
                  title="Add Historical Data Manually"
                >
                  <Database className="w-4 h-4" />
                  Add Historical Data
                </button>
                <button
                  onClick={() => setIsHistoricalStatsReportOpen(true)}
                  className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </button>
              </div>
            </div>

            {/* Summary Statistics */}
            <HistoricalStatsSummary summary={historicalSummary} loading={loadingHistorical} />

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Filter Historical Data</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Disease Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Disease Type
                  </label>
                  <select
                    value={historicalFilters.disease_type}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, disease_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    <option value="all">All Diseases</option>
                    {DISEASE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Barangay Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Barangay
                  </label>
                  <select
                    value={historicalFilters.barangay_id}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, barangay_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    <option value="all">All Barangays</option>
                    {barangays.map(barangay => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={historicalFilters.start_date}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={historicalFilters.end_date}
                    onChange={(e) => setHistoricalFilters({ ...historicalFilters, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Historical Statistics Table */}
            {loadingHistorical ? (
              <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
                <p className="text-gray-600">Loading historical statistics...</p>
              </div>
            ) : (
              <HistoricalStatisticsTable
                statistics={historicalStatistics}
                onEdit={handleEditHistoricalRecord}
                onDelete={handleDeleteHistoricalClick}
              />
            )}
          </div>
        )}

        {/* Geographic View Tab */}
        {activeTab === 'geographic-view' && (
          <OutbreakDataProvider
            diseaseType={diseaseFilter}
            barangayId={barangayFilter}
            autoRefresh={false}
          >
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Filter Options</h3>
                  </div>
                  <button
                    onClick={() => setIsGeographicReportOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                    title="Generate Geographic Outbreak Report"
                  >
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </button>
                </div>

                {/* Disease Type Filter */}
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

                {/* Barangay and Time Range Filters */}
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
                        <option key={barangay.id} value={barangay.id}>
                          {barangay.name}
                        </option>
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

            {/* Main Content - Vertical Layout */}
            {(loading || outbreakAlertsLoading) && !loadingTimeout ? (
              <div className="space-y-6">
                {/* Loading State for Both Map and Outbreak Alerts */}
                <ProfessionalCard>
                  <div className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal"></div>
                      <p className="mt-4 text-base font-medium text-gray-700">Loading geographic data...</p>
                      <p className="mt-1 text-sm text-gray-500">Please wait while we fetch disease and outbreak information</p>
                    </div>
                  </div>
                </ProfessionalCard>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Timeout Warning */}
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

                {/* Disease Heatmap - Full Width */}
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

                  {/* Outbreak Risk Level Filter for Map */}
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Filter Map by Outbreak Risk Level</label>
                    <select
                      value={outbreakRiskFilter}
                      onChange={(e) => setOutbreakRiskFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                    >
                      <option value="all">Show All Outbreaks</option>
                      <option value="high">High Risk Only (≥70%)</option>
                      <option value="medium">Medium Risk Only (50-69%)</option>
                      <option value="low">Low Risk Only (&lt;50%)</option>
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
                      outbreakRiskFilter={outbreakRiskFilter}
                    />
                  )}
                </ProfessionalCard>

                {/* Outbreak Alerts - Full Width */}
                <ProfessionalCard>
                  <OutbreakAlerts
                    diseaseType={diseaseFilter}
                    barangayId={barangayFilter}
                    autoRefresh={true}
                    refreshInterval={60000} // Refresh every minute
                    onLoadingChange={setOutbreakAlertsLoading}
                  />
                </ProfessionalCard>
              </div>
            )}

            {/* Information Panel */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">About Geographic View</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• The heatmap shows disease distribution across all barangays in real-time</p>
                    <p>• Darker colors and larger circles indicate higher case concentrations</p>
                    <p>• Outbreak alerts automatically detect unusual disease pattern spikes</p>
                    <p>• Filter by disease type, barangay, and time range for focused analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </OutbreakDataProvider>
        )}

        {/* Analytics & Trends Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Filters */}
            <ProfessionalCard>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Analysis Filters</h3>
                  </div>
                  <button
                    onClick={() => setIsTrendsReportOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                    title="Generate Trends Analysis Report"
                  >
                    <FileText className="w-4 h-4" />
                    Generate Report
                  </button>
                </div>

                {/* Disease Type Filter */}
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

                {/* Barangay and Time Range Filters */}
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
                        <option key={barangay.id} value={barangay.id}>
                          {barangay.name}
                        </option>
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

            {/* Historical Charts */}
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

            {/* Information Panel */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">About Analytics & Trends</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• View historical disease trends and patterns over time</p>
                    <p>• Analyze seasonal variations and disease progression</p>
                    <p>• Compare disease cases across different barangays</p>
                    <p>• Use predictive analytics for outbreak preparedness</p>
                    <p>• Filter data by disease type, location, and time range</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Historical Data Import Form */}
        <HistoricalDataForm
          isOpen={isHistoricalFormOpen}
          onClose={() => setIsHistoricalFormOpen(false)}
          onSuccess={() => {
            toast.success('Historical disease data imported successfully');
            fetchHistoricalStatistics();
          }}
          barangays={barangays}
        />

        {/* Excel Import Modal */}
        <ExcelImportModal
          isOpen={isExcelImportOpen}
          onClose={() => setIsExcelImportOpen(false)}
          onImportSuccess={() => {
            toast.success('Disease data imported from Excel successfully');
            fetchHistoricalStatistics();
          }}
        />

        {/* Edit Historical Record Modal */}
        <EditHistoricalRecordModal
          isOpen={isEditHistoricalModalOpen}
          onClose={() => setIsEditHistoricalModalOpen(false)}
          onSuccess={() => {
            toast.success('Historical record updated successfully');
            fetchHistoricalStatistics();
          }}
          record={editingHistoricalRecord}
        />

        {/* Delete Historical Record Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteHistoricalDialog}
          onClose={() => {
            setShowDeleteHistoricalDialog(false);
            setHistoricalRecordToDelete(null);
          }}
          onConfirm={handleConfirmDeleteHistorical}
          title="Delete Historical Record"
          message={
            historicalRecordToDelete
              ? `Are you sure you want to delete this historical record?\n\nDisease: ${getDiseaseDisplayName(historicalRecordToDelete.disease_type, historicalRecordToDelete.custom_disease_name)}\nDate: ${format(new Date(historicalRecordToDelete.record_date), 'MMM d, yyyy')}\nCases: ${historicalRecordToDelete.case_count}\n\nThis action cannot be undone and will permanently remove this data from the system.`
              : ''
          }
          confirmText="Delete Record"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteHistoricalLoading}
        />

        {/* Historical Statistics Report Generator */}
        <HistoricalStatisticsReportGenerator
          isOpen={isHistoricalStatsReportOpen}
          onClose={() => setIsHistoricalStatsReportOpen(false)}
          barangays={barangays}
        />

        {/* Geographic Outbreak Report Generator */}
        <GeographicOutbreakReportGenerator
          isOpen={isGeographicReportOpen}
          onClose={() => setIsGeographicReportOpen(false)}
          barangays={barangays}
          filters={{
            disease_type: diseaseFilter,
            barangay_id: barangayFilter,
            time_range: timeRange.toString(),
          }}
        />

        {/* Trends Analysis Report Generator */}
        <TrendsAnalysisReportGenerator
          isOpen={isTrendsReportOpen}
          onClose={() => setIsTrendsReportOpen(false)}
          barangays={barangays}
          filters={{
            disease_type: diseaseFilter,
            barangay_id: barangayFilter,
            time_range: timeRange.toString(),
          }}
        />

        {/* Reset All Data Dialog */}
        <ResetDataDialog
          isOpen={showResetDataDialog}
          onClose={() => setShowResetDataDialog(false)}
          onSuccess={() => {
            fetchHistoricalStatistics();
            toast.success('All disease surveillance data has been reset. You can now import fresh data.');
          }}
        />
      </Container>
    </DashboardLayout>
  );
}
