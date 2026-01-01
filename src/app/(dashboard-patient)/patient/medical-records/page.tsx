'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { MedicalRecordsList } from '@/components/medical-records/MedicalRecordsList';
import { FileText, Lock, Calendar, TrendingUp, Shield } from 'lucide-react';
import Link from 'next/link';

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

interface ApiResponse {
  success: boolean;
  records: MedicalRecord[];
  total: number;
  has_records: boolean;
  error?: string;
}

export default function PatientMedicalRecordsPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Statistics
  const [totalCount, setTotalCount] = useState(0);
  const [thisMonthCount, setThisMonthCount] = useState(0);
  const [encryptedCount, setEncryptedCount] = useState(0);
  const [lastRecordDate, setLastRecordDate] = useState<string | null>(null);

  const itemsPerPage = 20;
  const totalPages = Math.ceil(totalRecords / itemsPerPage);

  // Fetch medical records
  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      if (categoryFilter && categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      const response = await fetch(`/api/medical-records?${params.toString()}`);
      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch medical records');
      }

      if (data.success) {
        setRecords(data.records || []);
        setTotalRecords(data.total || 0);

        // Calculate statistics only on initial load or when filters change
        if (currentPage === 1) {
          calculateStatistics(data.records || []);
        }
      } else {
        throw new Error(data.error || 'Failed to load medical records');
      }
    } catch (err) {
      console.error('Error fetching medical records:', err);
      setError(err instanceof Error ? err.message : 'Failed to load medical records');
      setRecords([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate statistics from all records
  const calculateStatistics = (allRecords: MedicalRecord[]) => {
    setTotalCount(allRecords.length);

    // Count encrypted records
    const encrypted = allRecords.filter(r => r.is_encrypted).length;
    setEncryptedCount(encrypted);

    // Count records from this month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thisMonth = allRecords.filter(r => {
      const recordDate = new Date(r.created_at);
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
    }).length;
    setThisMonthCount(thisMonth);

    // Get last record date
    if (allRecords.length > 0) {
      const sortedByDate = [...allRecords].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setLastRecordDate(sortedByDate[0].created_at);
    } else {
      setLastRecordDate(null);
    }
  };

  // Fetch records on mount and when dependencies change
  useEffect(() => {
    fetchRecords();
  }, [currentPage, searchQuery, categoryFilter]);

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  };

  // Handle category filter
  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout
      roleId={4}
      pageTitle="My Medical Records"
      pageDescription="View your complete medical history and health records"
    >
      <Container size="full">
        <div className="space-y-6">
          {/* Statistics Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Records - Teal */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-l-4 border-teal-500 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Records</p>
                    <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* This Month - Blue */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">This Month</p>
                    <p className="text-3xl font-bold text-gray-900">{thisMonthCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Encrypted Records - Purple */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Encrypted</p>
                    <p className="text-3xl font-bold text-gray-900">{encryptedCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Sensitive health data protected</p>
              </div>

              {/* Last Record Date - Orange */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Last Record</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {lastRecordDate ? formatDate(lastRecordDate) : 'No records yet'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Empty State with Call-to-Action */}
          {!isLoading && totalRecords === 0 && !searchQuery && categoryFilter === 'all' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <div className="text-center max-w-md mx-auto">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-teal-100 mb-4">
                  <FileText className="h-8 w-8 text-teal-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Medical Records Yet</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Medical records are automatically created when healthcare staff complete your appointments.
                  Book an appointment to start building your health history.
                </p>
                <Link
                  href="/patient/book-appointment"
                  className="inline-flex items-center px-4 py-2 bg-primary-teal text-white rounded-lg hover:bg-primary-teal/90 transition-colors"
                >
                  Book an Appointment
                </Link>
              </div>
            </div>
          )}

          {/* Medical Records List */}
          {(totalRecords > 0 || searchQuery || categoryFilter !== 'all') && (
            <MedicalRecordsList
              records={records}
              isLoading={isLoading}
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              pendingAppointmentsCount={0}
              onPageChange={handlePageChange}
              onSearch={handleSearch}
              onCategoryFilter={handleCategoryFilter}
              onCreate={undefined} // Patients cannot create records
              onExport={undefined} // Optional: could add export functionality later
            />
          )}
        </div>
      </Container>
    </DashboardLayout>
  );
}
