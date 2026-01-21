/**
 * ExpirationStatus Component
 *
 * Displays the expiration status of a health card as a badge
 * Shows: Active, Expiring Soon, Expired, or Pending status
 */

'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
  type HealthCardStatus,
  getStatusBadgeColor,
  getStatusLabel,
} from '@/lib/utils/healthCardExpiration';

interface ExpirationStatusProps {
  status: HealthCardStatus;
  daysRemaining?: number | null;
  className?: string;
  showIcon?: boolean;
  showDays?: boolean;
}

export function ExpirationStatus({
  status,
  daysRemaining,
  className = '',
  showIcon = true,
  showDays = true,
}: ExpirationStatusProps) {
  const colors = getStatusBadgeColor(status);
  const label = getStatusLabel(status);

  // Select appropriate icon based on status
  const StatusIcon = () => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'expiring_soon':
        return <AlertCircle className="w-4 h-4" />;
      case 'expired':
        return <XCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
    }
  };

  // Format days remaining text
  const getDaysText = () => {
    if (!showDays || daysRemaining === null || daysRemaining === undefined) {
      return null;
    }

    if (status === 'expired') {
      const daysPast = Math.abs(daysRemaining);
      return `(${daysPast} ${daysPast === 1 ? 'day' : 'days'} ago)`;
    }

    if (status === 'expiring_soon') {
      return `(${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left)`;
    }

    if (status === 'active' && daysRemaining > 0) {
      return `(${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left)`;
    }

    return null;
  };

  const daysText = getDaysText();

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        border-2 ${colors.border} ${colors.bg} ${colors.text}
        ${className}
      `}
    >
      {showIcon && <StatusIcon />}
      <span className="font-semibold">{label}</span>
      {daysText && <span className="text-xs font-normal">{daysText}</span>}
    </div>
  );
}
