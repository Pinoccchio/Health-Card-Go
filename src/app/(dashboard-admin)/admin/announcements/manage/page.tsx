'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog, Button } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import {
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Users,
  UserCheck,
  Activity,
  Shield,
  Stethoscope,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

// Types
interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: TargetAudience;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

type TargetAudience = 'all' | 'patients' | 'healthcare_admin' | 'super_admin' | 'staff';

interface AnnouncementFormData {
  title: string;
  content: string;
  target_audience: TargetAudience;
  is_active: boolean;
}

export default function AdminAnnouncementsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | TargetAudience>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    content: '',
    target_audience: 'all',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        limit: '1000',
        include_inactive: 'true', // Super Admin sees all announcements
      });

      const response = await fetch(`/api/announcements?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch announcements');
      }

      setAnnouncements(result.data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const statistics = useMemo(() => {
    const total = announcements.length;
    const active = announcements.filter(a => a.is_active).length;
    const inactive = announcements.filter(a => !a.is_active).length;
    const forAll = announcements.filter(a => a.target_audience === 'all').length;
    const forPatients = announcements.filter(a => a.target_audience === 'patients').length;
    const forAdmins = announcements.filter(a => a.target_audience === 'healthcare_admin').length;
    const forSuperAdmins = announcements.filter(a => a.target_audience === 'super_admin').length;
    const forStaff = announcements.filter(a => a.target_audience === 'staff').length;

    return { total, active, inactive, forAll, forPatients, forAdmins, forSuperAdmins, forStaff };
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements;

    if (filter === 'active') {
      filtered = filtered.filter(a => a.is_active);
    } else if (filter === 'inactive') {
      filtered = filtered.filter(a => !a.is_active);
    }

    if (audienceFilter !== 'all') {
      filtered = filtered.filter(a => a.target_audience === audienceFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [announcements, filter, audienceFilter, searchQuery]);

  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      target_audience: 'all',
      is_active: true,
    });
    setFormErrors({});
    setDrawerMode('create');
    setIsDrawerOpen(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target_audience: announcement.target_audience,
      is_active: announcement.is_active,
    });
    setFormErrors({});
    setDrawerMode('edit');
    setIsDrawerOpen(true);
  };

  const handleView = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      target_audience: announcement.target_audience,
      is_active: announcement.is_active,
    });
    setDrawerMode('view');
    setIsDrawerOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      errors.title = 'Title must be 200 characters or less';
    }

    if (!formData.content.trim()) {
      errors.content = 'Content is required';
    } else if (formData.content.length > 1000) {
      errors.content = 'Content must be 1000 characters or less';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setActionLoading(true);

      const url = selectedAnnouncement
        ? `/api/announcements/${selectedAnnouncement.id}`
        : '/api/announcements';

      const method = selectedAnnouncement ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save announcement');
      }

      setSuccessMessage(
        selectedAnnouncement
          ? 'Announcement updated successfully'
          : 'Announcement created successfully'
      );

      setIsDrawerOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error saving announcement:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (announcement: Announcement) => {
    setPendingDelete(announcement);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/announcements/${pendingDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete announcement');
      }

      setSuccessMessage('Announcement deleted successfully');
      setShowDeleteDialog(false);
      setPendingDelete(null);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleClick = (announcement: Announcement) => {
    setPendingToggle(announcement);
    setShowToggleDialog(true);
  };

  const handleConfirmToggle = async () => {
    if (!pendingToggle) return;

    try {
      setActionLoading(true);

      const response = await fetch(`/api/announcements/${pendingToggle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !pendingToggle.is_active }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update announcement');
      }

      setSuccessMessage(
        `Announcement ${pendingToggle.is_active ? 'deactivated' : 'activated'} successfully`
      );

      setShowToggleDialog(false);
      setPendingToggle(null);
      fetchAnnouncements();
    } catch (err) {
      console.error('Error toggling announcement:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const getAudienceLabel = (targetAudience: string) => {
    switch (targetAudience) {
      case 'all':
        return 'All Users';
      case 'healthcare_admin':
        return 'Healthcare Admins';
      case 'super_admin':
        return 'Super Admins';
      case 'patients':
        return 'Patients';
      case 'staff':
        return 'Staff';
      default:
        return targetAudience;
    }
  };

  const getAudienceIcon = (targetAudience: string) => {
    switch (targetAudience) {
      case 'all':
        return Users;
      case 'healthcare_admin':
        return Stethoscope;
      case 'super_admin':
        return Shield;
      case 'staff':
        return Activity;
      case 'patients':
        return UserCheck;
      default:
        return Megaphone;
    }
  };

  const columns = [
    {
      accessor: 'title',
      header: 'Announcement',
      sortable: true,
      render: (value: any, row: Announcement) => {
        if (!row) return null;
        return (
          <div className="max-w-md">
            <div className="font-medium text-gray-900">
              {row.title}
            </div>
            <div className="text-sm text-gray-600 truncate">
              {row.content.substring(0, 80)}
              {row.content.length > 80 && '...'}
            </div>
          </div>
        );
      },
    },
    {
      accessor: 'target_audience',
      header: 'Target Audience',
      sortable: true,
      render: (value: string) => {
        const Icon = getAudienceIcon(value);
        return (
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-900">{getAudienceLabel(value)}</span>
          </div>
        );
      },
    },
    {
      accessor: 'is_active',
      header: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      accessor: 'created_at',
      header: 'Created',
      sortable: true,
      render: (value: string) => {
        const date = new Date(value);
        return (
          <div className="text-sm text-gray-600">
            {date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        );
      },
    },
    {
      accessor: 'actions',
      header: 'Actions',
      sortable: false,
      render: (_: any, row: Announcement) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleView(row)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      roleId={user?.role_id || 1}
      pageTitle="Announcements (View Only)"
      pageDescription="View system-wide announcements (managed by Education Admin)"
    >
      <Container size="full">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-teal/10 rounded-lg">
              <Megaphone className="w-6 h-6 text-primary-teal" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Announcements (View Only)</h1>
              <p className="text-sm text-gray-600">View system-wide announcements (managed by Education Admin)</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>View Only:</strong> Only Education Admin (HEPA) can create and manage announcements
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <ProfessionalCard
            variant="flat"
            className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <Megaphone className="w-10 h-10 text-blue-500" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard
            variant="flat"
            className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.active}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard
            variant="flat"
            className="bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Inactive</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.inactive}</p>
              </div>
              <Clock className="w-10 h-10 text-gray-500" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard
            variant="flat"
            className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">For All Users</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.forAll}</p>
              </div>
              <Users className="w-10 h-10 text-purple-500" />
            </div>
          </ProfessionalCard>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Audience Filter */}
            <div>
              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              >
                <option value="all">All Audiences</option>
                <option value="all">All Users</option>
                <option value="patients">Patients</option>
                <option value="healthcare_admin">Healthcare Admins</option>
                <option value="super_admin">Super Admins</option>
                <option value="staff">Staff</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow">
          <EnhancedTable
            data={filteredAnnouncements}
            columns={columns}
            loading={loading}
            emptyMessage="No announcements found"
            searchable={false} // We handle search separately
            sortable
          />
        </div>

        {/* Drawer for Create/Edit/View */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title={
            drawerMode === 'create'
              ? 'Create Announcement'
              : drawerMode === 'edit'
              ? 'Edit Announcement'
              : 'View Announcement'
          }
        >
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={drawerMode === 'view'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent disabled:bg-gray-50"
                placeholder="Enter announcement title"
                maxLength={200}
              />
              {formErrors.title && (
                <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                disabled={drawerMode === 'view'}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent disabled:bg-gray-50"
                placeholder="Enter announcement content"
                maxLength={1000}
              />
              {formErrors.content && (
                <p className="mt-1 text-sm text-red-600">{formErrors.content}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {formData.content.length}/1000 characters
              </p>
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience *
              </label>
              <select
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as TargetAudience })}
                disabled={drawerMode === 'view'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent disabled:bg-gray-50"
              >
                <option value="all">All Users</option>
                <option value="patients">Patients Only</option>
                <option value="healthcare_admin">Healthcare Admins Only</option>
                <option value="super_admin">Super Admins Only</option>
                <option value="staff">Staff Only</option>
              </select>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Inactive announcements won't be visible to users
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                disabled={drawerMode === 'view'}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-teal focus:ring-offset-2 disabled:opacity-50 ${
                  formData.is_active ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.is_active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Actions */}
            {drawerMode !== 'view' && (
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1"
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : drawerMode === 'create' ? 'Create' : 'Save Changes'}
                </Button>
              </div>
            )}
          </div>
        </Drawer>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete Announcement"
          message={`Are you sure you want to delete "${pendingDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />

        {/* Toggle Status Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showToggleDialog}
          onClose={() => setShowToggleDialog(false)}
          onConfirm={handleConfirmToggle}
          title={`${pendingToggle?.is_active ? 'Deactivate' : 'Activate'} Announcement`}
          message={`Are you sure you want to ${pendingToggle?.is_active ? 'deactivate' : 'activate'} "${pendingToggle?.title}"?`}
          confirmText={pendingToggle?.is_active ? 'Deactivate' : 'Activate'}
          variant={pendingToggle?.is_active ? 'warning' : 'primary'}
        />
      </Container>
    </DashboardLayout>
  );
}
