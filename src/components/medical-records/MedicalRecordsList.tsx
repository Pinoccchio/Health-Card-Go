'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, FileText, Calendar, User, ChevronLeft, ChevronRight, Download, Plus, Eye, AlertCircle } from 'lucide-react';
import { CategoryBadge } from './CategoryBadge';
import { EncryptionBadge } from './EncryptionBadge';
import { MedicalRecordDetailsModal } from './MedicalRecordDetailsModal';
import { formatPhilippineDate } from '@/lib/utils/timezone';

// English fallback translations for non-patient users
const ENGLISH_FALLBACK = {
  'table.search_placeholder': 'Search by patient name or diagnosis...',
  'filters.all_categories': 'All Categories',
  'buttons.create_new': 'Create New',
  'buttons.export': 'Export',
  'info_note': 'You have pending appointments that need to be completed. Medical records will appear here once you complete appointments.',
  'table.showing_count': 'Showing {showing} of {total} records',
  'table.loading': 'Loading records...',
  'table.no_records_found': 'No records found',
  'table.no_records_hint': 'Try adjusting your search or filter to find what you\'re looking for.',
  'table.no_records_complete_appointments': 'Complete appointments to start creating medical records.',
  'table.patient': 'Patient',
  'table.date': 'Date',
  'table.category': 'Category',
  'table.diagnosis': 'Diagnosis',
  'table.encryption': 'Encryption',
  'table.created_by': 'Created By',
  'table.actions': 'Actions',
  'table.view': 'View',
  'pagination.previous': 'Previous',
  'pagination.next': 'Next',
  'pagination.showing_page': 'Page {current} of {total}',
};

const CATEGORY_ENGLISH_FALLBACK: Record<string, string> = {
  'general': 'General',
  'healthcard': 'Health Card',
  'hiv': 'HIV',
  'pregnancy': 'Pregnancy',
  'immunization': 'Immunization',
  'laboratory': 'Laboratory',
};

interface MedicalRecord {
  id: string;
  patient_id: string;
  appointment_id?: string;
  created_by_id: string;
  category: 'general' | 'healthcard' | 'hiv' | 'pregnancy' | 'immunization' | 'laboratory';
  template_type?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  record_data?: any;
  is_encrypted: boolean;
  created_at: string;
  updated_at: string;
  patients?: {
    patient_number: string;
    profiles?: {
      first_name: string;
      last_name: string;
    };
  };
  created_by?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  appointments?: {
    id: string;
    appointment_number: number;
    appointment_date: string;
    appointment_time: string;
    status: string;
    service_id: number;
    services?: {
      id: number;
      name: string;
      category: string;
    };
  };
}

interface MedicalRecordsListProps {
  records: MedicalRecord[];
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pendingAppointmentsCount: number;
  onPageChange: (page: number) => void;
  onSearch: (query: string) => void;
  onCategoryFilter: (category: string) => void;
  onExport?: () => void;
  onCreate?: () => void;
  autoOpenRecord?: MedicalRecord | null;
  onAutoOpenComplete?: () => void;
  disableTranslations?: boolean; // For non-patient users (healthcare admin, super admin)
}

