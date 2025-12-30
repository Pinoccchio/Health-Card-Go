'use client';

import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 px-4 ${className}`}>
      <div className="max-w-md mx-auto">
        {Icon && (
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-gray-400" />
          </div>
        )}

        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>

        <p className="text-gray-600 mb-6">
          {description}
        </p>

        {(actionLabel && (actionHref || onAction)) && (
          <>
            {actionHref ? (
              <Link
                href={actionHref}
                className="inline-flex items-center px-4 py-2 bg-[#20C997] text-white text-sm font-medium rounded-md hover:bg-[#1AA179] transition-colors"
              >
                {actionLabel}
              </Link>
            ) : (
              <button
                onClick={onAction}
                className="inline-flex items-center px-4 py-2 bg-[#20C997] text-white text-sm font-medium rounded-md hover:bg-[#1AA179] transition-colors"
              >
                {actionLabel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
