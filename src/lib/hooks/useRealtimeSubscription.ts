'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
export type TableName = 'notifications' | 'appointments' | 'diseases' | 'announcements' | 'health_updates';

interface UseRealtimeSubscriptionOptions {
  table: TableName;
  event?: ChangeEvent;
  filter?: string; // e.g., "user_id=eq.123"
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
  enabled?: boolean;
}

/**
 * React hook for subscribing to Supabase Realtime database changes
 *
 * @example
 * ```tsx
 * // Subscribe to new notifications for current user
 * useRealtimeSubscription({
 *   table: 'notifications',
 *   event: 'INSERT',
 *   filter: `user_id=eq.${userId}`,
 *   onInsert: (payload) => {
 *     console.log('New notification:', payload.new);
 *     // Optionally show a toast notification
 *     toast.success('New notification received');
 *     // Refresh your notifications list
 *     refreshNotifications();
 *   }
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Subscribe to appointment updates
 * useRealtimeSubscription({
 *   table: 'appointments',
 *   event: 'UPDATE',
 *   filter: `patient_id=eq.${patientId}`,
 *   onUpdate: (payload) => {
 *     console.log('Appointment updated:', payload.new);
 *     if (payload.new.status === 'cancelled') {
 *       toast.warning('Your appointment has been cancelled');
 *     }
 *   }
 * });
 * ```
 */
export function useRealtimeSubscription(options: UseRealtimeSubscriptionOptions) {
  const {
    table,
    event = '*',
    filter,
    onInsert,
    onUpdate,
    onDelete,
    enabled = true,
  } = options;

  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Cleanup existing subscription if disabled
      if (channel) {
        channel.unsubscribe();
        setChannel(null);
        setIsSubscribed(false);
      }
      return;
    }

    const supabase = createClient();

    // Create unique channel name
    const channelName = `realtime:${table}:${filter || 'all'}:${Date.now()}`;

    // Set up the channel
    let realtimeChannel = supabase.channel(channelName);

    // Configure postgres changes subscription
    const config: any = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      config.filter = filter;
    }

    realtimeChannel = realtimeChannel.on(
      'postgres_changes',
      config,
      (payload: RealtimePostgresChangesPayload<any>) => {
        console.log(`Realtime ${payload.eventType} on ${table}:`, payload);

        try {
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(payload);
              break;
            case 'UPDATE':
              onUpdate?.(payload);
              break;
            case 'DELETE':
              onDelete?.(payload);
              break;
          }
        } catch (err) {
          console.error('Error handling realtime event:', err);
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      }
    );

    // Subscribe to the channel
    realtimeChannel.subscribe((status) => {
      console.log(`Realtime subscription status for ${table}:`, status);

      if (status === 'SUBSCRIBED') {
        setIsSubscribed(true);
        setError(null);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setError(new Error(`Subscription ${status.toLowerCase()}`));
        setIsSubscribed(false);
      }
    });

    setChannel(realtimeChannel);

    // Cleanup on unmount or when dependencies change
    return () => {
      console.log(`Unsubscribing from ${table}`);
      realtimeChannel.unsubscribe();
      setIsSubscribed(false);
    };
  }, [table, event, filter, enabled]);

  return {
    isSubscribed,
    error,
    channel,
  };
}

/**
 * Hook specifically for subscribing to new notifications
 */
export function useNotificationUpdates(userId: string | undefined, onNewNotification?: (notification: any) => void) {
  return useRealtimeSubscription({
    table: 'notifications',
    event: 'INSERT',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    onInsert: (payload) => {
      onNewNotification?.(payload.new);
    },
  });
}

/**
 * Hook specifically for subscribing to appointment updates
 */
export function useAppointmentUpdates(
  patientId: string | undefined,
  onAppointmentChange?: (appointment: any, eventType: string) => void
) {
  return useRealtimeSubscription({
    table: 'appointments',
    event: '*',
    filter: patientId ? `patient_id=eq.${patientId}` : undefined,
    enabled: !!patientId,
    onInsert: (payload) => onAppointmentChange?.(payload.new, 'INSERT'),
    onUpdate: (payload) => onAppointmentChange?.(payload.new, 'UPDATE'),
    onDelete: (payload) => onAppointmentChange?.(payload.old, 'DELETE'),
  });
}

/**
 * Hook specifically for subscribing to disease updates (for Super Admin/Healthcare Admin)
 */
export function useDiseaseUpdates(onDiseaseChange?: (disease: any, eventType: string) => void) {
  return useRealtimeSubscription({
    table: 'diseases',
    event: '*',
    onInsert: (payload) => onDiseaseChange?.(payload.new, 'INSERT'),
    onUpdate: (payload) => onDiseaseChange?.(payload.new, 'UPDATE'),
    onDelete: (payload) => onDiseaseChange?.(payload.old, 'DELETE'),
  });
}
