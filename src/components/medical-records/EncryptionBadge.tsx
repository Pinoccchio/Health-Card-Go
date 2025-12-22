'use client';

import React from 'react';
import { Lock, LockOpen } from 'lucide-react';

interface EncryptionBadgeProps {
  isEncrypted: boolean;
  className?: string;
  showLabel?: boolean;
}

export function EncryptionBadge({ isEncrypted, className = '', showLabel = true }: EncryptionBadgeProps) {
  if (isEncrypted) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 ${className}`}
      >
        <Lock className="w-3 h-3" />
        {showLabel && 'Encrypted'}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 ${className}`}
    >
      <LockOpen className="w-3 h-3" />
      {showLabel && 'Unencrypted'}
    </span>
  );
}
