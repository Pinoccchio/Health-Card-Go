'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { FileText, AlertTriangle, TrendingUp, Clock, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { canAccessMedicalRecords } from '@/lib/utils/serviceAccessGuard';
import { useToast } from '@/lib/contexts/ToastContext';
import { MedicalRecordsList } from '@/components/medical-records/MedicalRecordsList';
import { CreateMedicalRecordModal } from '@/components/medical-records/CreateMedicalRecordModal';

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
  };
}

interface Stats {
  total: number;
  thisMonth: number;
  encrypted: number;
  byCategory: Record<string, number>;
}

export default function HealthcareAdminMedicalRecordsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [serviceDetails, setServiceDetails] = useState<{ requires_appointment: boolean } | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    thisMonth: 0,
    encrypted: 0,
    byCategory: {},
  });
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 20;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Check if user has access to medical records
  useEffect(() => {
    async function checkAccess() {
      if (!user?.assigned_service_id) {
        toast.error('No service assigned to your account');
        router.push('/healthcare-admin/dashboard');
        return;
      }

      const canAccess = await canAccessMedicalRecords(user.assigned_service_id);

      if (!canAccess) {
        toast.error('Your assigned service does not require medical records');
        router.push('/healthcare-admin/dashboard');
        return;
      }

      // Fetch service details to check if it's appointment-based or walk-in
      try {
        const serviceResponse = await fetch(`/api/services/${user.assigned_service_id}`);
        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json();
          setServiceDetails(serviceData);
        }
      } catch (error) {
        console.error('Failed to fetch service details:', error);
      }

      setHasAccess(true);
      setIsCheckingAccess(false);
    }

    checkAccess();
  }, [user?.assigned_service_id, router, toast]);

  // Fetch medical records
  useEffect(() => {
    if (!hasAccess) return;

    async function fetchRecords() {
      try {
        setIsLoading(true);

        // Build query params
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

        if (!response.ok) {
          throw new Error('Failed to fetch medical records');
        }

        const data = await response.json();

        console.log('📊 API Response:', data);
        console.log('📋 Records received:', data.records);
        console.log('🔍 First record details:', data.records?.[0]);

        setRecords(data.records || []);
        setTotalRecords(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));

        // Calculate stats
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const allRecords = data.records || [];
        const thisMonthCount = allRecords.filter((r: MedicalRecord) =>
          new Date(r.created_at) >= thisMonthStart
        ).length;

        const encryptedCount = allRecords.filter((r: MedicalRecord) => r.is_encrypted).length;

        const byCategory = allRecords.reduce((acc: Record<string, number>, r: MedicalRecord) => {
          acc[r.category] = (acc[r.category] || 0) + 1;
          return acc;
        }, {});

        setStats({
          total: data.total || 0,
          thisMonth: thisMonthCount,
          encrypted: encryptedCount,
          byCategory,
        });

      } catch (error) {
        console.error('Error fetching medical records:', error);
        toast.error('Failed to load medical records');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecords();
  }, [hasAccess, currentPage, searchQuery, categoryFilter, toast]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleCategoryFilter = (category: string) => {
    setCategoryFilter(category);
    setCurrentPage(1); // Reset to first page on new filter
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleExport = async () => {
    try {
      toast.info('Exporting medical records...');

      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }

      const response = await fetch(`/api/medical-records/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical-records-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Medical records exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export medical records');
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    // Refetch records to include the new one
    setCurrentPage(1); // Reset to first page
    // The useEffect will automatically refetch when currentPage changes
  };

  // Show loading state while checking access
  if (isCheckingAccess) {
    return (
      <DashboardLayout roleId={2} pageTitle="Medical Records" pageDescription="Loading...">
        <Container size="full">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-teal"></div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  // If no access, show error (will redirect, but show this temporarily)
  if (!hasAccess) {
    return (
      <DashboardLayout roleId={2} pageTitle="Access Denied" pageDescription="Redirecting...">
        <Container size="full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              Your assigned service does not require medical records. Redirecting to dashboard...
            </p>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Medical Records"
      pageDescription="View and manage medical records for your assigned service"
    >
      <Container size="full">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="h-12 w-12 bg-teal-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.thisMonth}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Encrypted</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.encrypted}</p>
              </div>
              <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Object.keys(stats.byCategory).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Medical Records List */}
        <MedicalRecordsList
          records={records}
          isLoading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          onCategoryFilter={handleCategoryFilter}
          onExport={handleExport}
          onCreate={
            serviceDetails && !serviceDetails.requires_appointment
              ? () => setShowCreateModal(true)
              : undefined
          }
        />

        {/* Create Medical Record Modal */}
        <CreateMedicalRecordModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      </Container>
    </DashboardLayout>
  );
}
