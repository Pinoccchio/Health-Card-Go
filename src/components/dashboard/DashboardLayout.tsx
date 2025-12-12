'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, MenuItem } from './Sidebar';
import { AppBar } from './AppBar';
import { RoleId } from '@/types/auth';
import {
  SUPER_ADMIN_MENU_ITEMS,
  HEALTHCARE_ADMIN_MENU_ITEMS,
  PATIENT_MENU_ITEMS,
  STAFF_MENU_ITEMS,
  getRoleName,
  getHealthcareAdminMenuItems,
} from '@/lib/config/menuItems';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

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

  // Load menu items dynamically for Healthcare Admins, statically for others
  useEffect(() => {
    async function loadMenuItems() {
      setIsLoadingMenu(true);

      try {
        if (roleId === 2 && user?.assigned_service_id) {
          // Healthcare Admin - fetch dynamic menu based on assigned service
          console.log('📋 Loading dynamic menu for Healthcare Admin with service:', user.assigned_service_id);
          const dynamicMenuItems = await getHealthcareAdminMenuItems(user.assigned_service_id);
          setMenuItems(dynamicMenuItems);
        } else {
          // Static menus for other roles
          const staticMenuItems =
            roleId === 1
              ? SUPER_ADMIN_MENU_ITEMS
              : roleId === 2
                ? HEALTHCARE_ADMIN_MENU_ITEMS // Fallback if no service assigned
                : roleId === 5
                  ? STAFF_MENU_ITEMS
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
                : PATIENT_MENU_ITEMS;
        setMenuItems(fallbackItems);
      } finally {
        setIsLoadingMenu(false);
      }
    }

    loadMenuItems();
  }, [roleId, user?.assigned_service_id]);

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
