'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

type MedicalRecordCategory = 'general' | 'healthcard' | 'hiv' | 'pregnancy' | 'immunization' | 'laboratory';

interface CategoryBadgeProps {
  category: MedicalRecordCategory;
  className?: string;
  label?: string;
}

// Hardcoded English fallback labels for Server Components
const CATEGORY_LABELS: Record<MedicalRecordCategory, string> = {
  general: 'General',
  healthcard: 'Health Card',
  hiv: 'HIV',
  pregnancy: 'Pregnancy',
  immunization: 'Immunization',
  laboratory: 'Laboratory',
};

export function CategoryBadge({ category, className = '', label }: CategoryBadgeProps) {
  // Use provided label prop, or fall back to useTranslations if available, or use hardcoded English
  let displayLabel = label;

  if (!displayLabel) {
    try {
      const t = useTranslations('enums.medical_category');
      displayLabel = t(category);
    } catch {
      // If useTranslations fails (Server Component without provider), use hardcoded fallback
      displayLabel = CATEGORY_LABELS[category];
    }
  }

  const getCategoryConfig = (cat: MedicalRecordCategory) => {
    switch (cat) {
      case 'hiv':
        return {
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-300',
        };
      case 'pregnancy':
        return {
          bgColor: 'bg-pink-100',
          textColor: 'text-pink-700',
          borderColor: 'border-pink-300',
        };
      case 'healthcard':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-300',
        };
      case 'immunization':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-300',
        };
      case 'laboratory':
        return {
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-300',
        };
      case 'general':
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-300',
        };
    }
  };

  const config = getCategoryConfig(category);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      {displayLabel}
    </span>
  );
}
