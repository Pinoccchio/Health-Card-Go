'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Download,
  Search,
} from 'lucide-react';

interface AdminAppointment {
  id: string;
  appointment_number: number;
  appointment_date: string;
  appointment_time: string;
  status: 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  reason?: string;
  patients: {
    patient_number: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
      contact_number?: string;
      barangays?: {
        name: string;
      };
    };
  };
  doctors?: {
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
}

interface Stats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

const statusConfig = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  checked_in: { label: 'Checked In', color: 'bg-purple-100 text-purple-800' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
  no_show: { label: 'No Show', color: 'bg-red-100 text-red-800' },
};

export default function HealthcareAdminAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, scheduled: 0, completed: 0, cancelled: 0, noShow: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [dateFilter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = '/api/appointments';

      if (dateFilter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        url += `?date=${today}`;
      } else if (dateFilter === 'week') {
        // Fetch this week's appointments (implement date range in API if needed)
        const today = new Date().toISOString().split('T')[0];
        url += `?date=${today}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const allAppointments = data.data || [];
        setAppointments(allAppointments);

        // Calculate stats
        const newStats = {
          total: allAppointments.length,
          scheduled: allAppointments.filter((a: AdminAppointment) => a.status === 'scheduled').length,
          completed: allAppointments.filter((a: AdminAppointment) => a.status === 'completed').length,
          cancelled: allAppointments.filter((a: AdminAppointment) => a.status === 'cancelled').length,
          noShow: allAppointments.filter((a: AdminAppointment) => a.status === 'no_show').length,
        };
        setStats(newStats);
      } else {
        setError(data.error || 'Failed to load appointments');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    const matchesSearch = searchQuery === '' ||
      apt.patients.profiles.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patients.profiles.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patients.patient_number.includes(searchQuery) ||
      apt.appointment_number.toString().includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  const StatusBadge = ({ status }: { status: AdminAppointment['status'] }) => {
    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Queue #', 'Patient Name', 'Patient #', 'Date', 'Time', 'Status', 'Doctor', 'Reason'];
    const rows = filteredAppointments.map(apt => [
      apt.appointment_number,
      `${apt.patients.profiles.first_name} ${apt.patients.profiles.last_name}`,
      apt.patients.patient_number,
      apt.appointment_date,
      apt.appointment_time,
      apt.status,
      apt.doctors ? `Dr. ${apt.doctors.profiles.first_name} ${apt.doctors.profiles.last_name}` : 'Unassigned',
      apt.reason || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointments_${dateFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Appointments"
      pageDescription="Manage and monitor all appointments"
    >
      <Container size="full">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">Total</p>
              <Calendar className="w-6 h-6 text-primary-teal" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">Scheduled</p>
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">Completed</p>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">Cancelled</p>
              <XCircle className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-600">No Show</p>
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.noShow}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-gray-400" />
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Period:</label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  >
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  >
                    <option value="all">All</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="checked_in">Checked In</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search patients or queue #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  />
                </div>
                <button
                  onClick={exportToCSV}
                  disabled={filteredAppointments.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 text-sm font-medium disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
              <p className="mt-2 text-sm text-gray-500">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Queue #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-semibold text-primary-teal">
                          #{appointment.appointment_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {appointment.patients.profiles.first_name} {appointment.patients.profiles.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{appointment.patients.patient_number}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{formatDate(appointment.appointment_date)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{formatTime(appointment.appointment_time)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={appointment.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {appointment.doctors ? (
                          <span className="text-sm text-gray-700">
                            Dr. {appointment.doctors.profiles.first_name} {appointment.doctors.profiles.last_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700 line-clamp-2">
                          {appointment.reason || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600">No appointments match your current filters.</p>
            </div>
          )}
        </div>
      </Container>
    </DashboardLayout>
  );
}
