'use client';

import React from 'react';

type MedicalRecordCategory = 'general' | 'healthcard' | 'hiv' | 'pregnancy' | 'immunization' | 'laboratory';

interface CategoryBadgeProps {
  category: MedicalRecordCategory;
  className?: string;
}

export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  const getCategoryConfig = (cat: MedicalRecordCategory) => {
    switch (cat) {
      case 'hiv':
        return {
          label: 'HIV',
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-700',
          borderColor: 'border-purple-300',
        };
      case 'pregnancy':
        return {
          label: 'Pregnancy',
          bgColor: 'bg-pink-100',
          textColor: 'text-pink-700',
          borderColor: 'border-pink-300',
        };
      case 'healthcard':
        return {
          label: 'Health Card',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-300',
        };
      case 'immunization':
        return {
          label: 'Immunization',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-300',
        };
      case 'laboratory':
        return {
          label: 'Laboratory',
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-300',
        };
      case 'general':
      default:
        return {
          label: 'General',
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
      {config.label}
    </span>
  );
}
