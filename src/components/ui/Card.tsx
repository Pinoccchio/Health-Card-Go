'use client';

import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CardProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  href?: string;
  onClick?: () => void;
  linkText?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Card({ title, description, icon: Icon, iconColor = '#20C997', href, onClick, linkText = 'Learn More', className, children }: CardProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cn(
        'group bg-white rounded-lg p-8 transition-all duration-300',
        'shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
        'hover:-translate-y-1',
        className
      )}
    >
      {/* Icon - only render if provided */}
      {Icon && (
        <div className="flex justify-center mb-6">
          <div
            className="p-4 rounded-full transition-transform duration-300 group-hover:scale-110"
            style={{ backgroundColor: `${iconColor}15` }}
          >
            <Icon className="h-10 w-10" style={{ color: iconColor }} />
          </div>
        </div>
      )}

      {/* Title - only render if provided */}
      {title && <h3 className="text-xl font-bold text-gray-800 mb-3 text-center">{title}</h3>}

      {/* Description - only render if provided */}
      {description && <p className="text-gray-600 text-center mb-6 leading-relaxed">{description}</p>}

      {/* Children - for custom content */}
      {children}

      {/* Link / Button */}
      {(href || onClick) && (
        <div className="text-center">
          <a
            href={href || '#'}
            onClick={handleClick}
            className="inline-block text-[#20C997] hover:text-[#1AA179] font-medium transition-colors duration-200 hover:underline underline-offset-4 cursor-pointer"
            role={onClick ? 'button' : undefined}
          >
            {linkText}
          </a>
        </div>
      )}
    </div>
  );
}
