'use client';

import React from 'react';
import { CheckCircle2, XCircle, Circle } from 'lucide-react';
import {
  type PasswordValidationRules,
  PASSWORD_REQUIREMENTS,
} from '@/lib/validators/passwordValidation';

interface PasswordRequirementsDisplayProps {
  validationRules: PasswordValidationRules;
  showOnlyWhenActive?: boolean;
  isActive?: boolean;
}

export function PasswordRequirementsDisplay({
  validationRules,
  showOnlyWhenActive = false,
  isActive = false,
}: PasswordRequirementsDisplayProps) {
  // Don't show if configured to only show when active and it's not active
  if (showOnlyWhenActive && !isActive) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-medium text-gray-700">Password must contain:</p>
      <ul className="space-y-1.5">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const isValid = validationRules[requirement.id];
          const Icon = isValid ? CheckCircle2 : isActive ? XCircle : Circle;

          return (
            <li key={requirement.id} className="flex items-center gap-2 text-sm">
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isValid
                    ? 'text-success'
                    : isActive
                    ? 'text-danger'
                    : 'text-gray-400'
                }`}
              />
              <span
                className={`${
                  isValid
                    ? 'text-success font-medium'
                    : isActive
                    ? 'text-gray-700'
                    : 'text-gray-600'
                }`}
              >
                {requirement.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
