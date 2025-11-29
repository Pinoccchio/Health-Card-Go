'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Logo } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface SidebarProps {
  menuItems: MenuItem[];
  roleName: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  menuItems,
  roleName,
  isCollapsed,
  onToggleCollapse,
}) => {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'bg-primary-teal text-white h-screen fixed left-0 top-0 transition-all duration-300 flex flex-col shadow-xl z-[1001] overflow-hidden',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo Section */}
      <div className="p-6 flex items-center gap-3 border-b border-white/10 overflow-hidden">
        <div
          className={cn(
            'flex-1 transition-opacity duration-300',
            isCollapsed ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'
          )}
        >
          <Logo size="md" variant="default" colorScheme="light" />
          <span className="text-xs text-white/70 block mt-1">{roleName}</span>
        </div>
        <div
          className={cn(
            'flex items-center justify-center w-full transition-opacity duration-300',
            isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'
          )}
        >
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-primary-teal font-bold text-sm">HC</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav
        className={cn(
          'flex-1 px-3 py-4',
          isCollapsed ? 'overflow-hidden' : 'overflow-y-auto'
        )}
      >
        {menuItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={index}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all duration-200 group',
                isActive
                  ? 'bg-cta-orange shadow-lg'
                  : 'hover:bg-white/10 hover:translate-x-1'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span
                className={cn(
                  'text-sm font-medium transition-opacity duration-300 whitespace-nowrap',
                  isCollapsed ? 'opacity-0 w-0' : 'opacity-100'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="m-4 p-3 hover:bg-white/10 transition-colors rounded-lg border border-white/10 flex items-center justify-center"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>
    </div>
  );
};
