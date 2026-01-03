'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Megaphone, Clock, Users, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Announcement } from '@/types';
import Link from 'next/link';

export default function StaffAnnouncementsPage() {
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

      // Fetch announcements targeted to staff or all
      const params = new URLSearchParams({
        target_audience: 'staff',
        limit: '1000',
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

  const getAudienceLabel = (targetAudience: string) => {
    switch (targetAudience) {
      case 'all':
        return 'All Users';
      case 'staff':
        return 'Staff';
      default:
        return targetAudience;
    }
  };

  return (
    <DashboardLayout
      roleId={5}
      pageTitle="Announcements"
      pageDescription="View announcements and important updates"
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
              <p className="text-sm text-gray-600">Stay updated with important information from the City Health Office</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/staff/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
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
            <p className="text-gray-600 mb-6">There are no announcements at this time. Check back later for updates.</p>
            <Link
              href="/staff/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal-dark transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
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
                            <Users className="w-4 h-4" />
                            <span>{getAudienceLabel(announcement.target_audience)}</span>
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
              <strong>Showing {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</strong> from the City Health Office.
              {' '}For questions or concerns, please contact the office during operating hours.
            </p>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
