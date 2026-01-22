'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import HealthcardExcelImportModal from '@/components/staff/HealthcardExcelImportModal';
import { EditHealthcardStatisticModal } from '@/components/staff/EditHealthcardStatisticModal';
import { HealthcardStatsSummary } from '@/components/staff/HealthcardStatsSummary';
import { HealthcardStatisticsTable } from '@/components/staff/HealthcardStatisticsTable';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/auth';
import {
  CreditCard,
  Upload,
  Download,
  Filter,
  FileText,
  AlertCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import HealthCardSARIMAChart from '@/components/healthcare-admin/HealthCardSARIMAChart';
import HealthCardSARIMAMetrics from '@/components/healthcare-admin/HealthCardSARIMAMetrics';
import { AppointmentStatusChart } from '@/components/charts';

interface HealthcardStatistic {
  id: string;
  healthcard_type: 'food_handler' | 'non_food' | 'pink';
  record_date: string;
  cards_issued: number;
  barangay_id: number | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  barangays?: {
    id: number;
    name: string;
    code: string;
  } | null;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
}

// HealthCard Admin only handles Yellow and Green cards (NO pink cards)
const HEALTHCARD_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'food_handler', label: 'Yellow Card - General' },
  { value: 'non_food', label: 'Green Card - General' },
  // Pink cards are handled by HIV Admin only
];

export default function HealthcareAdminHealthcardStatisticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<HealthcardStatistic[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const toast = useToast();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthcardStatistic | null>(null);

  // Delete Dialog State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<HealthcardStatistic | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Summary state
  const [summary, setSummary] = useState<any>({
    total_records: 0,
    total_cards_issued: 0,
    food_handler_cards: 0,
    non_food_cards: 0,
    pink_cards: 0,
    date_range: {
      earliest: null,
      latest: null,
    },
  });

  // Filter state
  const [filters, setFilters] = useState({
    healthcard_type: 'all',
    barangay_id: 'all',
    start_date: '',
    end_date: '',
  });

  // SARIMA Prediction state
  const [predictionRefreshKey, setPredictionRefreshKey] = useState(0);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  // Appointment Statistics state (for status breakdown chart)
  const [appointmentStats, setAppointmentStats] = useState<any[]>([]);
  const [appointmentStatsLoading, setAppointmentStatsLoading] = useState(true);

  useEffect(() => {
    // Check if the healthcare admin has healthcard category
    if (user) {
      const isHealthcardAdmin = user.role_id === 2 && user.admin_category === 'healthcard';
      const isSuperAdmin = user.role_id === 1;

      if (!isHealthcardAdmin && !isSuperAdmin) {
        setHasAccess(false);
        toast.error('You do not have permission to access this page. This page is only for Healthcare Admins with HealthCard category.');
        router.push('/healthcare-admin/dashboard');
      } else {
        setHasAccess(true);
        fetchBarangays();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (hasAccess) {
      fetchStatistics();
      fetchAppointmentStatistics();
    }
  }, [filters, hasAccess]);

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

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters.healthcard_type !== 'all') {
        params.append('healthcard_type', filters.healthcard_type);
      }
      if (filters.barangay_id !== 'all') {
        params.append('barangay_id', filters.barangay_id);
      }
      if (filters.start_date) {
        params.append('start_date', filters.start_date);
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date);
      }

      const response = await fetch(`/api/healthcards/historical?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setStatistics(data.data.records || []);
        setSummary(data.data.summary || {
          total_records: 0,
          total_cards_issued: 0,
          food_handler_cards: 0,
          non_food_cards: 0,
          pink_cards: 0,
          date_range: {
            earliest: null,
            latest: null,
          },
        });
      } else {
        toast.error('Failed to load healthcard statistics');
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentStatistics = async () => {
    try {
      setAppointmentStatsLoading(true);
      const response = await fetch('/api/appointments/statistics');
      const data = await response.json();

      if (data.success) {
        setAppointmentStats(data.data.monthly || []);
      }
    } catch (err) {
      console.error('Error fetching appointment statistics:', err);
    } finally {
      setAppointmentStatsLoading(false);
    }
  };

  const handleEdit = (record: HealthcardStatistic) => {
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    toast.success('Record updated successfully');
    fetchStatistics();
  };

  const handleDelete = (record: HealthcardStatistic) => {
    setRecordToDelete(record);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/healthcards/statistics/${recordToDelete.id}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || result.error || 'Failed to delete record'
        );
      }

      toast.success(result.message || 'Record deleted successfully');
      setShowDeleteDialog(false);
      setRecordToDelete(null);
      fetchStatistics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete record');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePredictions = async () => {
    setIsGeneratingPredictions(true);
    setGenerationStatus({ type: 'idle' });

    try {
      // Generate predictions for both Yellow (food_handler) and Green (non_food) cards
      const yellowResponse = await fetch('/api/healthcards/generate-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          healthcard_type: 'food_handler',
          months_forecast: 12,
          granularity: 'monthly',
        }),
      });

      const yellowData = await yellowResponse.json();

      if (!yellowData.success) {
        throw new Error(yellowData.error || 'Failed to generate Yellow card predictions');
      }

      const greenResponse = await fetch('/api/healthcards/generate-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          healthcard_type: 'non_food',
          months_forecast: 12,
          granularity: 'monthly',
        }),
      });

      const greenData = await greenResponse.json();

      if (!greenData.success) {
        throw new Error(greenData.error || 'Failed to generate Green card predictions');
      }

      // Both succeeded
      const totalPredictions = (yellowData.data?.predictions?.length || 0) + (greenData.data?.predictions?.length || 0);
      setGenerationStatus({
        type: 'success',
        message: `Generated predictions for Yellow and Green cards (${totalPredictions} total)`
      });
      setPredictionRefreshKey(prev => prev + 1);
      toast.success('Predictions generated successfully for both Yellow and Green cards');
    } catch (error) {
      console.error('Generate predictions error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setGenerationStatus({ type: 'error', message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsGeneratingPredictions(false);
    }
  };

  // Show loading state while checking access
  if (hasAccess === null) {
    return (
      <DashboardLayout
        roleId={2}
        pageTitle="HealthCard Statistics"
        pageDescription="Manage healthcard issuance data"
      >
        <Container size="full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#20C997]"></div>
              <p className="mt-2 text-sm text-gray-500">Checking access permissions...</p>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  // Show access denied message if no access
  if (hasAccess === false) {
    return (
      <DashboardLayout
        roleId={2}
        pageTitle="HealthCard Statistics"
        pageDescription="Access Denied"
      >
        <Container size="full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="p-3 bg-red-100 rounded-full inline-block mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You do not have permission to access this page. This page is only available to Healthcare Admins with HealthCard category.
              </p>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="HealthCard Statistics"
      pageDescription="Import and manage healthcard issuance data"
    >
      <Container size="full">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-[#20C997]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">HealthCard Statistics</h1>
                <p className="text-sm text-gray-600">Manage healthcard issuance data and generate forecasts</p>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <HealthcardStatsSummary summary={summary} loading={loading} showPinkCards={false} />

          {/* Appointment Status Breakdown Chart */}
          <AppointmentStatusChart
            data={appointmentStats}
            loading={appointmentStatsLoading}
            title="Monthly Appointment Status Breakdown (Completed, Cancelled, No Show)"
            height={450}
          />

          {/* Action Bar - Import Historical Data */}
          <div className="flex justify-end gap-3">
            <a
              href="/templates/healthcard-historical-import-template.xlsx"
              download
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
              title="Download Excel Template"
            >
              <Download className="w-4 h-4" />
              Download Template
            </a>
            <button
              onClick={() => setIsExcelImportOpen(true)}
              className="px-4 py-2 bg-[#20C997] text-white rounded-md hover:bg-[#1AA179] transition-colors flex items-center gap-2 shadow-sm"
              title="Import from Excel"
            >
              <Upload className="w-4 h-4" />
              Import Excel
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Filter Data</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* HealthCard Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  HealthCard Type
                </label>
                <select
                  value={filters.healthcard_type}
                  onChange={(e) => setFilters({ ...filters, healthcard_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                >
                  {HEALTHCARD_TYPES.map(type => (
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
                  value={filters.barangay_id}
                  onChange={(e) => setFilters({ ...filters, barangay_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
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
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                />
              </div>

              {/* End Date Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                />
              </div>
            </div>
          </div>

          {/* Statistics Table */}
          {loading ? (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#20C997]"></div>
              <p className="mt-2 text-sm text-gray-500">Loading healthcard statistics...</p>
            </div>
          ) : (
            <HealthcardStatisticsTable
              statistics={statistics}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {/* SARIMA Predictions Section */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-teal-500 to-blue-500 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">HealthCard Demand Forecast (SARIMA)</h3>
                    <p className="text-sm text-gray-600">AI-powered predictions for Yellow and Green card issuance</p>
                  </div>
                </div>
                <button
                  onClick={handleGeneratePredictions}
                  disabled={isGeneratingPredictions}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#20C997] text-white rounded-lg hover:bg-[#1AA179] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  {isGeneratingPredictions ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
              {generationStatus.type !== 'idle' && (
                <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                  generationStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {generationStatus.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  )}
                  <p className={`text-sm ${generationStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                    {generationStatus.message}
                  </p>
                </div>
              )}
            </div>
            <div className="p-6 space-y-8">
              {/* Yellow Card (Food Handler) Predictions */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  Yellow Card (Food Handler) Forecast
                </h4>
                <HealthCardSARIMAChart key={`yellow-${predictionRefreshKey}`} healthcardType="food_handler" />
              </div>

              {/* Green Card (Non-Food Handler) Predictions */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  Green Card (Non-Food Handler) Forecast
                </h4>
                <HealthCardSARIMAChart key={`green-${predictionRefreshKey}`} healthcardType="non_food" />
              </div>
            </div>
          </div>
        </div>

        {/* Excel Import Modal */}
        <HealthcardExcelImportModal
          isOpen={isExcelImportOpen}
          onClose={() => setIsExcelImportOpen(false)}
          onImportSuccess={() => {
            toast.success('Healthcard data imported from Excel successfully');
            fetchStatistics();
            setPredictionRefreshKey(prev => prev + 1);
          }}
        />

        {/* Edit Modal */}
        <EditHealthcardStatisticModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          record={selectedRecord}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => !actionLoading && setShowDeleteDialog(false)}
          onConfirm={confirmDelete}
          title="Delete HealthCard Record"
          message={
            recordToDelete
              ? `Are you sure you want to delete the record from ${new Date(
                  recordToDelete.record_date
                ).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} with ${recordToDelete.cards_issued} card${
                  recordToDelete.cards_issued !== 1 ? 's' : ''
                } issued? This action cannot be undone.`
              : 'Are you sure you want to delete this record?'
          }
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={actionLoading}
        />
      </Container>
    </DashboardLayout>
  );
}