'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { RoleId } from '@/types/auth';
import { MenuItem } from '@/components/dashboard';
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription';

/**
 * Custom hook to manage sidebar badge updates with real-time support
 *
 * Features:
 * - Fetches initial unread count on mount
 * - Subscribes to Supabase Realtime for notification INSERT/UPDATE events
 * - Automatically increments badge when new notifications arrive
 * - Automatically decrements badge when notifications are marked as read
 * - Removes badge when count reaches 0
 * - Works across multiple browser tabs
 *
 * @param roleId - User's role ID (only works for patients: roleId === 4)
 * @param menuItems - Current menu items array
 * @param setMenuItems - Function to update menu items
 */
export function useSidebarBadgeUpdates(
  roleId: RoleId,
  menuItems: MenuItem[],
  setMenuItems: (items: MenuItem[]) => void
) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  // Fetch initial unread count on mount
  useEffect(() => {
    if (roleId !== 4 || !user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count');
        if (!response.ok) {
          console.error('Failed to fetch unread count:', response.status);
          return;
        }
        const data = await response.json();
        if (data.success) {
          console.log(`📬 Initial unread notifications: ${data.unreadCount}`);
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error('❌ Error fetching unread notifications count:', error);
      }
    };

    fetchUnreadCount();
  }, [roleId, user]);

  // Real-time subscription for notification INSERT events (new notifications)
  useRealtimeSubscription({
    table: 'notifications',
    event: 'INSERT',
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: roleId === 4 && !!user?.id,
    onInsert: (payload) => {
      console.log('🔔 New notification received, incrementing badge');
      setUnreadCount(prev => prev + 1);
    },
  });

  // Real-time subscription for notification UPDATE events (marked as read)
  useRealtimeSubscription({
    table: 'notifications',
    event: 'UPDATE',
    filter: user?.id ? `user_id=eq.${user.id}` : undefined,
    enabled: roleId === 4 && !!user?.id,
    onUpdate: (payload) => {
      // Check if notification was marked as read
      const wasUnread = !payload.old?.read_at;
      const isNowRead = !!payload.new?.read_at;

      if (wasUnread && isNowRead) {
        console.log('✅ Notification marked as read, decrementing badge');
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    },
  });

  // Update menu items when unread count changes
  useEffect(() => {
    if (roleId !== 4 || menuItems.length === 0) return;

    const updatedMenuItems = menuItems.map((item) => {
      if (item.href === '/patient/notifications') {
        return {
          ...item,
          badge: unreadCount > 0
            ? { count: unreadCount, variant: 'danger' as const }
            : undefined, // Remove badge when count is 0
        };
      }
      return item;
    });

    setMenuItems(updatedMenuItems);
  }, [unreadCount, menuItems.length, roleId]);
}
