'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { QuickFilters } from '@/components/ui/QuickFilters';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import MedicalRecordViewer from '@/components/medical-records/MedicalRecordViewer';
import { MedicalRecord } from '@/types/medical-records';
import { getTemplate } from '@/lib/config/medicalRecordTemplates';
import {
  FileText,
  Heart,
  AlertCircle,
  Baby,
  Syringe,
  Lock,
  Calendar,
  Eye,
  Briefcase,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  FileSearch,
} from 'lucide-react';

export default function PatientMedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [quickFilter, setQuickFilter] = useState<string>('all');

  // Fetch medical records
  const fetchRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/medical-records');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch medical records');
      }

      setRecords(data.records || []);
    } catch (err: any) {
      console.error('Error fetching records:', err);
      setError(err.message || 'Failed to load medical records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Calculate statistics
  const statistics = useMemo(() => {
    const categoryCount: Record<string, number> = {
      general: 0,
      healthcard: 0,
      hiv: 0,
      pregnancy: 0,
      immunization: 0,
      laboratory: 0,
    };

    records.forEach(record => {
      if (categoryCount.hasOwnProperty(record.category)) {
        categoryCount[record.category]++;
      }
    });

    return {
      total: records.length,
      byCategory: categoryCount,
    };
  }, [records]);

  // Apply quick filter
  const filteredRecords = useMemo(() => {
    if (quickFilter === 'all') {
      return records;
    }
    return records.filter(r => r.category === quickFilter);
  }, [records, quickFilter]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  // Category badge renderer
  const getCategoryBadge = (category: string) => {
    const categoryStyles: Record<string, { bg: string; text: string; icon: JSX.Element; label: string }> = {
      general: {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: <Heart className="w-3 h-3" />,
        label: 'General',
      },
      healthcard: {
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        icon: <FileText className="w-3 h-3" />,
        label: 'Healthcard',
      },
      hiv: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: <AlertCircle className="w-3 h-3" />,
        label: 'HIV',
      },
      pregnancy: {
        bg: 'bg-pink-100',
        text: 'text-pink-800',
        icon: <Baby className="w-3 h-3" />,
        label: 'Pregnancy',
      },
      immunization: {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        icon: <Syringe className="w-3 h-3" />,
        label: 'Immunization',
      },
      laboratory: {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        icon: <Briefcase className="w-3 h-3" />,
        label: 'Laboratory',
      },
    };

    const style = categoryStyles[category] || categoryStyles.general;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        <span className="ml-1.5">{style.label}</span>
      </span>
    );
  };

  // Handle view details
  const handleViewDetails = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRecord(null);
  };

  // Define table columns
  const tableColumns = [
    {
      header: 'Date Created',
      accessor: 'created_at',
      sortable: true,
      render: (value: string) => {
        const { date, time } = formatDateTime(value);
        return (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <div className="font-medium text-gray-900">{date}</div>
              <div className="text-xs text-gray-500">{time}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Service',
      accessor: 'service',
      sortable: false,
      render: (_: any, row: MedicalRecord) => (
        <div className="text-sm">
          {row.appointments?.services ? (
            <>
              <div className="font-medium text-gray-900">{row.appointments.services.name}</div>
              <div className="text-xs text-gray-500 capitalize">{row.appointments.services.category}</div>
            </>
          ) : (
            <span className="text-gray-400 italic">Walk-in visit</span>
          )}
        </div>
      ),
    },
    {
      header: 'Template Type',
      accessor: 'template_type',
      sortable: true,
      render: (value: string, row: MedicalRecord) => {
        const template = getTemplate(value as any);
        if (!template) {
          return (
            <div className="text-sm text-gray-500">
              {value || 'Unknown'}
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-sm">
            {template.requiresEncryption && <Lock className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
            <div>
              <div className="font-medium text-gray-900">{template.name}</div>
              <div className="text-xs text-gray-500">{template.description}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Category',
      accessor: 'category',
      sortable: true,
      render: (value: string) => getCategoryBadge(value),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (_: any, row: MedicalRecord) => {
        const hasDecryptionError = (row as any).decryption_failed;

        return (
          <div className="flex items-center gap-2">
            {hasDecryptionError && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800" title="Unable to decrypt this record">
                <ShieldAlert className="w-3 h-3 mr-1" />
                Encrypted
              </span>
            )}
            <button
              onClick={() => handleViewDetails(row)}
              disabled={hasDecryptionError}
              className={`inline-flex items-center px-3 py-1.5 text-white text-xs font-medium rounded-md transition-colors ${
                hasDecryptionError
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#20C997] hover:bg-[#1AA179]'
              }`}
              aria-label={hasDecryptionError ? 'Record cannot be decrypted' : 'View record details'}
            >
              <Eye className="w-3 h-3 mr-1.5" />
              View Details
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="My Medical Records"
      pageDescription="View your complete medical history"
    >
      <Container size="full">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <button
                onClick={fetchRecords}
                className="inline-flex items-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                aria-label="Retry loading records"
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            {/* Skeleton Loading for Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-12"></div>
                </div>
              ))}
            </div>

            {/* Skeleton Loading for Filters */}
            <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>

            {/* Skeleton Loading for Table */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No Medical Records Yet"
            description="You don't have any medical records in our system yet. Medical records are created when you complete a healthcare appointment."
            actionLabel="Book an Appointment"
            actionHref="/patient/book-appointment"
          />
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
              {/* Total Records */}
              <ProfessionalCard variant="flat" padding="none" className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-500">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Records</p>
                      <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                    </div>
                    <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                      <ListChecks className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </ProfessionalCard>

              {/* General */}
              <ProfessionalCard variant="flat" padding="none" className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">General</p>
                      <p className="text-3xl font-bold text-gray-900">{statistics.byCategory.general}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </ProfessionalCard>

              {/* Healthcard */}
              <ProfessionalCard variant="flat" padding="none" className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-l-4 border-emerald-500">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Healthcard</p>
                      <p className="text-3xl font-bold text-gray-900">{statistics.byCategory.healthcard}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </ProfessionalCard>

              {/* HIV */}
              <ProfessionalCard variant="flat" padding="none" className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">HIV</p>
                      <p className="text-3xl font-bold text-gray-900">{statistics.byCategory.hiv}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </ProfessionalCard>

              {/* Pregnancy */}
              <ProfessionalCard variant="flat" padding="none" className="bg-gradient-to-br from-pink-50 to-pink-100 border-l-4 border-pink-500">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Pregnancy</p>
                      <p className="text-3xl font-bold text-gray-900">{statistics.byCategory.pregnancy}</p>
                    </div>
                    <div className="w-12 h-12 bg-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Baby className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </ProfessionalCard>

              {/* Immunization */}
              <ProfessionalCard variant="flat" padding="none" className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Immunization</p>
                      <p className="text-3xl font-bold text-gray-900">{statistics.byCategory.immunization}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Syringe className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </ProfessionalCard>

              {/* Laboratory */}
              <ProfessionalCard variant="flat" padding="none" className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-l-4 border-indigo-500">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Laboratory</p>
                      <p className="text-3xl font-bold text-gray-900">{statistics.byCategory.laboratory}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </ProfessionalCard>
            </div>

            {/* Quick Filters */}
            <QuickFilters
              activeFilter={quickFilter}
              onChange={setQuickFilter}
              counts={{
                all: statistics.total,
                general: statistics.byCategory.general,
                healthcard: statistics.byCategory.healthcard,
                hiv: statistics.byCategory.hiv,
                pregnancy: statistics.byCategory.pregnancy,
                immunization: statistics.byCategory.immunization,
                laboratory: statistics.byCategory.laboratory,
              }}
            />

            {/* Enhanced Table */}
            <div className="mt-6">
              <EnhancedTable
                columns={tableColumns}
                data={filteredRecords}
                searchable
                searchPlaceholder="Search by service, template type, or category..."
                paginated
                pageSize={15}
              />
            </div>
          </>
        )}

        {/* Drawer for Record Details */}
        {selectedRecord && (() => {
          const template = getTemplate(selectedRecord.template_type as any);
          return (
            <Drawer
              isOpen={isDetailModalOpen}
              onClose={handleCloseModal}
              size="xl"
              title={template?.name || selectedRecord.template_type || 'Medical Record'}
              subtitle={template?.description || 'Medical record details'}
              metadata={{
                createdOn: `${formatDate(selectedRecord.created_at)}`,
              }}
            >
              <MedicalRecordViewer record={selectedRecord} />
            </Drawer>
          );
        })()}
      </Container>
    </DashboardLayout>
  );
}
