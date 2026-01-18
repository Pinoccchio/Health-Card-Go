'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import HealthcardExcelImportModal from '@/components/staff/HealthcardExcelImportModal';
import { EditHealthcardStatisticModal } from '@/components/staff/EditHealthcardStatisticModal';
import { HealthcardStatsSummary } from '@/components/staff/HealthcardStatsSummary';
import { HealthcardStatisticsTable } from '@/components/staff/HealthcardStatisticsTable';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  CreditCard,
  Upload,
  Download,
  Filter,
  FileText,
} from 'lucide-react';

interface HealthcardStatistic {
  id: string;
  healthcard_type: 'food_handler' | 'non_food';
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

const HEALTHCARD_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'food_handler', label: 'Food Handler' },
  { value: 'non_food', label: 'Non-Food' },
];

export default function StaffHealthcardStatisticsPage() {
  const [statistics, setStatistics] = useState<HealthcardStatistic[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
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

  useEffect(() => {
    fetchBarangays();
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [filters]);

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

  return (
    <DashboardLayout
      roleId={5}
      pageTitle="HealthCard Statistics"
      pageDescription="Import and manage historical healthcard issuance data"
    >
      <Container size="full">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">HealthCard Statistics</h1>
                <p className="text-sm text-gray-600">Historical healthcard issuance data for SARIMA prediction training</p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
              title="Import from Excel"
            >
              <Upload className="w-4 h-4" />
              Import Excel
            </button>
          </div>

          {/* Summary Statistics */}
          <HealthcardStatsSummary summary={summary} loading={loading} />

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Filter Historical Data</h3>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Statistics Table */}
          {loading ? (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading healthcard statistics...</p>
            </div>
          ) : (
            <HealthcardStatisticsTable
              statistics={statistics}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Excel Import Modal */}
        <HealthcardExcelImportModal
          isOpen={isExcelImportOpen}
          onClose={() => setIsExcelImportOpen(false)}
          onImportSuccess={() => {
            toast.success('Healthcard data imported from Excel successfully');
            fetchStatistics();
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
