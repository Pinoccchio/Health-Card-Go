'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';
import ServicePermissionsBox from './ServicePermissionsBox';
import type { ServiceProperties } from '@/lib/utils/permissionHelpers';

interface Service {
  id: number;
  name: string;
  description?: string;
  duration_minutes?: number;
  category: 'healthcard' | 'hiv' | 'pregnancy' | 'laboratory' | 'immunization' | 'general';
  requires_appointment: boolean;
  requires_medical_record: boolean;
}

interface EditHealthcareAdminFormProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditHealthcareAdminForm({ userId, isOpen, onClose, onSuccess }: EditHealthcareAdminFormProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    assigned_service_id: '',
    status: 'active',
  });

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  // Get selected service object for dynamic permissions
  const selectedService: ServiceProperties | null = formData.assigned_service_id
    ? services.find(s => s.id === parseInt(formData.assigned_service_id)) || null
    : null;

  // Fetch existing user data and services
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
      fetchServices();
    }
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/admin/healthcare-admins/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const user = data.data;
        setFormData({
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          contact_number: user.contact_number || '',
          assigned_service_id: user.assigned_service?.id?.toString() || '',
          status: user.status || 'active',
        });
      } else {
        toast.error('Failed to load user data');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Error loading user data');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchServices = async () => {
    setLoadingServices(true);
    try {
      const res = await fetch('/api/services?is_active=true');
      const data = await res.json();

      if (res.ok && data.success) {
        setServices(data.data);
      } else {
        console.error('Failed to fetch services');
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    // Service assignment is now optional - no validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/healthcare-admins/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          contact_number: formData.contact_number,
          assigned_service_id: formData.assigned_service_id ? parseInt(formData.assigned_service_id) : null,
          status: formData.status,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Healthcare Admin updated successfully!');
        onSuccess();
        handleClose();
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          toast.error(data.error || 'Failed to update Healthcare Admin');
        }
      }
    } catch (error) {
      console.error('Error updating Healthcare Admin:', error);
      toast.error('Error updating Healthcare Admin');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Healthcare Admin
              </h2>
              <p className="text-sm text-gray-600 mt-1">Update service administrator details</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="max-h-[calc(90vh-80px)] overflow-y-auto px-6 py-4">
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <span className="ml-3 text-gray-600">Loading...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Personal Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                          errors.first_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Maria"
                      />
                      {errors.first_name && (
                        <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                          errors.last_name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Santos"
                      />
                      {errors.last_name && (
                        <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Contact Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="09123456789"
                  />
                </div>

                {/* Service Assignment */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Service Assignment</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Service
                    </label>
                    {loadingServices ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-500">
                        Loading services...
                      </div>
                    ) : (
                      <select
                        value={formData.assigned_service_id || ''}
                        onChange={(e) => setFormData({ ...formData, assigned_service_id: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                          errors.assigned_service_id ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">None (Unassigned)</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors.assigned_service_id && (
                      <p className="text-xs text-red-500 mt-1">{errors.assigned_service_id}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Select "None" if not yet assigned to a specific service. Unassigned admins cannot access appointments or patients.
                    </p>
                  </div>
                </div>

                {/* Dynamic Permissions Box */}
                <ServicePermissionsBox service={selectedService} />

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || loadingData || loadingServices}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Healthcare Admin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
