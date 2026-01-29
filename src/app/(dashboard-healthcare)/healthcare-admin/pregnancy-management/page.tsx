'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/auth';
import {
  Baby,
  Download,
  AlertCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
  Upload,
  Filter,
} from 'lucide-react';
import ServiceHistoricalImportModal from '@/components/healthcare-admin/ServiceHistoricalImportModal';
import ServiceSARIMAChart from '@/components/healthcare-admin/ServiceSARIMAChart';
import ServiceSARIMAMetrics from '@/components/healthcare-admin/ServiceSARIMAMetrics';
import { AppointmentStatusChart } from '@/components/charts';
import { HIVDataSourceCards } from '@/components/healthcare-admin/HIVDataSourceCards';
import { HIVStatisticsTable } from '@/components/healthcare-admin/HIVStatisticsTable';
import { EditHIVStatisticModal } from '@/components/healthcare-admin/EditHIVStatisticModal';
import type { HIVStatistic } from '@/components/healthcare-admin/HIVStatisticsTable';

export default function PregnancyManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Import and SARIMA state
  const [isAppointmentImportOpen, setIsAppointmentImportOpen] = useState(false);
  const [predictionRefreshKey, setPredictionRefreshKey] = useState(0);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  // Appointment Statistics state (for status breakdown chart)
  const [appointmentStats, setAppointmentStats] = useState<any[]>([]);
  const [appointmentStatsLoading, setAppointmentStatsLoading] = useState(true);

  // Data Source Summary state (for DataSourceCards)
  const [dataSourceSummary, setDataSourceSummary] = useState({
    from_appointments: { total: 0, completed: 0, cancelled: 0 },
    from_historical: { total_appointments: 0, record_count: 0 },
    combined: { total: 0 },
    date_range: { earliest: null as string | null, latest: null as string | null },
  });
  const [dataSourceLoading, setDataSourceLoading] = useState(true);

  // Imported records state (table)
  const [statistics, setStatistics] = useState<HIVStatistic[]>([]);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [barangays, setBarangays] = useState<any[]>([]);

  // Filter state
  const [filters, setFilters] = useState({
    barangay_id: 'all',
    start_date: '',
    end_date: '',
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HIVStatistic | null>(null);

  // Delete Dialog State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<HIVStatistic | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // Check if the healthcare admin has pregnancy category
    if (user) {
      const isPregnancyAdmin = user.role_id === 2 && user.admin_category === 'pregnancy';
      const isSuperAdmin = user.role_id === 1;

      if (!isPregnancyAdmin && !isSuperAdmin) {
        setHasAccess(false);
        toast.error('You do not have permission to access this page. This page is only for Healthcare Admins with Pregnancy category.');
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
      fetchAppointmentStatistics();
      fetchDataSourceSummary();
      fetchStatistics();
    }
  }, [hasAccess, filters]);

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

  const fetchAppointmentStatistics = async () => {
    try {
      setAppointmentStatsLoading(true);
      const response = await fetch('/api/appointments/statistics?admin_category=pregnancy');
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

  const fetchDataSourceSummary = async () => {
    try {
      setDataSourceLoading(true);
      const response = await fetch('/api/services/historical?service_id=17');
      const data = await response.json();

      if (data.success) {
        setDataSourceSummary(data.data.summary);
      }
    } catch (err) {
      console.error('Error fetching data source summary:', err);
    } finally {
      setDataSourceLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      setStatisticsLoading(true);

      const params = new URLSearchParams();
      params.append('service_id', '17');
      if (filters.barangay_id !== 'all') {
        params.append('barangay_id', filters.barangay_id);
      }
      if (filters.start_date) {
        params.append('start_date', filters.start_date);
      }
      if (filters.end_date) {
        params.append('end_date', filters.end_date);
      }

      const response = await fetch(`/api/services/statistics?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setStatistics(data.data.records || []);
      } else {
        console.error('Failed to fetch statistics:', data.error);
      }
    } catch (err) {
      console.error('Error fetching statistics:', err);
    } finally {
      setStatisticsLoading(false);
    }
  };

  const handleEdit = (record: HIVStatistic) => {
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    toast.success('Record updated successfully');
    fetchStatistics();
    fetchDataSourceSummary();
  };

  const handleDelete = (record: HIVStatistic) => {
    setRecordToDelete(record);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      setActionLoading(true);
      const response = await fetch(
        `/api/services/statistics/${recordToDelete.id}`,
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
      fetchDataSourceSummary();
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
      const response = await fetch('/api/services/generate-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 17,
          months_forecast: 12,
          granularity: 'monthly',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGenerationStatus({ type: 'success', message: `Generated predictions for ${data.data?.saved_count || data.data?.forecast_periods || 0} months` });
        setPredictionRefreshKey(prev => prev + 1);
        toast.success('Predictions generated successfully');
      } else {
        setGenerationStatus({ type: 'error', message: data.error || 'Failed to generate predictions' });
        toast.error(data.error || 'Failed to generate predictions');
      }
    } catch (error) {
      console.error('Generate predictions error:', error);
      setGenerationStatus({ type: 'error', message: 'An unexpected error occurred' });
      toast.error('An unexpected error occurred');
    } finally {
      setIsGeneratingPredictions(false);
    }
  };

  // Show loading state while checking access
  if (hasAccess === null) {
    return (
      <DashboardLayout
        roleId={2}
        pageTitle="Pregnancy Complications Management"
        pageDescription="Manage pregnancy-related complications"
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
        pageTitle="Pregnancy Complications Management"
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
                You do not have permission to access this page. This page is only available to Healthcare Admins with Pregnancy category.
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
      pageTitle="Pregnancy Complications Management"
      pageDescription="Track and manage pregnancy-related complications"
    >
      <Container size="full">
        <div className="space-y-6">
          {/* 1. Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 rounded-lg">
                <Baby className="w-6 h-6 text-[#20C997]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pregnancy Complications Management</h1>
                <p className="text-sm text-gray-600">Monitor and track pregnancy-related health complications</p>
              </div>
            </div>
          </div>

          {/* 2. Data Source Summary Cards */}
          <HIVDataSourceCards summary={dataSourceSummary} loading={dataSourceLoading} serviceName="Prenatal Checkup" />

          {/* 3. Appointment Status Breakdown Chart */}
          <AppointmentStatusChart
            data={appointmentStats}
            loading={appointmentStatsLoading}
            title="Monthly Prenatal Appointment Status Breakdown (Completed, Cancelled, No Show)"
            height={450}
          />

          {/* 4. Action Bar */}
          <div className="flex justify-end gap-3">
            <a
              href="/templates/pregnancy-appointment-import-template.csv"
              download
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
              title="Download Excel Template"
            >
              <Download className="w-4 h-4" />
              Download Template
            </a>
            <button
              onClick={() => setIsAppointmentImportOpen(true)}
              className="px-4 py-2 bg-[#20C997] text-white rounded-md hover:bg-[#1AA179] transition-colors flex items-center gap-2 shadow-sm"
              title="Import Appointment Data"
            >
              <Upload className="w-4 h-4" />
              Import Appointment Data
            </button>
          </div>

          {/* 5. Filters */}
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Filter Data</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Barangay</label>
                <select
                  value={filters.barangay_id}
                  onChange={(e) => setFilters({ ...filters, barangay_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                >
                  <option value="all">All Barangays</option>
                  {barangays.map((barangay: any) => (
                    <option key={barangay.id} value={barangay.id}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#20C997] text-sm"
                />
              </div>
            </div>
          </div>

          {/* 6. Imported Records Table */}
          {statisticsLoading ? (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#20C997]"></div>
              <p className="mt-2 text-sm text-gray-500">Loading imported records...</p>
            </div>
          ) : (
            <HIVStatisticsTable
              statistics={statistics}
              onEdit={handleEdit}
              onDelete={handleDelete}
              serviceName="Prenatal"
            />
          )}

          {/* 7. SARIMA Predictions Section */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-teal-500 to-blue-500 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Prenatal Appointment Forecast (SARIMA)</h3>
                    <p className="text-sm text-gray-600">SARIMA predictions for prenatal checkup demand</p>
                  </div>
                </div>
                <button
                  onClick={handleGeneratePredictions}
                  disabled={isGeneratingPredictions || dataSourceSummary.combined.total === 0}
                  title={dataSourceSummary.combined.total === 0 ? 'Import appointment data first to generate predictions' : 'Generate SARIMA predictions'}
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
            <div className="p-6">
              <ServiceSARIMAChart key={predictionRefreshKey} serviceId={17} serviceName="Prenatal Checkup" />
              <div className="mt-6">
                <ServiceSARIMAMetrics key={predictionRefreshKey} serviceId={17} />
              </div>
            </div>
          </div>
        </div>

        {/* Appointment Import Modal */}
        <ServiceHistoricalImportModal
          isOpen={isAppointmentImportOpen}
          onClose={() => setIsAppointmentImportOpen(false)}
          onImportSuccess={() => {
            toast.success('Appointment data imported successfully');
            setPredictionRefreshKey(prev => prev + 1);
            fetchDataSourceSummary();
            fetchStatistics();
          }}
          serviceId={17}
          serviceName="Prenatal Checkup"
        />

        {/* Edit Modal */}
        <EditHIVStatisticModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          record={selectedRecord}
          serviceName="Prenatal"
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => !actionLoading && setShowDeleteDialog(false)}
          onConfirm={confirmDelete}
          title="Delete Prenatal Appointment Record"
          message={
            recordToDelete
              ? `Are you sure you want to delete the record from ${new Date(
                  recordToDelete.record_date
                ).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })} with ${recordToDelete.appointments_completed} appointment${
                  recordToDelete.appointments_completed !== 1 ? 's' : ''
                } completed? This action cannot be undone.`
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
