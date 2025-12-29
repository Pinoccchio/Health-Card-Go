'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  status: string;
  date_of_birth: string;
  gender: string;
  patients: {
    patient_number: string;
  };
  barangays: {
    name: string;
  };
}

interface PatientListTableProps {
  serviceId: number;
  requiresAppointment: boolean;
  requiresMedicalRecord: boolean;
  startDate: string;
  endDate: string;
  barangayId?: number;
}

export default function PatientListTable({
  serviceId,
  requiresAppointment,
  requiresMedicalRecord,
  startDate,
  endDate,
  barangayId,
}: PatientListTableProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'patient_number' | 'name' | 'status'>('patient_number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        // Get patient IDs based on service type
        let patientIds: string[] = [];

        if (requiresAppointment) {
          // Pattern 1 & 2: Get from appointments
          let appointmentsQuery = supabase
            .from('appointments')
            .select('patient_id')
            .eq('service_id', serviceId)
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate);

          const { data: appointments } = await appointmentsQuery;
          patientIds = [...new Set(appointments?.map(a => a.patient_id) || [])];
        } else if (requiresMedicalRecord) {
          // Pattern 3: Get from medical records
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          let medRecordsQuery = supabase
            .from('medical_records')
            .select('patient_id')
            .eq('created_by_id', user.id)
            .gte('created_at', startDate)
            .lte('created_at', `${endDate}T23:59:59`);

          const { data: medRecords } = await medRecordsQuery;
          patientIds = [...new Set(medRecords?.map(m => m.patient_id) || [])];
        } else {
          // Pattern 4: All active patients (education seminar)
          const { data: allPatients } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'patient')
            .eq('status', 'active');

          patientIds = allPatients?.map(p => p.id) || [];
        }

        if (patientIds.length > 0) {
          // For Patterns 1, 2, 3: patientIds are from patients table (patients.id)
          // For Pattern 4: patientIds are from profiles table (profiles.id/user_id)
          // We need to convert patient_ids → user_ids for Patterns 1, 2, 3
          let userIds = patientIds;

          if (requiresAppointment || requiresMedicalRecord) {
            // Convert patient_id → user_id
            const { data: patientRecords } = await supabase
              .from('patients')
              .select('id, user_id')
              .in('id', patientIds);

            userIds = patientRecords?.map(p => p.user_id) || [];
          }

          let patientsQuery = supabase
            .from('profiles')
            .select(`
              id,
              first_name,
              last_name,
              email,
              contact_number,
              status,
              date_of_birth,
              gender,
              patients!inner (
                patient_number
              ),
              barangays (
                name
              )
            `)
            .in('id', userIds)
            .eq('role', 'patient');

          if (barangayId) {
            patientsQuery = patientsQuery.eq('barangay_id', barangayId);
          }

          const { data, error } = await patientsQuery;

          if (error) {
            console.error('Error fetching patients:', error);
          } else {
            setPatients(data as Patient[]);
            setFilteredPatients(data as Patient[]);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [serviceId, requiresAppointment, requiresMedicalRecord, startDate, endDate, barangayId]);

  // Search and filter
  useEffect(() => {
    let filtered = [...patients];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter((patient) => {
        const patientData = patient.patients as any;
        const barangay = patient.barangays as any;
        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
        const patientNumber = patientData?.patient_number?.toLowerCase() || '';
        const email = patient.email.toLowerCase();
        const barangayName = barangay?.name?.toLowerCase() || '';

        return (
          fullName.includes(searchTerm.toLowerCase()) ||
          patientNumber.includes(searchTerm.toLowerCase()) ||
          email.includes(searchTerm.toLowerCase()) ||
          barangayName.includes(searchTerm.toLowerCase()) ||
          patient.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'patient_number':
          aValue = (a.patients as any)?.patient_number || '';
          bValue = (b.patients as any)?.patient_number || '';
          break;
        case 'name':
          aValue = `${a.first_name} ${a.last_name}`;
          bValue = `${b.first_name} ${b.last_name}`;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = (a.patients as any)?.patient_number || '';
          bValue = (b.patients as any)?.patient_number || '';
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredPatients(filtered);
    setCurrentPage(1); // Reset to first page when filtering/sorting changes
  }, [searchTerm, sortField, sortDirection, patients]);

  // Pagination
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPatients = filteredPatients.slice(startIndex, endIndex);

  const handleSort = (field: 'patient_number' | 'name' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Patients List</h3>
            <p className="text-sm text-gray-600 mt-1">
              {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'} found
            </p>
          </div>
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name, patient #, email, or barangay..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                onClick={() => handleSort('patient_number')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Patient #
                {sortField === 'patient_number' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                onClick={() => handleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Name
                {sortField === 'name' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date of Birth
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Barangay
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Status
                {sortField === 'status' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentPatients.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? 'No patients match your search criteria.' : 'No patients found for the selected filters.'}
                </td>
              </tr>
            ) : (
              currentPatients.map((patient) => {
                const patientData = patient.patients as any;
                const barangay = patient.barangays as any;

                return (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {patientData?.patient_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.first_name} {patient.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.contact_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient.gender || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barangay?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(patient.status)}`}>
                        {patient.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredPatients.length)} of{' '}
            {filteredPatients.length} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 border rounded-md text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
