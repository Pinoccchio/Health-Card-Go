'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import { Toast, ToastContainer, ToastVariant } from '@/components/ui/Toast';
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  Phone,
  Mail,
  MapPin,
  Heart,
  Droplet,
  FileText,
} from 'lucide-react';
import { PATIENT_STATUS_CONFIG } from '@/lib/constants/colors';

interface Patient {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended';
  contact_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  emergency_contact?: {
    name: string;
    phone: string;
    email?: string;
  };
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  rejection_reason?: string;
  barangay_id?: number;
  barangays?: { id: number; name: string; code: string } | null;
  patients?: {
    patient_number: string;
    allergies?: string[] | null;
    medical_history?: {
      blood_type?: string;
      conditions?: string;
    };
    current_medications?: string[] | null;
  } | null;
}

type PatientStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended';

const statusConfig = PATIENT_STATUS_CONFIG;

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

export default function HealthcareAdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | PatientStatus>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Action dialog state
  const [pendingAction, setPendingAction] = useState<Patient | null>(null);

  // Reset to page 1 when filter changes
  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  // Debounced search effect
  useEffect(() => {
    // Debounce search by 300ms to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      if (currentPage === 1) {
        // If already on page 1, trigger fetch directly
        fetchPatients();
      }
      // Otherwise, the page change will trigger the fetch via the dependency below
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch patients when page or filter changes
  useEffect(() => {
    fetchPatients();
  }, [currentPage, filter]);

  // Toast helper functions
  const showToast = (message: string, variant: ToastVariant) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, variant }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      // Add search query
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Add status filter if not 'all'
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/healthcare-admin/patients?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch patients');
      }

      setPatients(result.data || []);

      // Update pagination metadata
      if (result.pagination) {
        setTotalRecords(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      showToast(err instanceof Error ? err.message : 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  // Note: With pagination and server-side filtering, stats show counts for current page only
  // Total count from API pagination metadata shows all records
  const stats = useMemo(() => {
    const total = totalRecords; // Use total from API instead of current page
    const pending = patients.filter(p => p.status === 'pending').length;
    const active = patients.filter(p => p.status === 'active').length;
    const rejected = patients.filter(p => p.status === 'rejected').length;
    const suspended = patients.filter(p => p.status === 'suspended').length;
    const inactive = patients.filter(p => p.status === 'inactive').length;

    return { total, pending, active, rejected, suspended, inactive };
  }, [patients, totalRecords]);

  const openPatientDrawer = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDrawerOpen(true);
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Contact', 'Status', 'Barangay', 'Registered Date'];
    const rows = patients.map(p => [
      `${p.first_name} ${p.last_name}`,
      p.email,
      p.contact_number || 'N/A',
      p.status,
      p.barangays?.name || 'N/A',
      new Date(p.created_at).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patients-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Enhanced Table columns
  const tableColumns = [
    { accessor: 'patient_number', header: 'Patient #', sortable: true },
    { accessor: 'name', header: 'Name', sortable: true },
    { accessor: 'email', header: 'Email', sortable: true },
    { accessor: 'contact_number', header: 'Contact', sortable: false },
    { accessor: 'barangay', header: 'Barangay', sortable: true },
    { accessor: 'status', header: 'Status', sortable: true },
    { accessor: 'registered', header: 'Registered', sortable: true },
    { accessor: 'actions', header: 'Actions', sortable: false },
  ];

  const tableData = patients.map(patient => {
    const StatusIcon = statusConfig[patient.status as PatientStatus]?.icon || AlertCircle;
    const patientNumber = patient.patients?.patient_number || 'N/A';

    return {
      id: patient.id,
      patient_number: (
        <span className="font-mono text-sm text-gray-700">{patientNumber}</span>
      ),
      name: (
        <div>
          <div className="font-medium text-gray-900">
            {patient.first_name} {patient.last_name}
          </div>
          <div className="text-sm text-gray-500 capitalize">{patient.gender || 'N/A'}</div>
        </div>
      ),
      email: (
        <span className="text-sm text-gray-700">{patient.email}</span>
      ),
      contact_number: (
        <span className="text-sm text-gray-700">{patient.contact_number || 'N/A'}</span>
      ),
      barangay: (
        <span className="text-sm text-gray-700">{patient.barangays?.name || 'N/A'}</span>
      ),
      status: (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[patient.status as PatientStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig[patient.status as PatientStatus]?.label || patient.status}
        </span>
      ),
      registered: (
        <span className="text-sm text-gray-700">
          {new Date(patient.created_at).toLocaleDateString()}
        </span>
      ),
      actions: (
        <button
          onClick={() => openPatientDrawer(patient)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-teal hover:text-primary-teal-dark transition-colors"
        >
          <Eye className="w-4 h-4 mr-1" />
          View Details
        </button>
      ),
      _data: patient,
    };
  });

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Patient Management"
      pageDescription="View and manage patient registrations and accounts"
    >
      <Container size="full">
        {/* Toast Notifications */}
        <ToastContainer>
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              id={toast.id}
              message={toast.message}
              variant={toast.variant}
              onClose={removeToast}
            />
          ))}
        </ToastContainer>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <ProfessionalCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Patients</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-80" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">New Registrations</p>
                <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total}</p>
                <p className="text-xs text-blue-600 mt-1">All Time</p>
              </div>
              <UserPlus className="w-10 h-10 text-blue-500 opacity-80" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Patients</p>
                <p className="text-3xl font-bold text-green-900 mt-2">{stats.active}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500 opacity-80" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard className="bg-gradient-to-br from-red-50 to-red-100 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Rejected</p>
                <p className="text-3xl font-bold text-red-900 mt-2">{stats.rejected}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500 opacity-80" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Suspended</p>
                <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.suspended}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-500 opacity-80" />
            </div>
          </ProfessionalCard>

          <ProfessionalCard className="bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.inactive}</p>
              </div>
              <Users className="w-10 h-10 text-gray-500 opacity-80" />
            </div>
          </ProfessionalCard>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-primary-teal text-white shadow-md ring-2 ring-primary-teal ring-offset-2'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              All ({stats.total})
            </button>
            {/* Pending filter hidden - auto-approval means no pending patients (Task 1.2) */}
            {/* <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-500 ring-offset-2'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
              }`}
            >
              Pending ({stats.pending})
            </button> */}
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'active'
                  ? 'bg-green-500 text-white shadow-md ring-2 ring-green-500 ring-offset-2'
                  : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
              }`}
            >
              Active ({stats.active})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'rejected'
                  ? 'bg-red-500 text-white shadow-md ring-2 ring-red-500 ring-offset-2'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
            >
              Rejected ({stats.rejected})
            </button>
            <button
              onClick={() => setFilter('suspended')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === 'suspended'
                  ? 'bg-yellow-500 text-white shadow-md ring-2 ring-yellow-500 ring-offset-2'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
              }`}
            >
              Suspended ({stats.suspended})
            </button>
          </div>

          <button
            onClick={exportToCSV}
            disabled={patients.length === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-teal disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Enhanced Table */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
              <p className="mt-2 text-sm text-gray-500">Loading patients...</p>
            </div>
          ) : (
            <>
              <EnhancedTable
                columns={tableColumns}
                data={tableData}
                searchable={true}
                searchPlaceholder="Search patients by name, email, or patient number..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                paginated={false}
              />

              {/* Server-Side Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} results
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-2 border rounded-md text-sm font-medium ${
                              currentPage === pageNum
                                ? 'bg-primary-teal text-white border-primary-teal'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Patient Details Drawer */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          size="xl"
          title={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Patient Details'}
          subtitle={selectedPatient ? `Patient #${selectedPatient.patients?.patient_number || 'N/A'}` : undefined}
        >
          {selectedPatient && (
            <div className="p-6">
              <div className="space-y-6">
              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig[selectedPatient.status as PatientStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
                  {(() => {
                    const StatusIcon = statusConfig[selectedPatient.status as PatientStatus]?.icon || AlertCircle;
                    return <StatusIcon className="w-4 h-4 mr-1.5" />;
                  })()}
                  {statusConfig[selectedPatient.status as PatientStatus]?.label || selectedPatient.status}
                </span>
                {selectedPatient.rejection_reason && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                    <p className="text-sm text-red-700 mt-1">{selectedPatient.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900 flex items-center mt-1">
                      <Mail className="w-4 h-4 mr-1.5 text-gray-400" />
                      {selectedPatient.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Contact Number</p>
                    <p className="text-sm font-medium text-gray-900 flex items-center mt-1">
                      <Phone className="w-4 h-4 mr-1.5 text-gray-400" />
                      {selectedPatient.contact_number || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date of Birth</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedPatient.date_of_birth
                        ? new Date(selectedPatient.date_of_birth).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gender</p>
                    <p className="text-sm font-medium text-gray-900 mt-1 capitalize">
                      {selectedPatient.gender || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Registered On</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedPatient.created_at
                        ? new Date(selectedPatient.created_at).toLocaleDateString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Barangay</p>
                    <p className="text-sm font-medium text-gray-900 flex items-center mt-1">
                      <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
                      {selectedPatient.barangays?.name || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              {selectedPatient.emergency_contact && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h3>
                  <div className="bg-gray-50 rounded-md p-3">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {selectedPatient.emergency_contact.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm font-medium text-gray-900 flex items-center mt-1">
                          <Phone className="w-4 h-4 mr-1.5 text-gray-400" />
                          {selectedPatient.emergency_contact.phone}
                        </p>
                      </div>
                      {selectedPatient.emergency_contact.email && (
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium text-gray-900 flex items-center mt-1">
                            <Mail className="w-4 h-4 mr-1.5 text-gray-400" />
                            {selectedPatient.emergency_contact.email}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Medical Information */}
              {(() => {
                // Only show Medical Information section if patient has any medical data
                const hasMedicalData = selectedPatient.patients && (
                  selectedPatient.patients.medical_history?.blood_type ||
                  (selectedPatient.patients.allergies && selectedPatient.patients.allergies.length > 0) ||
                  selectedPatient.patients.medical_history?.conditions ||
                  (selectedPatient.patients.current_medications && selectedPatient.patients.current_medications.length > 0)
                );

                return hasMedicalData ? (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Medical Information</h3>
                    <div className="bg-gray-50 rounded-md p-3 space-y-3">
                      {selectedPatient.patients!.medical_history?.blood_type && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <Droplet className="w-3 h-3 mr-1" />
                            Blood Type
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedPatient.patients!.medical_history.blood_type}
                          </p>
                        </div>
                      )}
                      {selectedPatient.patients!.allergies && selectedPatient.patients!.allergies.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Allergies
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedPatient.patients!.allergies.join(', ')}
                          </p>
                        </div>
                      )}
                      {selectedPatient.patients!.medical_history?.conditions && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            Medical Conditions
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedPatient.patients!.medical_history.conditions}
                          </p>
                        </div>
                      )}
                      {selectedPatient.patients!.current_medications && selectedPatient.patients!.current_medications.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            Current Medications
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {selectedPatient.patients!.current_medications.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}

              </div>
            </div>
          )}
        </Drawer>

      </Container>
    </DashboardLayout>
  );
}
