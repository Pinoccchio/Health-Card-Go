import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/lib/contexts/ToastContext';

export interface Notification {
  id: string;
  user_id: string;
  type: 'appointment_reminder' | 'cancellation' | 'feedback_request' | 'general';
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface UseNotificationsOptions {
  typeFilter?: string;
  unreadOnly?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { typeFilter, unreadOnly } = options;
  const toast = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (unreadOnly) params.append('unread', 'true');

      const response = await fetch(`/api/notifications?${params.toString()}`);
      if (!response.ok) {
        setError(`Failed to fetch notifications (${response.status})`);
        toast.error('Failed to fetch notifications');
        return;
      }
      const data = await response.json();

      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      } else {
        setError(data.error || 'Failed to fetch notifications');
        toast.error(data.error || 'Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('An unexpected error occurred');
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, unreadOnly, toast]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
      });
      if (!response.ok) {
        toast.error(`Failed to mark as read (${response.status})`);
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Update local state
        setNotifications(prevNotifications =>
          prevNotifications.map(notification =>
            notification.id === id
              ? { ...notification, read_at: data.data.read_at }
              : notification
          )
        );

        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        toast.error(data.error || 'Failed to mark as read');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast.error('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
      });
      if (!response.ok) {
        toast.error(`Failed to mark all as read (${response.status})`);
        return;
      }

      const data = await response.json();

      if (data.success) {
        // Update local state - mark all as read
        setNotifications(prevNotifications =>
          prevNotifications.map(notification => ({
            ...notification,
            read_at: notification.read_at || new Date().toISOString(),
          }))
        );

        setUnreadCount(0);
        toast.success(data.message || 'All notifications marked as read');
      } else {
        toast.error(data.error || 'Failed to mark all as read');
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast.error('Failed to mark all as read');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
