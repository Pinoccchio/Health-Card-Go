'use client';

import { useState, useEffect } from 'react';
import { X, Save, Calendar, CreditCard, MapPin } from 'lucide-react';

interface HealthcardStatistic {
  id: string;
  healthcard_type: 'food_handler' | 'non_food' | 'pink';
  record_date: string;
  cards_issued: number;
  barangay_id: number | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  created_by_id: string;
  barangays?: {
    id: number;
    name: string;
  } | null;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Barangay {
  id: number;
  name: string;
  code: string;
}

interface EditHealthcardStatisticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: HealthcardStatistic | null;
}

export function EditHealthcardStatisticModal({
  isOpen,
  onClose,
  onSuccess,
  record,
}: EditHealthcardStatisticModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [formData, setFormData] = useState({
    healthcard_type: '' as 'food_handler' | 'non_food' | 'pink' | '',
    record_date: '',
    cards_issued: 0,
    barangay_id: null as number | null,
    source: '',
    notes: '',
  });

  // Fetch barangays on mount
  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const response = await fetch('/api/barangays');
        if (response.ok) {
          const result = await response.json();
          setBarangays(result.data || []);
        }
      } catch (err) {
        console.error('Error fetching barangays:', err);
      }
    };
    fetchBarangays();
  }, []);

  // Sync form data when record changes
  useEffect(() => {
    if (record) {
      setFormData({
        healthcard_type: record.healthcard_type,
        record_date: record.record_date,
        cards_issued: record.cards_issued,
        barangay_id: record.barangay_id,
        source: record.source || '',
        notes: record.notes || '',
      });
      setError('');
    }
  }, [record]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    // Validation
    if (!formData.healthcard_type) {
      setError('HealthCard Type is required');
      return;
    }
    if (!formData.record_date) {
      setError('Record Date is required');
      return;
    }
    if (formData.cards_issued <= 0) {
      setError('Cards Issued must be greater than 0');
      return;
    }

    // Check if date is in the future
    const recordDate = new Date(formData.record_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (recordDate > today) {
      setError('Record Date cannot be in the future');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(
        `/api/healthcards/statistics/${record.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            healthcard_type: formData.healthcard_type,
            record_date: formData.record_date,
            cards_issued: formData.cards_issued,
            barangay_id: formData.barangay_id || null,
            source: formData.source.trim() || null,
            notes: formData.notes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        onSuccess();
        handleClose();
      } else {
        setError(data.error || 'Failed to update record');
      }
    } catch (err) {
      console.error('Error updating record:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form to current record state
    if (record) {
      setFormData({
        healthcard_type: record.healthcard_type,
        record_date: record.record_date,
        cards_issued: record.cards_issued,
        barangay_id: record.barangay_id,
        source: record.source || '',
        notes: record.notes || '',
      });
    }
    setError('');
    onClose();
  };

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-200">
            <div>
              <h2 id="modal-title" className="text-xl font-bold text-gray-900">
                Edit HealthCard Record
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Update the historical record details
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Read-Only Information */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Record Information (Read-Only)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Created At</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(record.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Imported By</p>
                  <p className="text-sm font-medium text-gray-900">
                    {record.profiles
                      ? `${record.profiles.first_name} ${record.profiles.last_name}`
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-2 gap-4">
              {/* HealthCard Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HealthCard Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={formData.healthcard_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        healthcard_type: e.target.value as 'food_handler' | 'non_food' | 'pink',
                      })
                    }
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select Type</option>
                    <option value="food_handler">Yellow Card - General</option>
                    <option value="non_food">Green Card - General</option>
                    <option value="pink">Pink Card - Service/Clinical</option>
                  </select>
                </div>
              </div>

              {/* Record Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Record Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={formData.record_date}
                    onChange={(e) =>
                      setFormData({ ...formData, record_date: e.target.value })
                    }
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Cards Issued */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cards Issued <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.cards_issued}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cards_issued: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                required
                min="1"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be a positive number
              </p>
            </div>

            {/* Barangay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barangay (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.barangay_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      barangay_id: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  disabled={isSubmitting}
                >
                  <option value="">System-wide (No specific barangay)</option>
                  {barangays.map((barangay) => (
                    <option key={barangay.id} value={barangay.id}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Leave blank for system-wide data
              </p>
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source (Optional)
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) =>
                  setFormData({ ...formData, source: e.target.value })
                }
                placeholder="e.g., CHO Manual Count, DOH Bulletin"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                maxLength={255}
                disabled={isSubmitting}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional information about this record..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal resize-none"
                maxLength={500}
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.notes.length}/500 characters
              </p>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
