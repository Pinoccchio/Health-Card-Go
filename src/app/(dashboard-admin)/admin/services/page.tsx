'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, Button } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ServiceForm, ServiceFormData, ServiceCategory } from '@/components/admin/ServiceForm';
import { ServiceWithAdmins, formatRequirements } from '@/types/service';
import { RequirementsDisplay } from '@/components/admin/RequirementsDisplay';
import { Briefcase, Plus, Edit, Trash2, Search, Filter, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/contexts/ToastContext';

type Service = ServiceWithAdmins;

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const toast = useToast();

  const supabase = createClient();

  const fetchServices = async () => {
    try {
      setLoading(true);
      // Fetch only active services (Services 12, 16, 17)
      const response = await fetch('/api/admin/services?is_active=true');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch services');
      }

      setServices(result.data);
      setFilteredServices(result.data);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showCreateModal || editingService || deletingService) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCreateModal, editingService, deletingService]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showCreateModal) setShowCreateModal(false);
        if (editingService) setEditingService(null);
        if (deletingService) setDeletingService(null);
      }
    };

    if (showCreateModal || editingService || deletingService) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showCreateModal, editingService, deletingService]);

  // Filter services based on search and category
  useEffect(() => {
    let filtered = [...services];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(service => service.category === categoryFilter);
    }

    setFilteredServices(filtered);
  }, [searchTerm, categoryFilter, services]);

  const handleCreateService = async (data: ServiceFormData) => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create service');
      }

      toast.success('Service created successfully');
      setShowCreateModal(false);
      fetchServices();
    } catch (error: any) {
      console.error('Error creating service:', error);
      toast.error(error.message || 'Failed to create service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateService = async (data: ServiceFormData) => {
    if (!editingService) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/services/${editingService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update service');
      }

      toast.success('Service updated successfully');
      setEditingService(null);
      fetchServices();
    } catch (error: any) {
      console.error('Error updating service:', error);
      toast.error(error.message || 'Failed to update service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deletingService) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/admin/services/${deletingService.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete service');
      }

      toast.success('Service deleted successfully');
      setDeletingService(null);
      fetchServices();
    } catch (error: any) {
      console.error('Error deleting service:', error);
      toast.error(error.message || 'Failed to delete service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    try {
      const response = await fetch(`/api/admin/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !service.is_active }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update service status');
      }

      toast.success(`Service ${service.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchServices();
    } catch (error: any) {
      console.error('Error updating service status:', error);
      toast.error(error.message || 'Failed to update service status');
    }
  };

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, string> = {
      healthcard: 'bg-emerald-100 text-emerald-800',
      hiv: 'bg-purple-100 text-purple-800',
      pregnancy: 'bg-pink-100 text-pink-800',
      laboratory: 'bg-blue-100 text-blue-800',
      immunization: 'bg-indigo-100 text-indigo-800',
      general: 'bg-gray-100 text-gray-800',
    };
    return badges[category] || badges.general;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      healthcard: 'Health Card',
      hiv: 'HIV Services',
      pregnancy: 'Pregnancy',
      laboratory: 'Laboratory',
      immunization: 'Immunization',
      general: 'General',
    };
    return labels[category] || category;
  };

  // Statistics
  const stats = {
    total: services.length,
    active: services.filter(s => s.is_active).length,
    inactive: services.filter(s => !s.is_active).length,
    byCategory: services.reduce((acc, service) => {
      acc[service.category] = (acc[service.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  if (loading) {
    return (
      <DashboardLayout roleId={1} pageTitle="Services Management" pageDescription="Loading...">
        <Container size="full">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Services Management"
      pageDescription="Manage healthcare services and categories"
    >
      <Container size="full">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Services</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-500">{stats.inactive}</p>
              </div>
              <X className="w-8 h-8 text-gray-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byCategory).length}</p>
              </div>
              <Filter className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="healthcard">Health Card</option>
                <option value="hiv">HIV Services</option>
                <option value="pregnancy">Pregnancy</option>
                <option value="laboratory">Laboratory</option>
                <option value="immunization">Immunization</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Create Button */}
            <Button onClick={() => setShowCreateModal(true)} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Service
            </Button>
          </div>
        </div>

        {/* Services Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requirements
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Appointment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Admins
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || categoryFilter !== 'all' ? 'No services match your filters' : 'No services found'}
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{service.name}</div>
                          {service.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">{service.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadge(service.category)}`}>
                          {getCategoryLabel(service.category)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <RequirementsDisplay requirements={service.requirements || []} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {service.duration_minutes} min
                      </td>
                      <td className="px-6 py-4">
                        {service.requires_appointment ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Walk-in
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {service.admin_count > 0 ? (
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {service.admin_count} {service.admin_count === 1 ? 'Admin' : 'Admins'}
                            </span>
                            <div className="group relative">
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                                {service.assigned_admins?.map((admin, idx) => (
                                  <div key={admin.id} className={idx > 0 ? 'mt-1' : ''}>
                                    • {admin.name}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            No Admins
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleServiceStatus(service)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            service.is_active ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              service.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => setEditingService(service)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => setDeletingService(service)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[1002] overflow-y-auto">
            {/* Backdrop with blur */}
            <div
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
              onClick={() => setShowCreateModal(false)}
              aria-hidden="true"
            />

            {/* Centered modal */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Service</h2>
                  <ServiceForm
                    mode="create"
                    onSubmit={handleCreateService}
                    onCancel={() => setShowCreateModal(false)}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingService && (
          <div className="fixed inset-0 z-[1002] overflow-y-auto">
            {/* Backdrop with blur */}
            <div
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
              onClick={() => setEditingService(null)}
              aria-hidden="true"
            />

            {/* Centered modal */}
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Service</h2>
                  <ServiceForm
                    mode="edit"
                    initialData={{
                      ...editingService,
                      requirements: formatRequirements(editingService.requirements || []),
                    }}
                    onSubmit={handleUpdateService}
                    onCancel={() => setEditingService(null)}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmDialog
          isOpen={!!deletingService}
          onClose={() => setDeletingService(null)}
          onConfirm={handleDeleteService}
          title="Delete Service?"
          message={deletingService ? `Are you sure you want to delete "${deletingService.name}"? This action cannot be undone.` : ''}
          confirmText="Delete"
          variant="danger"
          isLoading={isSubmitting}
        />
      </Container>
    </DashboardLayout>
  );
}
