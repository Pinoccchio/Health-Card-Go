'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Lock, LockOpen } from 'lucide-react';

interface EncryptionBadgeProps {
  isEncrypted: boolean;
  className?: string;
  showLabel?: boolean;
  encryptedLabel?: string;
  unencryptedLabel?: string;
}

export function EncryptionBadge({
  isEncrypted,
  className = '',
  showLabel = true,
  encryptedLabel,
  unencryptedLabel
}: EncryptionBadgeProps) {
  // Use provided label props, or fall back to useTranslations if available, or use hardcoded English
  let encryptedText = encryptedLabel;
  let unencryptedText = unencryptedLabel;

  if (!encryptedText || !unencryptedText) {
    try {
      const t = useTranslations('medical_records.encryption_status');
      encryptedText = encryptedText || t('encrypted');
      unencryptedText = unencryptedText || t('unencrypted');
    } catch {
      // If useTranslations fails (Server Component without provider), use hardcoded fallback
      encryptedText = encryptedText || 'Encrypted';
      unencryptedText = unencryptedText || 'Unencrypted';
    }
  }

  if (isEncrypted) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 ${className}`}
      >
        <Lock className="w-3 h-3" />
        {showLabel && encryptedText}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300 ${className}`}
    >
      <LockOpen className="w-3 h-3" />
      {showLabel && unencryptedText}
    </span>
  );
}
