'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal, Button } from '@/components/ui';
import { Toast, ToastContainer, ToastVariant } from '@/components/ui/Toast';
import { Plus, Edit, Trash2, Calendar, Users, Info } from 'lucide-react';
import type {
  Barangay,
  BarangayPopulationHistory,
  PopulationSource,
} from '@/types/barangay';

interface BarangayPopulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  barangay: Barangay | null;
}

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface FormData {
  year: number;
  population: number;
  source: PopulationSource | null;
  notes: string;
}

const POPULATION_SOURCES: PopulationSource[] = [
  'PSA Census',
  'Local Survey',
  'Estimate',
  'Other',
];

const currentYear = new Date().getFullYear();

const initialFormData: FormData = {
  year: currentYear,
  population: 0,
  source: 'Estimate',
  notes: '',
};

export default function BarangayPopulationModal({
  isOpen,
  onClose,
  barangay,
}: BarangayPopulationModalProps) {
  // State
  const [history, setHistory] = useState<BarangayPopulationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BarangayPopulationHistory | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [localCurrentPopulation, setLocalCurrentPopulation] = useState<number | null>(null);

  // Toast helper functions
  const showToast = (message: string, variant: ToastVariant) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, variant }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch population history
  const fetchHistory = useCallback(async () => {
    if (!barangay?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/barangays/${barangay.id}/population`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch population history');
      }

      const historyData = result.data.history || [];
      setHistory(historyData);

      // Update local population from latest record (first in sorted array by year desc)
      if (historyData.length > 0) {
        setLocalCurrentPopulation(historyData[0].population);
      } else {
        setLocalCurrentPopulation(null);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load population history', 'error');
    } finally {
      setLoading(false);
    }
  }, [barangay?.id]);

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && barangay?.id) {
      setToasts([]); // Clear old toasts when modal opens
      setLocalCurrentPopulation(barangay.population ?? null); // Initialize from prop
      fetchHistory();
      setShowForm(false);
      setEditingRecord(null);
      setFormData(initialFormData);
      setFormErrors({});
    }
  }, [isOpen, barangay?.id, barangay?.population, fetchHistory]);

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.year || formData.year < 1900 || formData.year > 2100) {
      errors.year = 'Year must be between 1900 and 2100';
    }

    if (!formData.population || formData.population < 0) {
      errors.population = 'Population must be a positive number';
    }

    // Check for duplicate year (only when creating new record)
    if (!editingRecord && history.some(h => h.year === formData.year)) {
      errors.year = `A record for year ${formData.year} already exists`;
    }

    // Check for duplicate year when editing (different record)
    if (editingRecord && formData.year !== editingRecord.year) {
      if (history.some(h => h.year === formData.year && h.id !== editingRecord.id)) {
        errors.year = `A record for year ${formData.year} already exists`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create/update
  const handleSubmit = async () => {
    if (!barangay?.id || !validateForm()) return;

    try {
      setActionLoading(true);

      const url = editingRecord
        ? `/api/admin/barangays/${barangay.id}/population?record_id=${editingRecord.id}`
        : `/api/admin/barangays/${barangay.id}/population`;

      const method = editingRecord ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: formData.year,
          population: formData.population,
          source: formData.source,
          notes: formData.notes || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save population record');
      }

      showToast(result.message || 'Population record saved successfully', 'success');
      setShowForm(false);
      setEditingRecord(null);
      setFormData(initialFormData);
      fetchHistory();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save population record', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (recordId: string) => {
    if (!barangay?.id) return;

    try {
      setActionLoading(true);

      const response = await fetch(
        `/api/admin/barangays/${barangay.id}/population?record_id=${recordId}`,
        { method: 'DELETE' }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete population record');
      }

      showToast(result.message || 'Population record deleted successfully', 'success');
      setDeleteConfirm(null);
      fetchHistory();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete population record', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open add form
  const openAddForm = () => {
    setEditingRecord(null);
    setFormData({
      ...initialFormData,
      population: barangay?.population || 0,
    });
    setFormErrors({});
    setShowForm(true);
  };

  // Open edit form
  const openEditForm = (record: BarangayPopulationHistory) => {
    setEditingRecord(record);
    setFormData({
      year: record.year,
      population: record.population,
      source: record.source as PopulationSource,
      notes: record.notes || '',
    });
    setFormErrors({});
    setShowForm(true);
  };

  // Handle input change
  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Format number with commas
  const formatNumber = (num: number) => num.toLocaleString();

  if (!barangay) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => !actionLoading && onClose()}
        title={`Population History: ${barangay.name}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Population Tracking</p>
                <p className="text-sm text-blue-700">
                  Track yearly population changes for accurate disease surveillance analytics.
                  The most recent year's population will be used as the current population.
                </p>
              </div>
            </div>
          </div>

          {/* Current Population */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary-teal" />
              <div>
                <p className="text-sm text-gray-600">Current Population</p>
                <p className="text-2xl font-bold text-gray-900">
                  {localCurrentPopulation !== null ? formatNumber(localCurrentPopulation) : 'Not set'}
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={openAddForm}
              icon={Plus}
              iconPosition="left"
              disabled={showForm}
            >
              Add Year
            </Button>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {editingRecord ? `Edit ${editingRecord.year} Record` : 'Add New Year Record'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year <span className="text-danger-red">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => handleInputChange('year', parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent ${
                      formErrors.year ? 'border-danger-red' : 'border-gray-300'
                    }`}
                    min={1900}
                    max={2100}
                    placeholder="e.g., 2025"
                  />
                  {formErrors.year && (
                    <p className="text-sm text-danger-red mt-1">{formErrors.year}</p>
                  )}
                </div>

                {/* Population */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Population <span className="text-danger-red">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.population === 0 ? '' : formData.population}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string for clearing, otherwise parse as number
                      handleInputChange('population', value === '' ? 0 : parseInt(value) || 0);
                    }}
                    onFocus={(e) => {
                      // Select all text on focus so user can easily replace
                      if (formData.population === 0) {
                        e.target.select();
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent ${
                      formErrors.population ? 'border-danger-red' : 'border-gray-300'
                    }`}
                    min={0}
                    placeholder="e.g., 15000"
                  />
                  {formErrors.population && (
                    <p className="text-sm text-danger-red mt-1">{formErrors.population}</p>
                  )}
                </div>

                {/* Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Source
                  </label>
                  <select
                    value={formData.source || ''}
                    onChange={(e) => handleInputChange('source', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  >
                    <option value="">Select source...</option>
                    {POPULATION_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                    placeholder="Optional notes..."
                    maxLength={500}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    setEditingRecord(null);
                    setFormData(initialFormData);
                    setFormErrors({});
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  loading={actionLoading}
                >
                  {editingRecord ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          )}

          {/* Population History Table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Historical Records</h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-teal"></div>
                <p className="mt-2 text-sm text-gray-500">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <Calendar className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No population history records yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click "Add Year" to start tracking population changes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Year
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Population
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((record, index) => (
                      <tr
                        key={record.id}
                        className={index === 0 ? 'bg-teal-50/50' : 'hover:bg-gray-50'}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {record.year}
                          </span>
                          {index === 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-teal text-white">
                              Latest
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatNumber(record.population)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {record.source || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500 line-clamp-1 max-w-[150px]">
                            {record.notes || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {deleteConfirm === record.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-gray-500">Delete?</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(record.id)}
                                className="text-danger-red hover:bg-red-50 px-2 py-1"
                                disabled={actionLoading}
                              >
                                Yes
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1"
                                disabled={actionLoading}
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditForm(record)}
                                icon={Edit}
                                className="px-2"
                                disabled={showForm}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(record.id)}
                                icon={Trash2}
                                className="text-danger-red hover:bg-red-50 px-2"
                                disabled={showForm}
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={actionLoading}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

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
    </>
  );
}
