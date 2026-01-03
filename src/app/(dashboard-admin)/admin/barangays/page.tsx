'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog, Modal, Button } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Toast, ToastContainer, ToastVariant } from '@/components/ui/Toast';
import BarangayMapPicker from '@/components/admin/BarangayMapPicker';
import {
  MapPin,
  Plus,
  Edit,
  Trash2,
  Download,
  Map as MapIcon,
} from 'lucide-react';
import type {
  Barangay,
  BarangayFormData,
  BarangayWithStats,
} from '@/types/barangay';
import {
  barangayFormSchema,
  formDataToCreatePayload,
  barangayToFormData,
  formatCoordinates,
} from '@/types/barangay';

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface BarangayStats {
  total: number;
  with_coordinates: number;
}

const initialFormData: BarangayFormData = {
  name: '',
  code: '',
  latitude: null,
  longitude: null,
};

export default function AdminBarangaysPage() {
  // State management
  const [barangays, setBarangays] = useState<BarangayWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState<Barangay | null>(null);

  // Form state
  const [formData, setFormData] = useState<BarangayFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [barangayToDelete, setBarangayToDelete] = useState<Barangay | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Statistics
  const [stats, setStats] = useState<BarangayStats>({
    total: 0,
    with_coordinates: 0,
  });

  // Fetch barangays on mount
  useEffect(() => {
    fetchBarangays();
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBarangays();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Toast helper functions
  const showToast = (message: string, variant: ToastVariant) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, variant }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Calculate statistics
  const calculateStats = (barangaysList: BarangayWithStats[]) => {
    const total = barangaysList.length;
    const with_coordinates = barangaysList.filter(b => b.coordinates).length;

    setStats({
      total,
      with_coordinates,
    });
  };

  // Fetch barangays from API
  const fetchBarangays = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('include_stats', 'true');

      const response = await fetch(`/api/admin/barangays?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch barangays');
      }

      setBarangays(result.data || []);
      calculateStats(result.data || []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load barangays', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    try {
      barangayFormSchema.parse(formData);
      setFormErrors({});
      return true;
    } catch (error: any) {
      const errors: Record<string, string> = {};
      if (error.errors) {
        error.errors.forEach((err: any) => {
          errors[err.path[0]] = err.message;
        });
      }
      setFormErrors(errors);
      return false;
    }
  };

  // Handle create barangay
  const handleCreate = async () => {
    if (!validateForm()) {
      showToast('Please fix the validation errors', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const payload = formDataToCreatePayload(formData);

      const response = await fetch('/api/admin/barangays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create barangay');
      }

      showToast(result.message || 'Barangay created successfully', 'success');
      setIsAddModalOpen(false);
      setFormData(initialFormData);
      setFormErrors({});
      fetchBarangays();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create barangay', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle update barangay
  const handleUpdate = async () => {
    if (!selectedBarangay || !validateForm()) {
      showToast('Please fix the validation errors', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const payload = formDataToCreatePayload(formData);

      const response = await fetch(`/api/admin/barangays/${selectedBarangay.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update barangay');
      }

      showToast(result.message || 'Barangay updated successfully', 'success');
      setIsEditModalOpen(false);
      setSelectedBarangay(null);
      setFormData(initialFormData);
      setFormErrors({});
      fetchBarangays();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update barangay', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete barangay
  const handleDelete = async () => {
    if (!barangayToDelete) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/barangays/${barangayToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to delete barangay');
      }

      showToast(result.message || 'Barangay deleted successfully', 'success');
      setShowDeleteDialog(false);
      setBarangayToDelete(null);
      fetchBarangays();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete barangay', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open add modal
  const openAddModal = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (barangay: Barangay) => {
    setSelectedBarangay(barangay);
    setFormData(barangayToFormData(barangay));
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (barangay: Barangay) => {
    setBarangayToDelete(barangay);
    setShowDeleteDialog(true);
  };

  // Handle form input change
  const handleInputChange = (field: keyof BarangayFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['#', 'ID', 'Name', 'Code', 'Latitude', 'Longitude', 'Patients'];
    const rows = barangays.map((b, index) => [
      index + 1,
      b.id,
      b.name,
      b.code,
      b.coordinates?.lat || '',
      b.coordinates?.lng || '',
      b.patient_count || 0,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barangays-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Table columns configuration
  const tableColumns = [
    {
      accessor: '_rowNumber',
      header: '#',
      sortable: false,
      width: '60px',
      render: (value: any) => (
        <span className="text-sm font-medium text-gray-600">{value}</span>
      ),
    },
    {
      accessor: 'id',
      header: 'ID',
      sortable: true,
      width: '80px',
    },
    {
      accessor: 'name',
      header: 'Barangay Name',
      sortable: true,
    },
    {
      accessor: 'code',
      header: 'Code',
      sortable: true,
      width: '100px',
    },
    {
      accessor: 'coordinates',
      header: 'Coordinates',
      render: (value: any, row: BarangayWithStats) => (
        <span className="text-sm text-gray-700">
          {formatCoordinates(row.coordinates)}
        </span>
      ),
    },
    {
      accessor: 'patient_count',
      header: 'Patients',
      render: (value: any, row: BarangayWithStats) => (
        <span className="text-sm font-medium text-primary-teal">
          {row.patient_count || 0}
        </span>
      ),
    },
    {
      accessor: 'actions',
      header: 'Actions',
      render: (value: any, row: BarangayWithStats) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            icon={Edit}
            iconPosition="left"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openDeleteDialog(row)}
            icon={Trash2}
            iconPosition="left"
            className="text-danger-red hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Barangays"
      pageDescription="Manage barangays and coverage areas"
    >
      <Container size="full">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ProfessionalCard className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-[#20C997]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-teal-600">Total Barangays</p>
                <p className="text-3xl font-bold text-teal-900 mt-2">{stats.total}</p>
                <p className="text-xs text-teal-600 mt-1">Active coverage areas</p>
              </div>
              <MapPin className="w-10 h-10 text-teal-500 opacity-80" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">With Coordinates</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.with_coordinates}</p>
                <p className="text-xs text-blue-600 mt-1">{Math.round((stats.with_coordinates / (stats.total || 1)) * 100)}% mapped</p>
              </div>
              <MapIcon className="w-10 h-10 text-blue-500 opacity-80" />
            </div>
          </ProfessionalCard>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">All Barangays</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage geographic coverage areas
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleExport}
                  icon={Download}
                  iconPosition="left"
                >
                  Export CSV
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={openAddModal}
                  icon={Plus}
                  iconPosition="left"
                >
                  Add Barangay
                </Button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-6 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
            />
          </div>

          {/* Table */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                <p className="mt-2 text-sm text-gray-500">Loading barangays...</p>
              </div>
            ) : (
              <EnhancedTable
                columns={tableColumns}
                data={barangays.map((item, index) => ({ ...item, _rowNumber: index + 1 }))}
                searchable={false}
                paginated={false}
                emptyMessage="No barangays found"
              />
            )}
          </div>
        </div>
      </Container>

      {/* Add Barangay Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !actionLoading && setIsAddModalOpen(false)}
        title="Add New Barangay"
        size="lg"
      >
        <div className="space-y-6">
          {/* Barangay Information Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Barangay Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barangay Name <span className="text-danger-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent ${
                    formErrors.name ? 'border-danger-red' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Datu Abdul Dadia"
                />
                {formErrors.name && (
                  <p className="text-sm text-danger-red mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barangay Code <span className="text-danger-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent ${
                    formErrors.code ? 'border-danger-red' : 'border-gray-300'
                  }`}
                  placeholder="e.g., DAD (2-5 characters)"
                  maxLength={5}
                />
                {formErrors.code && (
                  <p className="text-sm text-danger-red mt-1">{formErrors.code}</p>
                )}
              </div>
            </div>
          </div>

          {/* Geographic Coordinates Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Geographic Coordinates</h3>
            <p className="text-xs text-gray-600 mb-3">Click on the map to select barangay location</p>

            {/* Map Picker */}
            <BarangayMapPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationSelect={(lat, lng) => {
                handleInputChange('latitude', lat);
                handleInputChange('longitude', lng);
              }}
            />

            {/* Manual Input (Secondary Option) */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2 italic">Or enter coordinates manually:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude ?? ''}
                    onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent text-sm ${
                      formErrors.latitude ? 'border-danger-red' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 7.313333"
                  />
                  {formErrors.latitude && (
                    <p className="text-sm text-danger-red mt-1">{formErrors.latitude}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude ?? ''}
                    onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent text-sm ${
                      formErrors.longitude ? 'border-danger-red' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 125.683333"
                  />
                  {formErrors.longitude && (
                    <p className="text-sm text-danger-red mt-1">{formErrors.longitude}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informational Box */}
          <div className="bg-teal-50 rounded-lg p-5 border border-teal-200 my-2">
            <p className="text-sm font-medium text-teal-900 mb-2">📍 Geographic Coverage</p>
            <p className="text-sm text-teal-700">
              Barangay coordinates are used to identify coverage areas, visualize disease distribution through heatmaps, and organize patient records by location.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreate}
              loading={actionLoading}
            >
              Create Barangay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Barangay Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => !actionLoading && setIsEditModalOpen(false)}
        title={`Edit Barangay: ${selectedBarangay?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Barangay Information Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Barangay Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barangay Name <span className="text-danger-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent ${
                    formErrors.name ? 'border-danger-red' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Datu Abdul Dadia"
                />
                {formErrors.name && (
                  <p className="text-sm text-danger-red mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Barangay Code <span className="text-danger-red">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent ${
                    formErrors.code ? 'border-danger-red' : 'border-gray-300'
                  }`}
                  placeholder="e.g., DAD (2-5 characters)"
                  maxLength={5}
                />
                {formErrors.code && (
                  <p className="text-sm text-danger-red mt-1">{formErrors.code}</p>
                )}
              </div>
            </div>
          </div>

          {/* Geographic Coordinates Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Geographic Coordinates</h3>
            <p className="text-xs text-gray-600 mb-3">Click on the map to update barangay location</p>

            {/* Map Picker */}
            <BarangayMapPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationSelect={(lat, lng) => {
                handleInputChange('latitude', lat);
                handleInputChange('longitude', lng);
              }}
            />

            {/* Manual Input (Secondary Option) */}
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2 italic">Or enter coordinates manually:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.latitude ?? ''}
                    onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent text-sm ${
                      formErrors.latitude ? 'border-danger-red' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 7.313333"
                  />
                  {formErrors.latitude && (
                    <p className="text-sm text-danger-red mt-1">{formErrors.latitude}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={formData.longitude ?? ''}
                    onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent text-sm ${
                      formErrors.longitude ? 'border-danger-red' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 125.683333"
                  />
                  {formErrors.longitude && (
                    <p className="text-sm text-danger-red mt-1">{formErrors.longitude}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Informational Box */}
          <div className="bg-teal-50 rounded-lg p-5 border border-teal-200 my-2">
            <p className="text-sm font-medium text-teal-900 mb-2">📍 Geographic Coverage</p>
            <p className="text-sm text-teal-700">
              Barangay coordinates are used to identify coverage areas, visualize disease distribution through heatmaps, and organize patient records by location.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              loading={actionLoading}
            >
              Update Barangay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => !actionLoading && setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Barangay"
        message={`Are you sure you want to delete "${barangayToDelete?.name}"? This action cannot be undone and will fail if there are associated patients or disease records.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* Toast Notifications */}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            variant={toast.variant}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </DashboardLayout>
  );
}
