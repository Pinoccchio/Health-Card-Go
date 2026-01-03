'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription';

interface FeedbackContextType {
  pendingCount: number;
  refreshCount: () => Promise<void>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

/**
 * FeedbackProvider - Centralized feedback state management for Super Admins
 *
 * Features:
 * - Tracks count of pending feedback (feedback without admin_response)
 * - Real-time synchronization via Supabase Realtime
 * - Automatic updates when feedback is submitted or responded
 * - Badge updates instantly using real-time events
 *
 * Industry Pattern: Admin dashboard pending work tracking
 * - Used by: Zendesk (unresolved tickets), Intercom (unanswered messages), Shopify (pending reviews)
 * - Badge shows persistent backlog (different from notifications which can be dismissed)
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();

  // Fetch initial pending count on mount
  useEffect(() => {
    if (!user) return;

    const fetchInitialCount = async () => {
      try {
        const response = await fetch('/api/feedback/pending-count');
        const data = await response.json();
        if (data.success) {
          setPendingCount(data.pendingCount);
        }
      } catch (error) {
        // Silently fail - non-critical feature
      }
    };

    fetchInitialCount();
  }, [user]);

  // Real-time subscription for INSERT events (new feedback submitted)
  useRealtimeSubscription({
    table: 'feedback',
    event: 'INSERT',
    enabled: !!user?.id,
    onInsert: (payload) => {
      setPendingCount(prev => prev + 1);
    },
  });

  // Real-time subscription for UPDATE events (admin responds to feedback)
  useRealtimeSubscription({
    table: 'feedback',
    event: 'UPDATE',
    enabled: !!user?.id,
    onUpdate: (payload) => {
      // Check if admin_response was added (pending → responded)
      const wasPending = !payload.old?.admin_response;
      const isNowResponded = !!payload.new?.admin_response;

      if (wasPending && isNowResponded) {
        setPendingCount(prev => Math.max(0, prev - 1));
      }
    },
  });

  /**
   * Refresh pending count from server (fallback mechanism)
   */
  const refreshCount = useCallback(async () => {
    try {
      const response = await fetch('/api/feedback/pending-count');
      const data = await response.json();
      if (data.success) {
        setPendingCount(data.pendingCount);
      }
    } catch (error) {
      // Silently fail - non-critical feature
    }
  }, []);

  return (
    <FeedbackContext.Provider
      value={{
        pendingCount,
        refreshCount,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

/**
 * Hook to access feedback context
 *
 * @throws Error if used outside FeedbackProvider
 */
export function useFeedbackContext() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedbackContext must be used within FeedbackProvider');
  }
  return context;
}
