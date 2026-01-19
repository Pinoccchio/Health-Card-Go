'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Megaphone, Clock, Users, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { Announcement } from '@/types';

export default function SuperAdminAnnouncementsViewPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch announcements targeted to super_admin or all
      const params = new URLSearchParams({
        target_audience: 'super_admin',
        limit: '1000',
      });

      const response = await fetch(`/api/announcements?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch announcements');
      }

      setAnnouncements(result.data || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
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
      case 'super_admin':
        return Shield;
      default:
        return Megaphone;
    }
  };

  return (
    <DashboardLayout
      roleId={user?.role_id || 1}
      pageTitle="Announcements"
      pageDescription="View announcements and updates"
    >
      <Container size="full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-teal/10 rounded-lg">
              <Megaphone className="w-6 h-6 text-primary-teal" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
              <p className="text-sm text-gray-600">Stay updated with important information</p>
            </div>
          </div>
          <button
            onClick={fetchAnnouncements}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <RefreshCw className="w-12 h-12 text-primary-teal animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading announcements...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Announcements</h3>
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={fetchAnnouncements}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Announcements</h3>
            <p className="text-gray-600">There are no announcements at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const AudienceIcon = getAudienceIcon(announcement.target_audience);

              return (
                <div
                  key={announcement.id}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Header with title and metadata */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-semibold text-gray-900">
                            {announcement.title}
                          </h2>
                          {announcement.is_new && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDate(announcement.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AudienceIcon className="w-4 h-4" />
                            <span>{getAudienceLabel(announcement.target_audience)}</span>
                          </div>
                          {announcement.profiles && (
                            <span className="text-gray-500">
                              By {announcement.profiles.first_name} {announcement.profiles.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Info */}
        {!loading && !error && announcements.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Showing {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</strong> targeted to super administrators.
            </p>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
