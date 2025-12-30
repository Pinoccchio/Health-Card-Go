'use client';

import { useState, useEffect, useRef } from 'react';
import { DISEASE_TYPE_LABELS, getDiseaseDisplayName } from '@/lib/constants/diseaseConstants';
import { AlertCircle, Search, AlertTriangle, Activity } from 'lucide-react';

interface DiseaseSelectionFieldProps {
  value?: {
    disease_type: string;
    custom_disease_name?: string;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
  };
  onChange: (data: {
    disease_type: string;
    custom_disease_name?: string;
    severity: 'mild' | 'moderate' | 'severe' | 'critical';
  }) => void;
  showLabels?: boolean;
  required?: boolean;
}

/**
 * Enhanced Disease Selection Component
 *
 * Features:
 * - Autocomplete search for disease types
 * - Visual severity level indicators
 * - Custom disease name support
 * - Outbreak linking (placeholder for future)
 */
export function DiseaseSelectionField({
  value,
  onChange,
  showLabels = true,
  required = false,
}: DiseaseSelectionFieldProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(value?.disease_type || '');
  const [customDiseaseName, setCustomDiseaseName] = useState(value?.custom_disease_name || '');
  const [severity, setSeverity] = useState<'mild' | 'moderate' | 'severe' | 'critical'>(
    value?.severity || 'mild'
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter diseases based on search term
  const filteredDiseases = Object.entries(DISEASE_TYPE_LABELS).filter(([key, label]) =>
    label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notify parent of changes
  useEffect(() => {
    onChange({
      disease_type: selectedDisease,
      custom_disease_name: selectedDisease === 'other' ? customDiseaseName : undefined,
      severity,
    });
  }, [selectedDisease, customDiseaseName, severity, onChange]);

  const handleDiseaseSelect = (diseaseKey: string) => {
    setSelectedDisease(diseaseKey);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-600 text-white border-red-700';
      case 'severe': return 'bg-orange-600 text-white border-orange-700';
      case 'moderate': return 'bg-yellow-500 text-white border-yellow-600';
      case 'mild': return 'bg-green-600 text-white border-green-700';
      default: return 'bg-gray-500 text-white border-gray-600';
    }
  };

  const getSeverityIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'severe': return <AlertCircle className="w-4 h-4" />;
      case 'moderate': return <Activity className="w-4 h-4" />;
      case 'mild': return <Activity className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Disease Type Autocomplete */}
      <div className="relative" ref={dropdownRef}>
        {showLabels && (
          <label htmlFor="disease-search" className="block text-sm font-medium text-gray-700 mb-2">
            Disease Type {required && <span className="text-red-500">*</span>}
          </label>
        )}

        {/* Selected Disease Display / Search Input */}
        <div className="relative">
          {selectedDisease ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white flex items-center justify-between group">
              <span className="text-gray-900">
                {getDiseaseDisplayName(selectedDisease, selectedDisease === 'other' ? customDiseaseName : null)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedDisease('');
                  setCustomDiseaseName('');
                  setShowDropdown(true);
                }}
                className="text-sm text-primary-teal hover:text-primary-teal-dark font-medium opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                id="disease-search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search for disease type..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              />
            </div>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && !selectedDisease && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredDiseases.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No diseases found
              </div>
            ) : (
              filteredDiseases.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleDiseaseSelect(key)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors flex items-center justify-between group"
                >
                  <span className="text-gray-900">{label}</span>
                  {key === 'other' && (
                    <span className="text-xs text-gray-500 group-hover:text-gray-700">
                      Custom disease
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {required && !selectedDisease && (
          <p className="text-xs text-red-500 mt-1">Please select a disease type</p>
        )}
      </div>

      {/* Custom Disease Name (shown when "other" is selected) */}
      {selectedDisease === 'other' && (
        <div>
          {showLabels && (
            <label htmlFor="custom-disease" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Disease Name {required && <span className="text-red-500">*</span>}
            </label>
          )}
          <input
            type="text"
            id="custom-disease"
            value={customDiseaseName}
            onChange={(e) => setCustomDiseaseName(e.target.value)}
            placeholder="Enter disease name (e.g., Leptospirosis, Typhoid)"
            required={required && selectedDisease === 'other'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
          />
          {required && !customDiseaseName.trim() && (
            <p className="text-xs text-red-500 mt-1">Custom disease name is required</p>
          )}
        </div>
      )}

      {/* Severity Level Selector */}
      {selectedDisease && (
        <div>
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Severity Level {required && <span className="text-red-500">*</span>}
            </label>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['mild', 'moderate', 'severe', 'critical'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSeverity(level)}
                className={`
                  px-4 py-3 rounded-lg border-2 font-medium text-sm transition-all
                  flex items-center justify-center gap-2
                  ${severity === level
                    ? getSeverityColor(level) + ' shadow-md scale-105'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:shadow-sm'
                  }
                `}
              >
                {severity === level && getSeverityIcon(level)}
                <span className="capitalize">{level}</span>
              </button>
            ))}
          </div>

          {/* Severity Description */}
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600">
              {severity === 'mild' && 'Mild symptoms, manageable with basic care'}
              {severity === 'moderate' && 'Moderate symptoms, requires medical attention'}
              {severity === 'severe' && 'Severe symptoms, requires immediate medical intervention'}
              {severity === 'critical' && 'Critical condition, life-threatening, requires emergency care'}
            </p>
          </div>
        </div>
      )}

      {/* Disease Info Banner (when disease is selected) */}
      {selectedDisease && selectedDisease !== 'other' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Disease Surveillance</p>
              <p>
                This case will be automatically tracked in the disease surveillance system for{' '}
                <strong>{DISEASE_TYPE_LABELS[selectedDisease]}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
