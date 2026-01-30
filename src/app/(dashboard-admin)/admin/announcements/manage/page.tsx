'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import type { Announcement, TargetAudience } from '@/types';
import {
  Megaphone,
  Eye,
  Users,
  UserCheck,
  Activity,
  Shield,
  Stethoscope,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';

export default function AdminAnnouncementsManagePage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | TargetAudience>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

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
        include_inactive: 'true',
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

    return { total, active, inactive, forAll };
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

  const handleView = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDrawerOpen(true);
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
      case 'education_admin':
        return 'Education Admins';
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
      case 'education_admin':
        return GraduationCap;
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
        {/* Error Message */}
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
                <option value="patients">Patients</option>
                <option value="healthcare_admin">Healthcare Admins</option>
                <option value="super_admin">Super Admins</option>
                <option value="staff">Staff</option>
                <option value="education_admin">Education Admins</option>
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
            searchable={false}
            sortable
          />
        </div>

        {/* View Drawer */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="View Announcement"
        >
          {selectedAnnouncement && (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <div className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                  {selectedAnnouncement.title}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <div className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 whitespace-pre-wrap min-h-[120px]">
                  {selectedAnnouncement.content}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience
                </label>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg">
                  {(() => {
                    const Icon = getAudienceIcon(selectedAnnouncement.target_audience);
                    return <Icon className="w-4 h-4 text-gray-500" />;
                  })()}
                  <span className="text-gray-900">
                    {getAudienceLabel(selectedAnnouncement.target_audience)}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedAnnouncement.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {selectedAnnouncement.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Created By */}
              {selectedAnnouncement.profiles && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Created By
                  </label>
                  <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                    {selectedAnnouncement.profiles.first_name} {selectedAnnouncement.profiles.last_name}
                  </div>
                </div>
              )}

              {/* Created At */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created At
                </label>
                <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900">
                  {new Date(selectedAnnouncement.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          )}
        </Drawer>
      </Container>
    </DashboardLayout>
  );
}
