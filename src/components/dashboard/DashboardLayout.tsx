'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar, MenuItem } from './Sidebar';
import { AppBar } from './AppBar';
import { RoleId } from '@/types/auth';
import {
  SUPER_ADMIN_MENU_ITEMS,
  HEALTHCARE_ADMIN_MENU_ITEMS,
  PATIENT_MENU_ITEMS,
  STAFF_MENU_ITEMS,
  EDUCATION_ADMIN_MENU_ITEMS,
  getRoleName,
  getHealthcareAdminMenuItems,
} from '@/lib/config/menuItems';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useNotificationContext } from '@/lib/contexts/NotificationContext';
import { useFeedbackContext } from '@/lib/contexts/FeedbackContext';
import { useAnnouncementContext } from '@/lib/contexts/AnnouncementContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  roleId: RoleId;
  pageTitle?: string;
  pageDescription?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  roleId,
  pageTitle,
  pageDescription,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const { user } = useAuth();

  // Get unread count from NotificationContext (only for patients)
  // This will throw if not wrapped in NotificationProvider, but that's only for patients
  let unreadCount = 0;
  try {
    if (roleId === 4) {
      const notificationContext = useNotificationContext();
      unreadCount = notificationContext.unreadCount;
    }
  } catch (error) {
    // Not a patient or not wrapped in NotificationProvider, ignore
  }

  // Get pending feedback count from FeedbackContext (only for super admins)
  let pendingFeedbackCount = 0;
  try {
    if (roleId === 1) {
      const feedbackContext = useFeedbackContext();
      pendingFeedbackCount = feedbackContext.pendingCount;
    }
  } catch (error) {
    // Not a super admin or not wrapped in FeedbackProvider, ignore
  }

  // Get recent announcements count from AnnouncementContext (for super admins, patients, staff, healthcare admins, education admins)
  // This will throw if not wrapped in AnnouncementProvider
  let recentAnnouncementsCount = 0;
  let announcementsLoading = false;
  try {
    if (roleId === 1 || roleId === 4 || roleId === 2 || roleId === 5 || roleId === 6) {
      const announcementContext = useAnnouncementContext();
      recentAnnouncementsCount = announcementContext.recentCount;
      announcementsLoading = announcementContext.isLoading;
    }
  } catch (error) {
    // Not wrapped in AnnouncementProvider, ignore
  }

  // Memoize assigned_service_id and admin_category to prevent unnecessary re-renders
  // Extracts primitive value from user object to avoid reference equality issues
  // Only updates when the actual service ID value changes, not when user object reference changes
  const assignedServiceId = useMemo(() => user?.assigned_service_id, [user?.assigned_service_id]);
  const adminCategory = useMemo(() => user?.admin_category, [user?.admin_category]);

  // Helper function to preserve badges when updating menu items
  // Merges existing badges from current menu into new menu items
  // Critical for Healthcare Admin where async menu loading can overwrite badges
  const mergeBadgesIntoMenu = (currentMenu: MenuItem[], newMenu: MenuItem[]): MenuItem[] => {
    return newMenu.map(newItem => {
      // Find matching item in current menu by href
      const existingItem = currentMenu.find(curr => curr.href === newItem.href);
      // Preserve badge if it exists in current menu
      if (existingItem?.badge) {
        return { ...newItem, badge: existingItem.badge };
      }
      return newItem;
    });
  };

  // Load menu items dynamically for Healthcare Admins, statically for others
  useEffect(() => {
    async function loadMenuItems() {
      // CRITICAL FIX: Skip menu loading if menu already exists
      // Prevents sidebar skeleton from showing on navigation for Healthcare Admin
      // Only load menu on first mount, preserve existing menu on subsequent page changes
      if (menuItems.length > 0) {
        console.log('✅ [Menu Loading] Menu already loaded, skipping reload on navigation');
        return;
      }

      setIsLoadingMenu(true);

      try {
        if (roleId === 2 && assignedServiceId) {
          // Healthcare Admin - fetch dynamic menu based on assigned service and admin category
          console.log('📋 Loading dynamic menu for Healthcare Admin with service:', assignedServiceId, 'category:', adminCategory);
          const dynamicMenuItems = await getHealthcareAdminMenuItems(assignedServiceId, adminCategory);

          // CRITICAL FIX: Preserve existing badges when updating menu
          // Use functional setState to merge badges from current menu into new menu
          // This prevents async menu loading from overwriting announcement badges
          setMenuItems(prevItems => {
            if (prevItems.length > 0) {
              console.log('🔄 [Menu Loading] Merging badges from previous menu into new menu');
              return mergeBadgesIntoMenu(prevItems, dynamicMenuItems);
            }
            return dynamicMenuItems;
          });
        } else {
          // Static menus for other roles
          const staticMenuItems =
            roleId === 1
              ? SUPER_ADMIN_MENU_ITEMS
              : roleId === 2
                ? HEALTHCARE_ADMIN_MENU_ITEMS // Fallback if no service assigned
                : roleId === 5
                  ? STAFF_MENU_ITEMS
                  : roleId === 6
                    ? EDUCATION_ADMIN_MENU_ITEMS
                    : PATIENT_MENU_ITEMS;
          setMenuItems(staticMenuItems);
        }
      } catch (error) {
        console.error('❌ Error loading menu items:', error);
        // Fallback to static menu on error
        const fallbackItems =
          roleId === 1
            ? SUPER_ADMIN_MENU_ITEMS
            : roleId === 2
              ? HEALTHCARE_ADMIN_MENU_ITEMS
              : roleId === 5
                ? STAFF_MENU_ITEMS
                : roleId === 6
                  ? EDUCATION_ADMIN_MENU_ITEMS
                  : PATIENT_MENU_ITEMS;
        setMenuItems(fallbackItems);
      } finally {
        setIsLoadingMenu(false);
      }
    }

    loadMenuItems();
  }, [roleId, assignedServiceId, adminCategory]);

  // ✨ VISITOR-TRIGGERED AUTOMATIC NO-SHOW DETECTION ✨
  // When Healthcare Admin visits dashboard → automatically check for overdue appointments
  // ⚡ REAL-TIME MODE: Runs EVERY time Healthcare Admin visits any dashboard page
  useEffect(() => {
    // Only trigger for Healthcare Admins (role_id: 2)
    if (roleId !== 2 || !user) return;

    // Trigger automatic no-show detection (background, non-blocking)
    console.log('🔍 [AUTO NO-SHOW] Healthcare Admin visited - triggering real-time check...');

    fetch('/api/appointments/check-overdue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.processed_count > 0) {
            console.log(`✅ [AUTO NO-SHOW] Processed ${data.processed_count} overdue appointment(s)`);
          } else {
            console.log('✅ [AUTO NO-SHOW] No overdue appointments found');
          }
        } else {
          console.error('❌ [AUTO NO-SHOW] Check failed:', data.error);
        }
      })
      .catch(err => {
        // Silent failure - don't interrupt admin's workflow
        console.error('❌ [AUTO NO-SHOW] Request failed (silent):', err);
      });

  }, [roleId, user]); // Runs EVERY time Healthcare Admin loads any dashboard page

  // ✨ PATIENT NOTIFICATIONS BADGE ✨
  // Update menu items when unread count changes (from NotificationContext)
  // Uses optimistic updates + real-time sync for instant badge updates
  // Fixed: Uses functional setState to prevent stale closure bugs
  useEffect(() => {
    if (roleId !== 4) return;

    setMenuItems((prevMenuItems) => {
      // Don't update if menu hasn't loaded yet
      if (prevMenuItems.length === 0) return prevMenuItems;

      return prevMenuItems.map((item) => {
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
    });
  }, [unreadCount, roleId]); // No menuItems dependency - using functional setState

  // ✨ ADMIN FEEDBACK BADGE ✨
  // Update menu items when pending feedback count changes (from FeedbackContext)
  // Uses real-time sync to show pending work requiring admin response
  // Fixed: Uses functional setState to prevent stale closure bugs
  useEffect(() => {
    if (roleId !== 1) return;

    setMenuItems((prevMenuItems) => {
      // Don't update if menu hasn't loaded yet
      if (prevMenuItems.length === 0) return prevMenuItems;

      return prevMenuItems.map((item) => {
        if (item.href === '/admin/feedback') {
          return {
            ...item,
            badge: pendingFeedbackCount > 0
              ? { count: pendingFeedbackCount, variant: 'warning' as const }
              : undefined, // Remove badge when count is 0
          };
        }
        return item;
      });
    });
  }, [pendingFeedbackCount, roleId]); // No menuItems dependency - using functional setState

  // ✨ ANNOUNCEMENTS "NEW" TEXT BADGE ✨
  // Update menu items when recent announcements count changes (from AnnouncementContext)
  // Shows "NEW" text instead of count number (announcements are broadcast, not tracked per-user)
  // Uses 48-hour time threshold (recentCount from API)
  // Context provides persistent state across navigation - no flickering
  // Triggers when: count changes OR when menu finishes loading
  useEffect(() => {
    // Only for roles wrapped in AnnouncementProvider (Super Admin, Patient, Staff, Healthcare Admin, Education Admin)
    if (roleId !== 1 && roleId !== 4 && roleId !== 5 && roleId !== 2 && roleId !== 6) {
      return;
    }

    // CRITICAL FIX: Wait for menu to load before updating badge
    // Prevents race condition with Healthcare Admin's dynamic menu loading
    // Patient/Staff have static menus (load instantly), Healthcare Admin uses async API call
    if (menuItems.length === 0) {
      console.log('⏳ [Announcements Badge] Menu not loaded yet, deferring badge update');
      return;
    }

    // CRITICAL FIX: Wait for announcement data to load before updating badge
    // Prevents race condition where menu loads before API call completes
    // Badge would be set to undefined with count=0, then never reappears
    if (announcementsLoading) {
      console.log('⏳ [Announcements Badge] Data still loading, deferring badge update');
      return;
    }

    setMenuItems((prevMenuItems) => {
      return prevMenuItems.map((item) => {
        // Determine announcement href based on role
        const announcementHref =
          roleId === 4
            ? '/patient/announcements'
            : roleId === 5
            ? '/staff/announcements'
            : roleId === 2
            ? '/healthcare-admin/announcements'
            : roleId === 6
            ? '/education-admin/announcements'
            : '/admin/announcements'; // Super Admin (roleId === 1)

        if (item.href === announcementHref) {
          return {
            ...item,
            badge: recentAnnouncementsCount > 0
              ? { text: 'NEW', variant: 'success' as const }
              : undefined,
          };
        }
        return item;
      });
    });
  }, [recentAnnouncementsCount, roleId, menuItems.length, announcementsLoading]); // Runs when count/loading changes OR menu loads

  // Show loading skeleton while menu loads
  if (isLoadingMenu) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-primary-teal h-full animate-pulse" />
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-white border-b animate-pulse" />
          <div className="flex-1 p-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4 animate-pulse" />
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        menuItems={menuItems}
        roleName={getRoleName(roleId)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300',
          isCollapsed ? 'ml-20' : 'ml-64'
        )}
      >
        {/* AppBar */}
        <AppBar pageTitle={pageTitle} pageDescription={pageDescription} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
