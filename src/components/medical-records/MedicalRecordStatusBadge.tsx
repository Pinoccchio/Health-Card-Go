'use client';

import { Check } from 'lucide-react';

interface MedicalRecordStatusBadgeProps {
  hasRecord: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function MedicalRecordStatusBadge({
  hasRecord,
  size = 'md',
  showIcon = true
}: MedicalRecordStatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (hasRecord) {
    return (
      <span className={`inline-flex items-center rounded-md font-medium bg-green-100 text-green-800 ${sizeClasses[size]}`}>
        {showIcon && <Check className={`mr-1 ${iconSizes[size]}`} />}
        Record Complete
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-md font-medium bg-yellow-100 text-yellow-800 ${sizeClasses[size]}`}>
      No Record Yet
    </span>
  );
}
