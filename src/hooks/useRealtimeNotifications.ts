import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/lib/contexts/ToastContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Notification {
  id: string;
  user_id: string;
  type: 'appointment_reminder' | 'approval' | 'cancellation' | 'feedback_request' | 'general';
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface UseRealtimeNotificationsOptions {
  typeFilter?: string;
  unreadOnly?: boolean;
  enableRealtime?: boolean;
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { typeFilter, unreadOnly, enableRealtime = true } = options;
  const toast = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (unreadOnly) params.append('unread', 'true');

      const response = await fetch(`/api/notifications?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.success) {
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

      const data = await response.json();

      if (response.ok && data.success) {
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

      const data = await response.json();

      if (response.ok && data.success) {
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

  // Set up Realtime subscription
  useEffect(() => {
    if (!enableRealtime) return;

    const setupRealtimeSubscription = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Create channel for user-specific notifications
        const channel = supabase
          .channel('notifications')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const newNotification = payload.new as Notification;

              // Add new notification to the list
              setNotifications(prev => [newNotification, ...prev]);

              // Increment unread count
              setUnreadCount(prev => prev + 1);

              // Show toast notification
              toast.info(newNotification.title, {
                description: newNotification.message,
              });

              // Optional: Play notification sound
              if (typeof Audio !== 'undefined') {
                const audio = new Audio('/sounds/notification.mp3');
                audio.volume = 0.5;
                audio.play().catch(err => console.error('Failed to play notification sound:', err));
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Realtime notifications subscribed');
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Realtime subscription error');
              toast.error('Failed to connect to real-time notifications');
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Error setting up realtime subscription:', err);
      }
    };

    setupRealtimeSubscription();

    // Cleanup: Unsubscribe on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enableRealtime, supabase, toast]);

  // Initial fetch
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
