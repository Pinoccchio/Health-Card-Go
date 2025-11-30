'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { QuickFilters } from '@/components/ui/QuickFilters';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import MedicalRecordViewer from '@/components/medical-records/MedicalRecordViewer';
import { MedicalRecord } from '@/types/medical-records';
import { getTemplate } from '@/lib/config/medicalRecordTemplates';
import { FileText, Heart, AlertCircle, Baby, Syringe, Download, Calendar, User, Eye, Lock } from 'lucide-react';

export default function DoctorMedicalRecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [quickFilter, setQuickFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [patientFilter, setPatientFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Fetch medical records
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await fetch('/api/medical-records');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch medical records');
        }

        setRecords(data.data || []);
      } catch (err: any) {
        console.error('Error fetching records:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  // Get unique patients for filter dropdown
  const uniquePatients = useMemo(() => {
    const patientMap = new Map();
    records.forEach(record => {
      if (record.patients && !patientMap.has(record.patients.id)) {
        patientMap.set(record.patients.id, {
          id: record.patients.id,
          name: `${record.patients.profiles.first_name} ${record.patients.profiles.last_name}`,
          number: record.patients.patient_number,
        });
      }
    });
    return Array.from(patientMap.values());
  }, [records]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const categoryCount: Record<string, number> = {
      general: 0,
      healthcard: 0,
      hiv: 0,
      pregnancy: 0,
      immunization: 0,
    };

    records.forEach(record => {
      if (categoryCount.hasOwnProperty(record.category)) {
        categoryCount[record.category]++;
      }
    });

    const lastCreated = records.length > 0
      ? new Date(Math.max(...records.map(r => new Date(r.created_at).getTime())))
      : null;

    return {
      total: records.length,
      byCategory: categoryCount,
      lastCreated,
    };
  }, [records]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    // Quick filter (category-based)
    if (quickFilter !== 'all') {
      const categoryMap: Record<string, string> = {
        'general': 'general',
        'healthcard': 'healthcard',
        'hiv': 'hiv',
        'pregnancy': 'pregnancy',
        'immunization': 'immunization',
      };
      const category = categoryMap[quickFilter];
      if (category) {
        filtered = filtered.filter(r => r.category === category);
      }
    }

    // Category filter (from dropdown)
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    // Template type filter
    if (templateFilter !== 'all') {
      filtered = filtered.filter(r => r.template_type === templateFilter);
    }

    // Patient filter
    if (patientFilter !== 'all') {
      filtered = filtered.filter(r => r.patients?.id === patientFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(r => new Date(r.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999); // Include entire end date
      filtered = filtered.filter(r => new Date(r.created_at) <= endDate);
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [records, quickFilter, categoryFilter, templateFilter, patientFilter, dateFrom, dateTo, sortOrder]);

  // Clear all filters
  const handleClearFilters = () => {
    setQuickFilter('all');
    setCategoryFilter('all');
    setTemplateFilter('all');
    setPatientFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortOrder('newest');
  };

  // Check if any filters are active
  const hasActiveFilters = quickFilter !== 'all' || categoryFilter !== 'all' || templateFilter !== 'all' ||
    patientFilter !== 'all' || dateFrom !== '' || dateTo !== '';

  // Handle view details
  const handleViewDetails = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailModalOpen(false);
    // Keep selectedRecord for a moment to allow smooth closing animation
    setTimeout(() => setSelectedRecord(null), 300);
  };

  // Get category badge component
  const getCategoryBadge = (category: string) => {
    const categoryStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      general: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Heart className="w-3 h-3" /> },
      healthcard: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <FileText className="w-3 h-3" /> },
      hiv: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertCircle className="w-3 h-3" /> },
      pregnancy: { bg: 'bg-pink-100', text: 'text-pink-800', icon: <Baby className="w-3 h-3" /> },
      immunization: { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Syringe className="w-3 h-3" /> },
    };

    const style = categoryStyles[category] || categoryStyles.general;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.icon}
        {category}
      </span>
    );
  };

  // Enhanced Table columns
  const tableColumns = [
    {
      header: 'Date Created',
      accessor: 'created_at',
      sortable: true,
      render: (value: string) => {
        const date = new Date(value);
        return (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-xs text-gray-500">
                {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Patient',
      accessor: 'patient_name',
      sortable: true,
      render: (_: any, row: MedicalRecord) => {
        if (!row.patients) return '-';
        const fullName = `${row.patients.profiles.first_name} ${row.patients.profiles.last_name}`;
        return (
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <div>
              <div className="font-medium text-gray-900">{fullName}</div>
              <div className="text-xs text-gray-500">{row.patients.patient_number}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Template Type',
      accessor: 'template_type',
      sortable: true,
      render: (value: string) => {
        const template = getTemplate(value as any);
        return (
          <div className="flex items-center gap-2">
            {template.requiresEncryption && <Lock className="w-4 h-4 text-yellow-600" />}
            <span className="text-sm text-gray-900">{template.name}</span>
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
      accessor: 'id',
      render: (_: any, row: MedicalRecord) => (
        <Button
          size="sm"
          variant="primary"
          icon={Eye}
          onClick={() => handleViewDetails(row)}
        >
          View Details
        </Button>
      ),
    },
  ];

  // Export function (placeholder)
  const handleExport = () => {
    // TODO: Implement CSV/PDF export
    console.log('Exporting records...', filteredRecords);
  };

  return (
    <DashboardLayout
      roleId={3}
      pageTitle="Medical Records"
      pageDescription="View and manage medical records you've created"
    >
      <Container size="full">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading medical records...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="w-16 h-16 text-red-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Records</h2>
            <p className="text-red-700">{error}</p>
          </div>
        ) : (
          <>
            {/* Gradient Statistics Cards */}
            {records.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                {/* Total Records */}
                <ProfessionalCard variant="flat" padding="none" className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-500">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Records</p>
                        <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                      </div>
                      <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                        <FileText className="w-6 h-6 text-white" />
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

                {/* HealthCard */}
                <ProfessionalCard variant="flat" padding="none" className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-l-4 border-emerald-500">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">HealthCard</p>
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
              </div>
            )}

            {/* Quick Filters */}
            {records.length > 0 && (
              <div className="mb-6">
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
                  }}
                />
              </div>
            )}

            {records.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Medical Records Yet</h3>
                <p className="text-gray-600 mb-4">You haven't created any medical records yet. Create your first one from the appointments page.</p>
                <Button variant="primary" onClick={() => router.push('/doctor/appointments')}>
                  Go to Appointments
                </Button>
              </div>
            ) : (
              <>
                {/* Horizontal Filter Bar */}
                <ProfessionalCard variant="flat" className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
                    <div className="flex items-center gap-2">
                      {hasActiveFilters && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearFilters}
                        >
                          Clear All
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push('/doctor/appointments')}
                      >
                        Create New Record
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Category Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-primary-teal text-sm"
                      >
                        <option value="all">All Categories</option>
                        <option value="general">General</option>
                        <option value="healthcard">Healthcard</option>
                        <option value="hiv">HIV</option>
                        <option value="pregnancy">Pregnancy</option>
                        <option value="immunization">Immunization</option>
                      </select>
                    </div>

                    {/* Template Type Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Template Type</label>
                      <select
                        value={templateFilter}
                        onChange={(e) => setTemplateFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-primary-teal text-sm"
                      >
                        <option value="all">All Templates</option>
                        <option value="general_checkup">General Checkup</option>
                        <option value="immunization">Immunization</option>
                        <option value="prenatal">Prenatal</option>
                        <option value="hiv">HIV</option>
                        <option value="laboratory">Laboratory</option>
                      </select>
                    </div>

                    {/* Patient Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Patient</label>
                      <select
                        value={patientFilter}
                        onChange={(e) => setPatientFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-primary-teal text-sm"
                      >
                        <option value="all">All Patients ({uniquePatients.length})</option>
                        {uniquePatients.map(patient => (
                          <option key={patient.id} value={patient.id}>
                            {patient.name} ({patient.number})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date From */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-primary-teal text-sm"
                      />
                    </div>

                    {/* Date To */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-primary-teal text-sm"
                      />
                    </div>
                  </div>
                </ProfessionalCard>

                {/* Enhanced Table */}
                <EnhancedTable
                  columns={tableColumns}
                  data={filteredRecords}
                  searchable
                  searchPlaceholder="Search by patient name, template, or category..."
                  paginated
                  pageSize={15}
                  onExport={handleExport}
                  exportLabel="Export Records"
                />
              </>
            )}

            {/* Drawer for Record Details */}
            {selectedRecord && (
              <Drawer
                isOpen={isDetailModalOpen}
                onClose={handleCloseModal}
                size="xl"
                title={getTemplate(selectedRecord.template_type as any).name}
                subtitle={getTemplate(selectedRecord.template_type as any).description}
                metadata={{
                  createdOn: new Date(selectedRecord.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) + ' at ' + new Date(selectedRecord.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  doctor: selectedRecord.doctors
                    ? `Dr. ${selectedRecord.doctors.profiles.first_name} ${selectedRecord.doctors.profiles.last_name}${
                        selectedRecord.doctors.specialization
                          ? ` (${selectedRecord.doctors.specialization})`
                          : ' (General Practitioner)'
                      }`
                    : 'N/A',
                }}
              >
                <MedicalRecordViewer record={selectedRecord} />
              </Drawer>
            )}
          </>
        )}
      </Container>
    </DashboardLayout>
  );
}
