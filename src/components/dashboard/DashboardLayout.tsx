'use client';

import React, { useState } from 'react';
import { Sidebar, MenuItem } from './Sidebar';
import { AppBar } from './AppBar';
import { RoleId } from '@/types/auth';
import {
  SUPER_ADMIN_MENU_ITEMS,
  HEALTHCARE_ADMIN_MENU_ITEMS,
  PATIENT_MENU_ITEMS,
  STAFF_MENU_ITEMS,
  getRoleName,
} from '@/lib/config/menuItems';
import { cn } from '@/lib/utils';

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

  // Get menu items based on role
  const menuItems: MenuItem[] =
    roleId === 1
      ? SUPER_ADMIN_MENU_ITEMS
      : roleId === 2
        ? HEALTHCARE_ADMIN_MENU_ITEMS
        : roleId === 5
          ? STAFF_MENU_ITEMS
          : PATIENT_MENU_ITEMS;

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
