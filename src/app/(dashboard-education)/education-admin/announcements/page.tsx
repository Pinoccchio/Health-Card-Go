'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Megaphone, Clock, Users, AlertCircle, RefreshCw, ArrowLeft, Plus } from 'lucide-react';
import { Announcement } from '@/types';
import Link from 'next/link';

export default function EducationAdminAnnouncementsPage() {
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

      // Fetch announcements targeted to education_admin or all
      const params = new URLSearchParams({
        target_audience: 'education_admin',
        limit: '1000',
        include_inactive: 'true', // HEPA can see inactive announcements
      });

      const response = await fetch(`/api/announcements?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch announcements');
      }

      const fetchedAnnouncements = result.data || [];
      setAnnouncements(fetchedAnnouncements);

      // Mark all announcements as read (background operation)
      if (fetchedAnnouncements.length > 0) {
        markAnnouncementsAsRead(fetchedAnnouncements.map((a: Announcement) => a.id));
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const markAnnouncementsAsRead = async (announcementIds: string[]) => {
    // Mark announcements as read in the background (non-blocking)
    // This updates the user_announcement_reads table to clear the badge
    try {
      await Promise.allSettled(
        announcementIds.map((id) =>
          fetch(`/api/announcements/${id}/mark-read`, {
            method: 'POST',
          })
        )
      );
      console.log(`✅ Marked ${announcementIds.length} announcements as read`);
    } catch (error) {
      console.error('Error marking announcements as read:', error);
      // Silent failure - doesn't affect user experience
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

  const getAudienceLabel = (targetAudience: string, targetPatientType?: string | null) => {
    switch (targetAudience) {
      case 'all':
        return 'All Users';
      case 'education_admin':
        return 'Education Admin';
      case 'super_admin':
        return 'Super Admin';
      case 'healthcare_admin':
        return 'Healthcare Admins';
      case 'staff':
        return 'Staff';
      case 'patients':
        if (targetPatientType) {
          const patientTypeLabels: Record<string, string> = {
            healthcard: 'Health Card Patients',
            hiv: 'HIV Patients',
            prenatal: 'Prenatal Patients',
          };
          return patientTypeLabels[targetPatientType] || 'Patients';
        }
        return 'All Patients';
      default:
        return targetAudience;
    }
  };

  return (
    <DashboardLayout
      roleId={6}
      pageTitle="Announcements"
      pageDescription="View and manage announcements for the City Health Office"
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
              <p className="text-sm text-gray-600">View announcements sent to you and manage all announcements</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/education-admin/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <Link
              href="/education-admin/announcements/manage"
              className="flex items-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Manage Announcements
            </Link>
            <button
              onClick={fetchAnnouncements}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
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
            <p className="text-gray-600 mb-6">There are no announcements at this time.</p>
            <Link
              href="/education-admin/announcements/manage"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Announcement
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              return (
                <div
                  key={announcement.id}
                  className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${!announcement.is_active ? 'opacity-60 border-2 border-gray-300' : ''}`}
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
                          {!announcement.is_active && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDate(announcement.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{getAudienceLabel(announcement.target_audience, announcement.target_patient_type)}</span>
                          </div>
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
          <div className="mt-6 bg-teal-50 border border-teal-200 rounded-lg p-4">
            <p className="text-sm text-teal-800">
              <strong>Showing {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</strong> sent to you as Education Admin (HEPA).
              {' '}To manage all announcements, click "Manage Announcements" above.
            </p>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
