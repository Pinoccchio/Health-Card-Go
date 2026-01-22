'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RefreshCw } from 'lucide-react';
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

interface CreateHealthcareAdminFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateHealthcareAdminForm({ isOpen, onClose, onSuccess }: CreateHealthcareAdminFormProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    contact_number: '',
    assigned_service_id: '',
    admin_category: '', // Auto-derived from service category
  });

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  // Get selected service object for dynamic permissions
  const selectedService: ServiceProperties | null = formData.assigned_service_id
    ? services.find(s => s.id === parseInt(formData.assigned_service_id)) || null
    : null;

  // Auto-derive admin_category from selected service
  useEffect(() => {
    if (selectedService) {
      // Admin category matches service category directly (they use the same enum)
      // This ensures any new service categories automatically work without manual mapping updates
      setFormData(prev => ({ ...prev, admin_category: selectedService.category }));
    } else {
      // Reset admin_category if no service selected
      setFormData(prev => ({ ...prev, admin_category: '' }));
    }
  }, [selectedService]);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);

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

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
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
      const res = await fetch('/api/admin/healthcare-admins/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assigned_service_id: formData.assigned_service_id ? parseInt(formData.assigned_service_id) : null,
          admin_category: formData.admin_category || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Healthcare Admin created successfully!');
        onSuccess();
        handleClose();
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          toast.error(data.error || 'Failed to create Healthcare Admin');
        }
      }
    } catch (error) {
      console.error('Error creating Healthcare Admin:', error);
      toast.error('Error creating Healthcare Admin');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      contact_number: '',
      assigned_service_id: '',
      admin_category: '',
    });
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
                Create Healthcare Admin
              </h2>
              <p className="text-sm text-gray-600 mt-1">Service-Specific Administrator</p>
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

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="maria@cho.gov.ph"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent pr-10 ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Minimum 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generate
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
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
            </div>

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
                disabled={loading || loadingServices}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Healthcare Admin'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
