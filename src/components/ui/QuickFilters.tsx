'use client';

import React from 'react';
import { FileText, Heart, AlertCircle, Baby, Syringe } from 'lucide-react';

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  ringColor: string;
  count?: number;
  category: string | null;
}

interface QuickFiltersProps {
  activeFilter: string;
  onChange: (filterId: string) => void;
  counts?: {
    all: number;
    general: number;
    healthcard: number;
    hiv: number;
    pregnancy: number;
    immunization: number;
  };
}

export const QuickFilters: React.FC<QuickFiltersProps> = ({ activeFilter, onChange, counts }) => {
  const filters: QuickFilter[] = [
    {
      id: 'all',
      label: 'All Records',
      icon: FileText,
      color: 'text-gray-700',
      bgColor: 'bg-gray-100 hover:bg-gray-200',
      ringColor: 'ring-gray-400',
      count: counts?.all,
      category: null,
    },
    {
      id: 'general',
      label: 'General',
      icon: Heart,
      color: 'text-blue-700',
      bgColor: 'bg-blue-100 hover:bg-blue-200',
      ringColor: 'ring-blue-500',
      count: counts?.general,
      category: 'general',
    },
    {
      id: 'healthcard',
      label: 'HealthCard',
      icon: FileText,
      color: 'text-teal-700',
      bgColor: 'bg-teal-100 hover:bg-teal-200',
      ringColor: 'ring-teal-500',
      count: counts?.healthcard,
      category: 'healthcard',
    },
    {
      id: 'hiv',
      label: 'HIV',
      icon: AlertCircle,
      color: 'text-red-700',
      bgColor: 'bg-red-100 hover:bg-red-200',
      ringColor: 'ring-red-500',
      count: counts?.hiv,
      category: 'hiv',
    },
    {
      id: 'pregnancy',
      label: 'Pregnancy',
      icon: Baby,
      color: 'text-pink-700',
      bgColor: 'bg-pink-100 hover:bg-pink-200',
      ringColor: 'ring-pink-500',
      count: counts?.pregnancy,
      category: 'pregnancy',
    },
    {
      id: 'immunization',
      label: 'Immunization',
      icon: Syringe,
      color: 'text-purple-700',
      bgColor: 'bg-purple-100 hover:bg-purple-200',
      ringColor: 'ring-purple-500',
      count: counts?.immunization,
      category: 'immunization',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;

        return (
          <button
            key={filter.id}
            onClick={() => onChange(filter.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all
              ${isActive
                ? `${filter.bgColor} ${filter.color} ring-2 ring-${filter.ringColor} ring-offset-1 shadow-md`
                : `bg-white ${filter.color} hover:${filter.bgColor} border border-gray-300`
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{filter.label}</span>
            {filter.count !== undefined && (
              <span className={`
                ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                ${isActive ? 'bg-white/30' : 'bg-gray-200'}
              `}>
                {filter.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
