'use client';

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FeatureItemProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
}

export function FeatureItem({ title, description, icon: Icon, className }: FeatureItemProps) {
  return (
    <div className={cn('flex gap-4 items-start', className)}>
      {/* Icon Container */}
      <div className="flex-shrink-0">
        <div className="p-3 rounded-lg bg-[#20C997]/10 transition-all duration-300 hover:bg-[#20C997]/20">
          <Icon className="h-6 w-6 text-[#20C997]" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <h4 className="text-lg font-bold text-gray-800 mb-2">{title}</h4>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
