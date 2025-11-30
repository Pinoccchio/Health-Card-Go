'use client';

import { useState, useEffect, useMemo } from 'react';
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
  ListChecks,
  CheckCircle,
  Clock,
  Stethoscope,
  Shield,
} from 'lucide-react';
import { Announcement, AnnouncementFormData, TargetAudience } from '@/types';

export default function HealthcareAdminAnnouncementsPage() {
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

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null);

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
    const forAdmins = announcements.filter(a => a.target_audience === 'healthcare_admin').length;
    const forDoctors = announcements.filter(a => a.target_audience === 'doctor').length;

    return { total, active, inactive, forAll, forPatients, forAdmins, forDoctors };
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

  // Handle delete
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

  // Handle toggle active status
  const handleToggleActive = async (announcement: Announcement) => {
    try {
      setActionLoading(true);

      const response = await fetch(`/api/announcements/${announcement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !announcement.is_active }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update announcement');
      }

      setSuccessMessage(
        `Announcement ${announcement.is_active ? 'deactivated' : 'activated'} successfully`
      );

      fetchAnnouncements();
    } catch (err) {
      console.error('Error toggling announcement:', err);
      setErrorMessage(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  // Table columns
  const columns = [
    {
      key: 'title',
      label: 'Announcement',
      sortable: true,
      render: (announcement: Announcement) => {
        if (!announcement) return null;
        return (
          <div className="max-w-md">
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {announcement.title}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {announcement.content.substring(0, 80)}
              {announcement.content.length > 80 && '...'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'target_audience',
      label: 'Target Audience',
      sortable: true,
      render: (announcement: Announcement) => {
        if (!announcement) return null;

        const audienceConfig = {
          all: { label: 'All Users', color: 'purple', icon: Users },
          patients: { label: 'Patients', color: 'blue', icon: UserCheck },
          healthcare_admin: { label: 'Healthcare Admins', color: 'green', icon: Shield },
          doctor: { label: 'Doctors', color: 'orange', icon: Stethoscope },
        };

        const config = audienceConfig[announcement.target_audience];
        const Icon = config.icon;

        const colorClasses = {
          purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
          blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        };

        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${colorClasses[config.color as keyof typeof colorClasses]}`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (announcement: Announcement) => {
        if (!announcement) return null;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
            announcement.is_active
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {announcement.is_active ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {announcement.is_active ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (announcement: Announcement) => {
        if (!announcement) return null;

        const date = new Date(announcement.created_at);
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        let timeAgo = '';
        if (diffInDays === 0) {
          timeAgo = 'Today';
        } else if (diffInDays === 1) {
          timeAgo = 'Yesterday';
        } else if (diffInDays < 7) {
          timeAgo = `${diffInDays} days ago`;
        } else {
          timeAgo = date.toLocaleDateString();
        }

        return (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {timeAgo}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (announcement: Announcement) => {
        if (!announcement) return null;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleView(announcement)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="View"
            >
              <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => handleEdit(announcement)}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
            <button
              onClick={() => handleToggleActive(announcement)}
              className={`p-1 rounded transition-colors ${
                announcement.is_active
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'hover:bg-green-100 dark:hover:bg-green-900'
              }`}
              title={announcement.is_active ? 'Deactivate' : 'Activate'}
            >
              {announcement.is_active ? (
                <ToggleRight className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => handleDeleteClick(announcement)}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Announcements"
      pageDescription="Manage announcements and communications"
    >
      <Container size="full">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <Activity className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#20C997]"></div>
            <p className="mt-2 text-sm text-gray-500">Loading announcements...</p>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <ListChecks className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.active}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-400">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Inactive</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.inactive}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-400 rounded-xl flex items-center justify-center shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">For Patients</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.forPatients}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">For Admins</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.forAdmins}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard variant="flat" className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">For Doctors</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.forDoctors}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Stethoscope className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>
            </div>

            {/* Quick Status Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'all', label: 'All Announcements', count: statistics.total, color: 'teal', icon: ListChecks },
                { id: 'active', label: 'Active', count: statistics.active, color: 'green', icon: CheckCircle },
                { id: 'inactive', label: 'Inactive', count: statistics.inactive, color: 'gray', icon: Clock },
              ].map((statusFilter) => {
                const Icon = statusFilter.icon;
                const isActive = filter === statusFilter.id;
                const colorClasses = {
                  teal: { bg: 'bg-teal-100 hover:bg-teal-200', text: 'text-teal-700', ring: 'ring-teal-500', activeBg: 'bg-teal-200' },
                  green: { bg: 'bg-green-100 hover:bg-green-200', text: 'text-green-700', ring: 'ring-green-500', activeBg: 'bg-green-200' },
                  gray: { bg: 'bg-gray-100 hover:bg-gray-200', text: 'text-gray-700', ring: 'ring-gray-400', activeBg: 'bg-gray-200' },
                };
                const colors = colorClasses[statusFilter.color as keyof typeof colorClasses];

                return (
                  <button
                    key={statusFilter.id}
                    onClick={() => setFilter(statusFilter.id as typeof filter)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all
                      ${isActive ? `${colors.activeBg} ${colors.text} ring-2 ${colors.ring} shadow-md` : `${colors.bg} ${colors.text}`}
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{statusFilter.label}</span>
                    <span className={`
                      ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                      ${isActive ? 'bg-white/80' : 'bg-white/60'}
                    `}>
                      {statusFilter.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 bg-[#20C997] text-white text-sm font-medium rounded-md hover:bg-[#1AA179] transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </button>
            </div>

            {/* Announcements Table */}
            <div className="mt-6">
              <EnhancedTable
                columns={columns}
                data={filteredAnnouncements}
                searchable
                searchPlaceholder="Search by title or content..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                paginated={false}
                loading={loading}
                emptyMessage="No announcements found"
              />
            </div>
          </>
        )}

        {/* Announcement Drawer */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title={
            drawerMode === 'create'
              ? 'Create Announcement'
              : drawerMode === 'edit'
              ? 'Edit Announcement'
              : 'Announcement Details'
          }
          subtitle={
            selectedAnnouncement && drawerMode !== 'create'
              ? `Target: ${
                  selectedAnnouncement.target_audience === 'all'
                    ? 'All Users'
                    : selectedAnnouncement.target_audience === 'patients'
                    ? 'Patients'
                    : selectedAnnouncement.target_audience === 'healthcare_admin'
                    ? 'Healthcare Admins'
                    : 'Doctors'
                }`
              : undefined
          }
          metadata={
            selectedAnnouncement && drawerMode !== 'create'
              ? {
                  createdOn: new Date(selectedAnnouncement.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }),
                  doctor: selectedAnnouncement.profiles
                    ? `By: ${selectedAnnouncement.profiles.first_name} ${selectedAnnouncement.profiles.last_name}`
                    : 'Unknown Author',
                }
              : undefined
          }
          size="xl"
        >
          <div className="p-6">
            <div className="space-y-8">

            {/* Form Fields */}
            {drawerMode !== 'view' ? (
              <>
                {/* Form Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Announcement Details
                  </h3>

                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-teal focus:border-primary-teal ${
                          formErrors.title ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter announcement title"
                        maxLength={200}
                      />
                      {formErrors.title && (
                        <p className="mt-1 text-xs text-red-600">{formErrors.title}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.title.length}/200 characters
                      </p>
                    </div>

                    {/* Content */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Content
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <textarea
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows={6}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-primary-teal focus:border-primary-teal ${
                          formErrors.content ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter announcement content"
                        maxLength={1000}
                      />
                      {formErrors.content && (
                        <p className="mt-1 text-xs text-red-600">{formErrors.content}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {formData.content.length}/1000 characters
                      </p>
                    </div>

                    {/* Target Audience */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target Audience
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        value={formData.target_audience}
                        onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as TargetAudience })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-primary-teal focus:border-primary-teal"
                      >
                        <option value="all">All Users</option>
                        <option value="patients">Patients Only</option>
                        <option value="healthcare_admin">Healthcare Admins Only</option>
                        <option value="doctor">Doctors Only</option>
                      </select>
                    </div>

                    {/* Active Status */}
                    <div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="is_active"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="w-4 h-4 text-primary-teal border-gray-300 rounded focus:ring-primary-teal"
                        />
                        <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                          Active (announcement will be visible to target audience)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* View Mode */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Announcement Details
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        {selectedAnnouncement?.title}
                      </h4>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedAnnouncement?.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedAnnouncement?.is_active ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {selectedAnnouncement?.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Content</p>
                      <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {selectedAnnouncement?.content}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-700">
                        <strong className="font-semibold">Target Audience:</strong>{' '}
                        {selectedAnnouncement?.target_audience === 'all' && 'All Users'}
                        {selectedAnnouncement?.target_audience === 'patients' && 'Patients'}
                        {selectedAnnouncement?.target_audience === 'healthcare_admin' && 'Healthcare Admins'}
                        {selectedAnnouncement?.target_audience === 'doctor' && 'Doctors'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              {drawerMode === 'view' ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setDrawerMode('edit')}
                  >
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsDrawerOpen(false)}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Saving...' : (drawerMode === 'create' ? 'Create' : 'Update')}
                  </Button>
                </>
              )}
            </div>
            </div>
          </div>
        </Drawer>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            setShowDeleteDialog(false);
            setPendingDelete(null);
          }}
          onConfirm={handleDelete}
          title="Delete Announcement"
          message={`Are you sure you want to delete "${pendingDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
          loading={actionLoading}
        />
      </Container>
    </DashboardLayout>
  );
}
