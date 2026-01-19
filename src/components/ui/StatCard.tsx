'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
}

/**
 * StatCard Component
 *
 * A statistics card component for displaying metrics with an icon.
 * Used in dashboards to show key statistics and counts.
 *
 * @param title - The label for the statistic
 * @param value - The value to display (number or string like '...')
 * @param icon - Lucide icon component to display
 * @param iconBgColor - Tailwind background color class for the icon container (default: 'bg-gray-100')
 * @param iconColor - Tailwind text color class for the icon (default: 'text-gray-600')
 * @param className - Additional Tailwind classes for the card container
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  iconBgColor = 'bg-gray-100',
  iconColor = 'text-gray-600',
  className,
}) => {
  return (
    <div className={cn(
      'bg-white rounded-lg shadow-md p-6 transition-shadow hover:shadow-lg',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={cn('p-3 rounded-lg', iconBgColor)}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
      </div>
    </div>
  );
};
