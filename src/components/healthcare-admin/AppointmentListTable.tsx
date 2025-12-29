'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Appointment {
  id: string;
  appointment_number: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  reason: string;
  patients: {
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
      barangays: {
        name: string;
      };
    };
  };
}

interface AppointmentListTableProps {
  serviceId: number;
  startDate: string;
  endDate: string;
  barangayId?: number;
}

export default function AppointmentListTable({
  serviceId,
  startDate,
  endDate,
  barangayId,
}: AppointmentListTableProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'appointment_date' | 'appointment_number' | 'status'>('appointment_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const supabase = createClient();

        let query = supabase
          .from('appointments')
          .select(`
            id,
            appointment_number,
            appointment_date,
            appointment_time,
            status,
            reason,
            patients!inner (
              patient_number,
              profiles!inner (
                first_name,
                last_name,
                barangays (
                  name
                )
              )
            )
          `)
          .eq('service_id', serviceId)
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);

        if (barangayId) {
          query = query.eq('patients.profiles.barangay_id', barangayId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching appointments:', error);
        } else {
          setAppointments(data as Appointment[]);
          setFilteredAppointments(data as Appointment[]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [serviceId, startDate, endDate, barangayId]);

  // Search and filter
  useEffect(() => {
    let filtered = [...appointments];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter((appt) => {
        const patient = appt.patients as any;
        const patientName = `${patient?.profiles?.first_name || ''} ${patient?.profiles?.last_name || ''}`.toLowerCase();
        const patientNumber = patient?.patient_number?.toLowerCase() || '';
        const barangayName = patient?.profiles?.barangays?.name?.toLowerCase() || '';

        return (
          patientName.includes(searchTerm.toLowerCase()) ||
          patientNumber.includes(searchTerm.toLowerCase()) ||
          barangayName.includes(searchTerm.toLowerCase()) ||
          appt.appointment_number.toString().includes(searchTerm) ||
          appt.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'appointment_date':
          aValue = new Date(a.appointment_date + ' ' + a.appointment_time);
          bValue = new Date(b.appointment_date + ' ' + b.appointment_time);
          break;
        case 'appointment_number':
          aValue = a.appointment_number;
          bValue = b.appointment_number;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.appointment_date;
          bValue = b.appointment_date;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredAppointments(filtered);
    setCurrentPage(1); // Reset to first page when filtering/sorting changes
  }, [searchTerm, sortField, sortDirection, appointments]);

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  const handleSort = (field: 'appointment_date' | 'appointment_number' | 'status') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'checked_in':
        return 'bg-purple-100 text-purple-800';
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
            <h3 className="text-lg font-semibold text-gray-900">Appointments List</h3>
            <p className="text-sm text-gray-600 mt-1">
              {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} found
            </p>
          </div>
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by patient name, number, barangay, or status..."
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
                onClick={() => handleSort('appointment_number')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Appt #
                {sortField === 'appointment_number' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th
                onClick={() => handleSort('appointment_date')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Date & Time
                {sortField === 'appointment_date' && (
                  <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient Name
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentAppointments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? 'No appointments match your search criteria.' : 'No appointments found for the selected date range.'}
                </td>
              </tr>
            ) : (
              currentAppointments.map((appt) => {
                const patient = appt.patients as any;
                const patientProfile = patient?.profiles;
                const barangay = patientProfile?.barangays as any;

                return (
                  <tr key={appt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {appt.appointment_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(appt.appointment_date).toLocaleDateString()}
                      <br />
                      <span className="text-gray-500">{appt.appointment_time}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patient?.patient_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {patientProfile?.first_name} {patientProfile?.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {barangay?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(appt.status)}`}>
                        {appt.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {appt.reason || 'N/A'}
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
            Showing {startIndex + 1} to {Math.min(endIndex, filteredAppointments.length)} of{' '}
            {filteredAppointments.length} results
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
