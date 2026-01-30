'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { RoleId } from '@/types/auth';

interface AnnouncementContextType {
  recentCount: number;
  isLoading: boolean;
  refreshCount: () => Promise<void>;
}

const AnnouncementContext = createContext<AnnouncementContextType | undefined>(undefined);

/**
 * AnnouncementProvider - Centralized announcements state management
 *
 * Features:
 * - Polling-based updates (every 60 seconds)
 * - Persistent state across navigation
 * - 48-hour "NEW" threshold for recent announcements
 * - Role-based announcement filtering
 *
 * Used by: Patient, Healthcare Admin, Staff dashboards
 * - Shows "NEW" badge when announcements exist within 48 hours
 * - Badge persists across page navigation (doesn't flicker)
 * - Independent of menu loading timing
 */
export function AnnouncementProvider({
  children,
  roleId
}: {
  children: ReactNode;
  roleId: RoleId;
}) {
  const [recentCount, setRecentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Fetch and poll announcement count
  useEffect(() => {
    if (!user) return;

    const fetchAnnouncementCount = async () => {
      try {
        setIsLoading(true);
        console.log(`🔍 [AnnouncementContext-${roleId}] Fetching announcements count...`);
        const response = await fetch('/api/announcements/unread-count');

        if (!response.ok) {
          console.error(`❌ [AnnouncementContext-${roleId}] API returned error:`, response.status);
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (data.success) {
          console.log(`📢 [AnnouncementContext-${roleId}] Recent count: ${data.recentCount}`);
          setRecentCount(data.recentCount || 0);
        } else {
          console.error(`❌ [AnnouncementContext-${roleId}] API returned success: false`);
        }
      } catch (error) {
        console.error(`❌ [AnnouncementContext-${roleId}] Fetch error:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch on mount
    fetchAnnouncementCount();

    // Poll every 60 seconds (1 minute)
    const interval = setInterval(fetchAnnouncementCount, 60000);
    console.log(`⏰ [AnnouncementContext-${roleId}] Polling started (60s interval)`);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      console.log(`🛑 [AnnouncementContext-${roleId}] Polling stopped`);
    };
  }, [user, roleId]);

  /**
   * Manually refresh announcement count (for edge cases)
   */
  const refreshCount = useCallback(async () => {
    try {
      console.log(`🔄 [AnnouncementContext-${roleId}] Manual refresh requested`);
      const response = await fetch('/api/announcements/unread-count');
      if (!response.ok) {
        console.error(`❌ [AnnouncementContext-${roleId}] Refresh API error:`, response.status);
        return;
      }
      const data = await response.json();
      if (data.success) {
        console.log(`✅ [AnnouncementContext-${roleId}] Refreshed count: ${data.recentCount}`);
        setRecentCount(data.recentCount || 0);
      }
    } catch (error) {
      console.error(`❌ [AnnouncementContext-${roleId}] Failed to refresh count:`, error);
    }
  }, [roleId]);

  return (
    <AnnouncementContext.Provider
      value={{
        recentCount,
        isLoading,
        refreshCount,
      }}
    >
      {children}
    </AnnouncementContext.Provider>
  );
}

/**
 * Hook to access announcement context
 *
 * @throws Error if used outside AnnouncementProvider
 */
export function useAnnouncementContext() {
  const context = useContext(AnnouncementContext);
  if (!context) {
    throw new Error('useAnnouncementContext must be used within AnnouncementProvider');
  }
  return context;
}
