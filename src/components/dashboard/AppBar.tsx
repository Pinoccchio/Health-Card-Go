'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { ROLE_NAMES } from '@/types/auth';
import { cn } from '@/lib/utils';

interface AppBarProps {
  pageTitle?: string;
  pageDescription?: string;
}

export const AppBar: React.FC<AppBarProps> = ({
  pageTitle,
  pageDescription,
}) => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
    router.push('/login');
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const getUserInitials = () => {
    if (!user) return 'U';
    const firstInitial = user.first_name?.charAt(0) || '';
    const lastInitial = user.last_name?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  };

  return (
    <div className="bg-white h-16 flex items-center justify-between px-6 shadow-sm border-b border-gray-200 sticky top-0 z-[1000]">
      {/* Page Title */}
      <div className="flex-1">
        {pageTitle && (
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
            {pageDescription && (
              <p className="text-sm text-gray-600">{pageDescription}</p>
            )}
          </div>
        )}
      </div>

      {/* User Menu */}
      <div className="relative user-menu-container">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
        >
          <div className="w-10 h-10 bg-primary-teal rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {getUserInitials()}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-gray-600">
              {user?.role_id && ROLE_NAMES[user.role_id]}
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>

        {/* Dropdown Menu */}
        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-14 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">{user?.email}</p>
                <p className="text-xs text-primary-teal mt-1 font-medium">
                  {user?.role_id && ROLE_NAMES[user.role_id]}
                  {user?.role_id === 2 && user?.admin_category && (
                    <span className="text-gray-500"> • {user.admin_category}</span>
                  )}
                </p>
              </div>

              <div className="py-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