export function MedicalRecordsList({
  records,
  isLoading = false,
  currentPage,
  totalPages,
  totalRecords,
  pendingAppointmentsCount,
  onPageChange,
  onSearch,
  onCategoryFilter,
  onExport,
  onCreate,
  autoOpenRecord,
  onAutoOpenComplete,
  disableTranslations = false,
}: MedicalRecordsListProps) {
  // Conditionally use translations - only for patient users
  let t: any;
  let tEnum: any;

  try {
    if (!disableTranslations) {
      t = useTranslations('medical_records');
      tEnum = useTranslations('enums.medical_category');
    }
  } catch (e) {
    // NextIntl context not available, use English fallback
  }

  // Translation helper that falls back to English
  const getText = (key: string, params?: Record<string, any>): string => {
    if (disableTranslations || !t) {
      const template = ENGLISH_FALLBACK[key as keyof typeof ENGLISH_FALLBACK] || key;
      if (params) {
        return Object.entries(params).reduce(
          (str, [k, v]) => str.replace(`{${k}}`, String(v)),
          template
        );
      }
      return template;
    }
    return t(key, params);
  };

  // Category translation helper
  const getCategoryText = (category: string): string => {
    if (disableTranslations || !tEnum) {
      return CATEGORY_ENGLISH_FALLBACK[category] || category;
    }
    return tEnum(category);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Handle auto-opening modal when autoOpenRecord prop is provided
  useEffect(() => {
    if (autoOpenRecord) {
      console.log('🎯 [AUTO-OPEN] Opening modal for record:', autoOpenRecord);
      setSelectedRecord(autoOpenRecord);
      setIsModalOpen(true);

      // Notify parent that auto-open completed
      if (onAutoOpenComplete) {
        onAutoOpenComplete();
      }
    }
  }, [autoOpenRecord, onAutoOpenComplete]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value;
    setSelectedCategory(category);
    onCategoryFilter(category);
  };

  const handleRecordClick = (record: MedicalRecord) => {
    console.log('👆 View button clicked!');
    console.log('📄 Record being viewed:', record);
    console.log('👤 Patient data:', record.patients);
    console.log('🏥 Created by data:', record.created_by);
    console.log('💊 Diagnosis:', record.diagnosis);

    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateText = (text: string | undefined, maxLength: number) => {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={getText('table.search_placeholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">{getText('filters.all_categories')}</option>
            <option value="general">{getCategoryText('general')}</option>
            <option value="healthcard">{getCategoryText('healthcard')}</option>
            <option value="hiv">{getCategoryText('hiv')}</option>
            <option value="pregnancy">{getCategoryText('pregnancy')}</option>
            <option value="immunization">{getCategoryText('immunization')}</option>
            <option value="laboratory">{getCategoryText('laboratory')}</option>
          </select>

          {onCreate && (
            <button
              onClick={onCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-lg hover:bg-primary-teal/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {getText('buttons.create_new')}
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              disabled={totalRecords === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                totalRecords === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              <Download className="w-4 h-4" />
              {getText('buttons.export')}
            </button>
          )}
        </div>
      </div>

      {/* Info Note - Only show for new users with pending work */}
      {!onCreate && pendingAppointmentsCount > 0 && totalRecords === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {getText('info_note')}
          </p>
        </div>
      )}

      {/* Records Count */}
      <div className="text-sm text-gray-600">
        {getText('table.showing_count', { showing: records.length, total: totalRecords })}
      </div>

      {/* Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p className="mt-2 text-gray-500">{getText('table.loading')}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{getText('table.no_records_found')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || selectedCategory !== 'all'
                ? getText('table.no_records_hint')
                : getText('table.no_records_complete_appointments')}
            </p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('table.patient')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('table.date')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('table.category')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('table.diagnosis')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('table.encryption')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('table.created_by')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getText('table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => {
                  const patientName = record.patients?.profiles
                    ? `${record.patients.profiles.first_name} ${record.patients.profiles.last_name}`
                    : 'Unknown';
                  const creatorName = record.created_by
                    ? `${record.created_by.first_name} ${record.created_by.last_name}`
                    : 'Unknown';

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-teal-100">
                            <User className="h-5 w-5 text-teal-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{patientName}</div>
                            <div className="text-sm text-gray-500">{record.patients?.patient_number || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {record.appointments?.appointment_date
                              ? new Date(record.appointments.appointment_date).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                              : formatPhilippineDate(record.created_at, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })
                            }
                          </div>
                          {record.appointments && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
                                Queue #{record.appointments.appointment_number}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <CategoryBadge
                          category={record.category}
                          label={disableTranslations ? CATEGORY_ENGLISH_FALLBACK[record.category] : undefined}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs">
                          {truncateText(record.diagnosis, 60)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <EncryptionBadge
                          isEncrypted={record.is_encrypted}
                          showLabel={false}
                          encryptedLabel={disableTranslations ? 'Encrypted' : undefined}
                          unencryptedLabel={disableTranslations ? 'Unencrypted' : undefined}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {creatorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleRecordClick(record)}
                          className="inline-flex items-center px-3 py-1.5 bg-primary-teal text-white text-xs font-medium rounded-md hover:bg-primary-teal/90 transition-colors"
                        >
                          <Eye className="w-3 h-3 mr-1.5" />
                          {getText('table.view')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getText('pagination.previous')}
                  </button>
                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getText('pagination.next')}
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {getText('pagination.showing_page', { current: currentPage, total: totalPages })}
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details Modal */}
      <MedicalRecordDetailsModal
        record={selectedRecord}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
        }}
        disableTranslations={disableTranslations}
      />
    </div>
  );
}
