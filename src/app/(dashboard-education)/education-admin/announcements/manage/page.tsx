'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog, Button, StatCard } from '@/components/ui';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import {
  Megaphone,
  Plus,
  Edit,
  Eye,
  ToggleLeft,
  ToggleRight,
  Users,
  UserCheck,
  Activity,
  ListChecks,
  CheckCircle,
  Clock,
  Shield,
  Briefcase,
  Heart,
  Baby,
  CreditCard,
} from 'lucide-react';
import { Announcement, AnnouncementFormData, TargetAudience } from '@/types';

export default function EducationAdminAnnouncementsManagePage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | TargetAudience>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit' | 'create'>('view');
  const [actionLoading, setActionLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Toggle/Deactivate confirmation state
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<Announcement | null>(null);

  // Form state
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

  // Clear messages after 5 seconds
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
        limit: '1000', // Get all for client-side filtering
        include_inactive: 'true', // Include inactive announcements for admin management
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

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = announcements.length;
    const active = announcements.filter(a => a.is_active).length;
    const inactive = announcements.filter(a => !a.is_active).length;
    const forAll = announcements.filter(a => a.target_audience === 'all').length;
    const forPatients = announcements.filter(a => a.target_audience === 'patients').length;
    const forHealthcareAdmins = announcements.filter(a => a.target_audience === 'healthcare_admin').length;
    const forSuperAdmins = announcements.filter(a => a.target_audience === 'super_admin').length;
    const forStaff = announcements.filter(a => a.target_audience === 'staff').length;
    const forEducationAdmins = announcements.filter(a => a.target_audience === 'education_admin').length;

    return { total, active, inactive, forAll, forPatients, forHealthcareAdmins, forSuperAdmins, forStaff, forEducationAdmins };
  }, [announcements]);

  // Filter announcements
  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements;

    // Status filter
    if (filter === 'active') {
      filtered = filtered.filter(a => a.is_active);
    } else if (filter === 'inactive') {
      filtered = filtered.filter(a => !a.is_active);
    }

    // Audience filter
    if (audienceFilter !== 'all') {
      filtered = filtered.filter(a => a.target_audience === audienceFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [announcements, filter, audienceFilter, searchQuery]);

  // Handle drawer open for create
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

  // Handle drawer open for edit
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

  // Handle drawer open for view
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

  // Validate form
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

  // Handle form submit
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

      // Prepare payload
      const payload: any = {
        title: formData.title,
        content: formData.content,
        target_audience: formData.target_audience,
        is_active: formData.is_active,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  // Handle toggle click - show confirmation dialog
  const handleToggleClick = (announcement: Announcement) => {
    setPendingToggle(announcement);
    setShowToggleDialog(true);
  };

  // Handle confirmed toggle active status
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
        throw new Error(result.error || 'Failed to toggle announcement status');
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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get audience label
  const getAudienceLabel = (targetAudience: string) => {
    switch (targetAudience) {
      case 'all':
        return 'All Users';
      case 'super_admin':
        return 'Super Admin';
      case 'healthcare_admin':
        return 'Healthcare Admins';
      case 'staff':
        return 'Staff';
      case 'education_admin':
        return 'Education Admin';
      case 'patients':
        return 'Patients';
      default:
        return targetAudience;
    }
  };

  // Get audience icon
  const getAudienceIcon = (targetAudience: string) => {
    switch (targetAudience) {
      case 'all':
        return <Users className="w-4 h-4" />;
      case 'super_admin':
        return <Shield className="w-4 h-4" />;
      case 'healthcare_admin':
        return <Briefcase className="w-4 h-4" />;
      case 'staff':
        return <UserCheck className="w-4 h-4" />;
      case 'education_admin':
        return <Megaphone className="w-4 h-4" />;
      case 'patients':
        return <Users className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout
      roleId={6}
      pageTitle="Manage Announcements"
      pageDescription="Create and manage announcements for the City Health Office (HEPA)"
    >
      <Container size="full">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <Activity className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-teal/10 rounded-lg">
              <Megaphone className="w-6 h-6 text-primary-teal" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Announcements</h1>
              <p className="text-sm text-gray-600">Create and manage announcements as HEPA (Health Education Promotion Assistant)</p>
            </div>
          </div>
          <Button onClick={handleCreate} variant="primary" icon={Plus}>
            Create Announcement
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Announcements"
            value={statistics.total}
            icon={Megaphone}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
          <StatCard
            title="Active"
            value={statistics.active}
            icon={CheckCircle}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
          />
          <StatCard
            title="Inactive"
            value={statistics.inactive}
            icon={Activity}
            iconBgColor="bg-gray-100"
            iconColor="text-gray-600"
          />
          <StatCard
            title="For All Users"
            value={statistics.forAll}
            icon={Users}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-teal focus:border-primary-teal"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Audience Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Audience Filter
              </label>
              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value as 'all' | TargetAudience)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-teal focus:border-primary-teal"
              >
                <option value="all">All Audiences</option>
                <option value="all">All Users</option>
                <option value="super_admin">Super Admin</option>
                <option value="healthcare_admin">Healthcare Admins</option>
                <option value="staff">Staff</option>
                <option value="education_admin">Education Admin</option>
                <option value="patients">Patients</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or content..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-teal focus:border-primary-teal"
              />
            </div>
          </div>
        </div>

        {/* Announcements Table */}
        <EnhancedTable
          columns={[
            {
              key: 'title',
              accessor: 'title',
              label: 'Title',
              sortable: true,
              render: (_: any, announcement: Announcement) => (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{announcement.title}</span>
                  {announcement.is_new && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                      NEW
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'target_audience',
              accessor: 'target_audience',
              label: 'Audience',
              sortable: true,
              render: (_: any, announcement: Announcement) => (
                <div className="flex items-center gap-2">
                  {getAudienceIcon(announcement.target_audience)}
                  <span className="text-sm text-gray-700">
                    {getAudienceLabel(announcement.target_audience, announcement.target_patient_type)}
                  </span>
                </div>
              ),
            },
            {
              key: 'is_active',
              accessor: 'is_active',
              label: 'Status',
              sortable: true,
              render: (_: any, announcement: Announcement) => (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    announcement.is_active
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-300'
                  }`}
                >
                  {announcement.is_active ? 'Active' : 'Inactive'}
                </span>
              ),
            },
            {
              key: 'created_at',
              accessor: 'created_at',
              label: 'Created',
              sortable: true,
              render: (_: any, announcement: Announcement) => (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(announcement.created_at)}</span>
                </div>
              ),
            },
            {
              key: 'actions',
              accessor: 'id',
              label: 'Actions',
              render: (_: any, announcement: Announcement) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(announcement)}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleClick(announcement)}
                    className={`p-1.5 rounded transition-colors ${
                      announcement.is_active
                        ? 'text-gray-600 hover:bg-gray-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={announcement.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {announcement.is_active ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ),
            },
          ]}
          data={filteredAnnouncements}
          loading={loading}
          emptyMessage="No announcements found"
        />

        {/* Note about deletion */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Only Super Admins can delete announcements. As HEPA, you can create, edit, and deactivate announcements.
          </p>
        </div>
      </Container>

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
        size="xl"
      >
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={drawerMode === 'view'}
              className={`w-full px-3 py-2 border rounded-md focus:ring-primary-teal focus:border-primary-teal ${
                formErrors.title ? 'border-red-500' : 'border-gray-300'
              } ${drawerMode === 'view' ? 'bg-gray-50' : ''}`}
              placeholder="Enter announcement title"
            />
            {formErrors.title && (
              <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{formData.title.length}/200 characters</p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              disabled={drawerMode === 'view'}
              rows={6}
              className={`w-full px-3 py-2 border rounded-md focus:ring-primary-teal focus:border-primary-teal ${
                formErrors.content ? 'border-red-500' : 'border-gray-300'
              } ${drawerMode === 'view' ? 'bg-gray-50' : ''}`}
              placeholder="Enter announcement content"
            />
            {formErrors.content && (
              <p className="mt-1 text-sm text-red-600">{formErrors.content}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{formData.content.length}/1000 characters</p>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Target Audience <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {/* All Users */}
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="target_audience"
                  value="all"
                  checked={formData.target_audience === 'all'}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as TargetAudience, target_patient_type: null })}
                  disabled={drawerMode === 'view'}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-gray-900">All Users</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Send to everyone in the system</p>
                </div>
              </label>

              {/* Super Admin Only */}
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="target_audience"
                  value="super_admin"
                  checked={formData.target_audience === 'super_admin'}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as TargetAudience, target_patient_type: null })}
                  disabled={drawerMode === 'view'}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-gray-900">Super Admin Only</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Send to Super Admin only</p>
                </div>
              </label>

              {/* Healthcare Admins */}
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="target_audience"
                  value="healthcare_admin"
                  checked={formData.target_audience === 'healthcare_admin'}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as TargetAudience, target_patient_type: null })}
                  disabled={drawerMode === 'view'}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">Healthcare Admins</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Send to all Healthcare Admins</p>
                </div>
              </label>

              {/* Staff */}
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="target_audience"
                  value="staff"
                  checked={formData.target_audience === 'staff'}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as TargetAudience, target_patient_type: null })}
                  disabled={drawerMode === 'view'}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    <span className="font-medium text-gray-900">Staff</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Send to disease surveillance staff</p>
                </div>
              </label>

              {/* All Patients */}
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="target_audience"
                  value="patients"
                  checked={formData.target_audience === 'patients'}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as TargetAudience })}
                  disabled={drawerMode === 'view'}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-gray-900">Patients</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Send to all patients</p>
                </div>
              </label>
            </div>
          </div>

          {/* Active Status */}
          {drawerMode !== 'view' && (
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-primary-teal focus:ring-primary-teal"
                />
                <span className="text-sm font-medium text-gray-700">Active (visible to recipients)</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button onClick={() => setIsDrawerOpen(false)} variant="secondary">
              {drawerMode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {drawerMode !== 'view' && (
              <Button
                onClick={handleSubmit}
                variant="primary"
                loading={actionLoading}
                disabled={actionLoading}
              >
                {drawerMode === 'create' ? 'Create Announcement' : 'Update Announcement'}
              </Button>
            )}
          </div>
        </div>
      </Drawer>

      {/* Toggle Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showToggleDialog}
        onClose={() => {
          setShowToggleDialog(false);
          setPendingToggle(null);
        }}
        onConfirm={handleConfirmToggle}
        title={pendingToggle?.is_active ? 'Deactivate Announcement' : 'Activate Announcement'}
        message={
          pendingToggle?.is_active
            ? `Are you sure you want to deactivate "${pendingToggle?.title}"? Recipients will no longer see this announcement.`
            : `Are you sure you want to activate "${pendingToggle?.title}"? Recipients will be able to see this announcement.`
        }
        confirmText={pendingToggle?.is_active ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        variant={pendingToggle?.is_active ? 'warning' : 'primary'}
        loading={actionLoading}
      />
    </DashboardLayout>
  );
}
