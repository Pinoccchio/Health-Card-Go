'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Megaphone, ChevronRight, Clock } from 'lucide-react';
import { Announcement } from '@/types';

interface AnnouncementsWidgetProps {
  limit?: number;
  showViewAll?: boolean;
  targetAudience?: 'patients' | 'healthcare_admin' | 'all';
  viewAllLink?: string;
}

export function AnnouncementsWidget({
  limit = 5,
  showViewAll = false,
  targetAudience = 'patients',
  viewAllLink
}: AnnouncementsWidgetProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, [limit, targetAudience]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        target_audience: targetAudience,
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
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-teal/10 rounded-lg">
            <Megaphone className="w-5 h-5 text-primary-teal" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Announcements
          </h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-teal/10 rounded-lg">
            <Megaphone className="w-5 h-5 text-primary-teal" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Announcements
          </h2>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-teal/10 rounded-lg">
            <Megaphone className="w-5 h-5 text-primary-teal" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Announcements
          </h2>
        </div>
        <p className="text-sm text-gray-500 text-center py-4">
          No announcements at this time
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-teal/10 rounded-lg">
            <Megaphone className="w-5 h-5 text-primary-teal" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Announcements
          </h2>
        </div>
        {showViewAll && announcements.length > 0 && viewAllLink && (
          <Link
            href={viewAllLink}
            className="text-sm text-primary-teal hover:underline flex items-center gap-1"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Announcements List with Scroll */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className="border border-gray-200 bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {/* Title and Date */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-gray-900 text-sm">
                {announcement.title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                <Clock className="w-3 h-3" />
                <span>{formatDate(announcement.created_at)}</span>
              </div>
            </div>

            {/* Content */}
            <p className="text-sm text-gray-600 line-clamp-2">
              {announcement.content}
            </p>

            {/* Author (if available) */}
            {announcement.profiles && (
              <p className="text-xs text-gray-500 mt-2">
                — {announcement.profiles.first_name} {announcement.profiles.last_name}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
