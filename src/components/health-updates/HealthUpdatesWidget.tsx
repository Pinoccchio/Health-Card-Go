'use client';

import { useEffect, useState } from 'react';
import { Bell, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription';

interface Announcement {
  id: string;
  title: string;
  content: string;
  target_audience: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface HealthUpdatesWidgetProps {
  userId?: string;
  userRole?: string;
  maxUpdates?: number;
}

export default function HealthUpdatesWidget({
  userId,
  userRole = 'patient',
  maxUpdates = 5,
}: HealthUpdatesWidgetProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Subscribe to new announcements via Realtime
  const { isSubscribed } = useRealtimeSubscription({
    table: 'announcements',
    event: 'INSERT',
    enabled: true,
    onInsert: (payload) => {
      const newAnnouncement = payload.new as Announcement;

      // Check if announcement is relevant for user's role
      if (
        newAnnouncement.is_active &&
        (newAnnouncement.target_audience === 'all' ||
          newAnnouncement.target_audience === userRole)
      ) {
        setAnnouncements((prev) => [newAnnouncement, ...prev].slice(0, maxUpdates));

        // Optionally show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newAnnouncement.title, {
            body: newAnnouncement.content.substring(0, 100),
            icon: '/logo.png',
            tag: newAnnouncement.id,
          });
        }
      }
    },
    onUpdate: (payload) => {
      const updatedAnnouncement = payload.new as Announcement;
      setAnnouncements((prev) =>
        prev.map((ann) =>
          ann.id === updatedAnnouncement.id ? updatedAnnouncement : ann
        )
      );
    },
    onDelete: (payload) => {
      const deletedId = payload.old.id;
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== deletedId));
    },
  });

  useEffect(() => {
    loadAnnouncements();

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [userRole]);

  const loadAnnouncements = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('target_audience', userRole);
      params.append('limit', maxUpdates.toString());

      const response = await fetch(`/api/announcements?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setAnnouncements(result.data || []);
      } else {
        setError(result.error || 'Failed to load health updates');
      }
    } catch (err) {
      console.error('Error loading announcements:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const dismissAnnouncement = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const visibleAnnouncements = announcements.filter(
    (ann) => !dismissedIds.has(ann.id) && ann.is_active
  );

  if (loading && visibleAnnouncements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-primary-teal" />
          <h3 className="font-semibold text-gray-900">Health Updates</h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (visibleAnnouncements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-primary-teal" />
          <h3 className="font-semibold text-gray-900">Health Updates</h3>
          {isSubscribed && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live
            </span>
          )}
        </div>
        <div className="text-center py-4">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No new health updates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-teal" />
            <h3 className="font-semibold text-gray-900">Health Updates</h3>
          </div>
          {isSubscribed && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live
            </span>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="divide-y divide-gray-100">
        {visibleAnnouncements.map((announcement) => {
          const isNew =
            new Date(announcement.created_at).getTime() >
            Date.now() - 24 * 60 * 60 * 1000; // Within last 24 hours

          return (
            <div
              key={announcement.id}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                isNew ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <Info className="w-5 h-5 text-primary-teal mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm">
                        {announcement.title}
                      </h4>
                      {isNew && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismissAnnouncement(announcement.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
