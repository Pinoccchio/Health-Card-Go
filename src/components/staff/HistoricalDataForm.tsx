'use client';

import { useState } from 'react';
import { X, Calendar, Database, MapPin, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface HistoricalDataFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barangays: Array<{ id: number; name: string }>;
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

export function HistoricalDataForm({
  isOpen,
  onClose,
  onSuccess,
  barangays,
}: HistoricalDataFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    disease_type: 'dengue',
    custom_disease_name: '',
    record_date: format(new Date(), 'yyyy-MM-dd'),
    case_count: '',
    barangay_id: '',
    source: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/diseases/historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disease_type: formData.disease_type,
          custom_disease_name: formData.disease_type === 'other' ? formData.custom_disease_name : undefined,
          record_date: formData.record_date,
          case_count: parseInt(formData.case_count),
          barangay_id: formData.barangay_id ? parseInt(formData.barangay_id) : undefined,
          source: formData.source || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setFormData({
          disease_type: 'dengue',
          custom_disease_name: '',
          record_date: format(new Date(), 'yyyy-MM-dd'),
          case_count: '',
          barangay_id: '',
          source: '',
          notes: '',
        });
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to create historical record');
      }
    } catch (err) {
      console.error('Error creating historical record:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      disease_type: 'dengue',
      custom_disease_name: '',
      record_date: format(new Date(), 'yyyy-MM-dd'),
      case_count: '',
      barangay_id: '',
      source: '',
      notes: '',
    });
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">

        {/* Modal */}
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div>
              <h2 id="modal-title" className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-teal" />
                Import Historical Disease Data
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Add aggregate disease statistics from historical records
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Disease Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disease Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.disease_type}
                onChange={(e) => setFormData({ ...formData, disease_type: e.target.value, custom_disease_name: '' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                required
              >
                {DISEASE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Disease Name */}
            {formData.disease_type === 'other' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Disease Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.custom_disease_name}
                  onChange={(e) => setFormData({ ...formData, custom_disease_name: e.target.value })}
                  placeholder="Enter disease name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  required={formData.disease_type === 'other'}
                  maxLength={100}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Record Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Record Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.record_date}
                  onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Select a past date or today. Future dates are not allowed.</p>
              </div>

              {/* Case Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Cases <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.case_count}
                  onChange={(e) => setFormData({ ...formData, case_count: e.target.value })}
                  placeholder="e.g., 150"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Must be greater than 0</p>
              </div>
            </div>

            {/* Barangay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Barangay (Optional)
              </label>
              <select
                value={formData.barangay_id}
                onChange={(e) => setFormData({ ...formData, barangay_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
              >
                <option value="">All Barangays (City-wide)</option>
                {barangays.map(barangay => (
                  <option key={barangay.id} value={barangay.id}>
                    {barangay.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Leave blank for city-wide statistics
              </p>
            </div>

            {/* Data Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Data Source (Optional)
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g., DOH Bulletin 2020, CHO Records"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-gray-500">
                Where did this data come from?
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional context or information..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                maxLength={500}
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Importing...' : 'Import Historical Data'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
