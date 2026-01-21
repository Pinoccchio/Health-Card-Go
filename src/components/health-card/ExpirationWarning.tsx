/**
 * ExpirationWarning Component
 *
 * Displays a warning banner when a health card is expiring soon or expired
 * Includes call-to-action for renewal
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Calendar, XCircle } from 'lucide-react';
import {
  type HealthCardStatus,
  formatExpiryDate,
} from '@/lib/utils/healthCardExpiration';

interface ExpirationWarningProps {
  status: HealthCardStatus;
  expiryDate: Date | string | null;
  daysRemaining?: number | null;
  warningMessage?: string;
  onRenewClick?: () => void;
  showRenewButton?: boolean;
  className?: string;
}

export function ExpirationWarning({
  status,
  expiryDate,
  daysRemaining,
  warningMessage,
  onRenewClick,
  showRenewButton = true,
  className = '',
}: ExpirationWarningProps) {
  // Only show warning for expiring_soon or expired statuses
  if (status !== 'expiring_soon' && status !== 'expired') {
    return null;
  }

  const isExpired = status === 'expired';

  return (
    <div
      className={`
        rounded-lg border-2 p-4
        ${isExpired
          ? 'bg-red-50 border-red-500'
          : 'bg-yellow-50 border-yellow-500'
        }
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {isExpired ? (
            <XCircle className="w-6 h-6 text-red-600" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Title */}
          <h3
            className={`
              text-lg font-semibold mb-1
              ${isExpired ? 'text-red-900' : 'text-yellow-900'}
            `}
          >
            {isExpired ? 'Health Card Expired' : 'Health Card Expiring Soon'}
          </h3>

          {/* Warning Message */}
          {warningMessage && (
            <p
              className={`
                text-sm mb-3
                ${isExpired ? 'text-red-800' : 'text-yellow-800'}
              `}
            >
              {warningMessage}
            </p>
          )}

          {/* Expiry Date Info */}
          {expiryDate && (
            <div className="flex items-center gap-2 mb-3">
              <Calendar className={`w-4 h-4 ${isExpired ? 'text-red-600' : 'text-yellow-600'}`} />
              <p
                className={`
                  text-sm font-medium
                  ${isExpired ? 'text-red-800' : 'text-yellow-800'}
                `}
              >
                {isExpired ? 'Expired on:' : 'Expires on:'}{' '}
                <span className="font-bold">{formatExpiryDate(expiryDate)}</span>
                {daysRemaining !== null && daysRemaining !== undefined && (
                  <span className="ml-2">
                    ({isExpired ? Math.abs(daysRemaining) : daysRemaining}{' '}
                    {Math.abs(daysRemaining || 0) === 1 ? 'day' : 'days'}{' '}
                    {isExpired ? 'ago' : 'remaining'})
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Actions */}
          {showRenewButton && (
            <div className="flex flex-wrap gap-2">
              {onRenewClick ? (
                <button
                  onClick={onRenewClick}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium text-white
                    transition-colors
                    ${isExpired
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                    }
                  `}
                >
                  {isExpired ? 'Renew Card Now' : 'Renew Early'}
                </button>
              ) : (
                <Link
                  href="/patient/appointments/book"
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium text-white
                    transition-colors inline-block
                    ${isExpired
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-yellow-600 hover:bg-yellow-700'
                    }
                  `}
                >
                  {isExpired ? 'Book Renewal Appointment' : 'Renew Early'}
                </Link>
              )}

              <Link
                href="/patient/health-card"
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium border-2
                  transition-colors
                  ${isExpired
                    ? 'border-red-600 text-red-700 hover:bg-red-100'
                    : 'border-yellow-600 text-yellow-700 hover:bg-yellow-100'
                  }
                `}
              >
                View Health Card
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
