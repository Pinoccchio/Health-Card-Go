'use client';

import { useState, useEffect } from 'react';
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/contexts/ToastContext';
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

const DISEASE_TYPES = [
  { value: 'dengue', label: 'Dengue' },
  { value: 'hiv_aids', label: 'HIV/AIDS' },
  { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'measles', label: 'Measles' },
  { value: 'rabies', label: 'Rabies' },
  { value: 'other', label: 'Other (Custom Disease)' },
];

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
 * Get display name for disease type
 * Shows custom_disease_name for 'other' type, otherwise shows standard label
 */
function getDiseaseDisplayName(diseaseType: string, customDiseaseName?: string): string {
  if (diseaseType === 'other' && customDiseaseName) {
    return customDiseaseName;
  }
  return DISEASE_TYPES.find(d => d.value === diseaseType)?.label || diseaseType;
}

export default function StaffDiseaseSurveillancePage() {
  const [barangays, setBarangays] = useState<any[]>([]);
  const [isHistoricalFormOpen, setIsHistoricalFormOpen] = useState(false);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
  const [isHistoricalStatsReportOpen, setIsHistoricalStatsReportOpen] = useState(false);

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

  useEffect(() => {
    fetchBarangays();
    fetchHistoricalStatistics();
  }, []);

  // Fetch historical statistics when filters change
  useEffect(() => {
    fetchHistoricalStatistics();
  }, [historicalFilters]);

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


  return (
    <DashboardLayout
      roleId={5}
      pageTitle="Disease Monitoring"
      pageDescription="Record and monitor disease cases across Panabo City"
    >
      <Container size="full">
        {/* Historical Statistics */}
        <div className="space-y-6">
            {/* Action Bar for Historical Statistics */}
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
      </Container>
    </DashboardLayout>
  );
}
