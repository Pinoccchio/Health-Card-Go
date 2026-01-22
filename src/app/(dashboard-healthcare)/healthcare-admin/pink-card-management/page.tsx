'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ConfirmDialog } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/auth';
import {
  CreditCard,
  Filter,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
  MapPin,
  TrendingUp,
} from 'lucide-react';

interface PinkCardStatistic {
  id: string;
  healthcard_type: 'pink';
  record_date: string;
  cards_issued: number;
  barangay_id: number | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  barangays?: {
    id: number;
    name: string;
    code: string;
  } | null;
  profiles?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  } | null;
}

interface Appointment {
  id: string;
  patient_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  card_type: string;
  lab_location: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function PinkCardManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [statistics, setStatistics] = useState<PinkCardStatistic[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const toast = useToast();

  // Summary state
  const [summary, setSummary] = useState<any>({
    total_records: 0,
    total_cards_issued: 0,
    pending_appointments: 0,
    completed_this_month: 0,
    date_range: {
      earliest: null,
      latest: null,
    },
  });

  // Filter state
  const [filters, setFilters] = useState({
    barangay_id: 'all',
    start_date: '',
    end_date: '',
    status: 'all',
  });

  // Check access on mount
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Only pink_card admins can access
    if (user.role !== 'healthcare_admin' || user.admin_category !== 'pink_card') {
      setHasAccess(false);
      toast.error('Access denied. Pink Card Administrator access required.');
      router.push('/healthcare-admin/dashboard');
      return;
    }

    setHasAccess(true);
  }, [user, router, toast]);

  // Fetch data
  useEffect(() => {
    if (hasAccess === true) {
      fetchData();
    }
  }, [hasAccess, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch pink card statistics
      const statsParams = new URLSearchParams();
      statsParams.append('healthcard_type', 'pink');
      if (filters.barangay_id !== 'all') {
        statsParams.append('barangay_id', filters.barangay_id);
      }
      if (filters.start_date) {
        statsParams.append('start_date', filters.start_date);
      }
      if (filters.end_date) {
        statsParams.append('end_date', filters.end_date);
      }

      const [statsRes, appointmentsRes, barangaysRes] = await Promise.all([
        fetch(`/api/healthcare-admin/healthcard-statistics?${statsParams}`),
        fetch(`/api/healthcare-admin/appointments?service_id=24${filters.status !== 'all' ? `&status=${filters.status}` : ''}`),
        fetch('/api/barangays'),
      ]);

      if (!statsRes.ok) throw new Error('Failed to fetch statistics');
      if (!appointmentsRes.ok) throw new Error('Failed to fetch appointments');
      if (!barangaysRes.ok) throw new Error('Failed to fetch barangays');

      const statsData = await statsRes.json();
      const appointmentsData = await appointmentsRes.json();
      const barangaysData = await barangaysRes.json();

      setStatistics(statsData.data || []);
      setAppointments(appointmentsData.data || []);
      setBarangays(barangaysData.data || []);
      setSummary(statsData.summary || {});
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load pink card data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      barangay_id: 'all',
      start_date: '',
      end_date: '',
      status: 'all',
    });
  };

  if (hasAccess === false) {
    return null;
  }

  if (hasAccess === null || loading) {
    return (
      <DashboardLayout user={user}>
        <Container>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-fuchsia-600" />
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <Container>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-fuchsia-100 rounded-lg">
              <CreditCard className="h-6 w-6 text-fuchsia-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pink Card Management</h1>
              <p className="text-sm text-gray-600">
                HIV-related health card issuance and renewal
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Cards Issued</span>
              <CreditCard className="h-4 w-4 text-fuchsia-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.total_cards_issued || 0}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Pending Appointments</span>
              <Calendar className="h-4 w-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {appointments.filter((a) => a.status === 'scheduled' || a.status === 'pending').length}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completed This Month</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {appointments.filter((a) => {
                const isCompleted = a.status === 'completed';
                const isThisMonth =
                  new Date(a.appointment_date).getMonth() === new Date().getMonth() &&
                  new Date(a.appointment_date).getFullYear() === new Date().getFullYear();
                return isCompleted && isThisMonth;
              }).length}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Records</span>
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {summary.total_records || 0}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-600" />
            <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Barangay Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Barangay
              </label>
              <select
                value={filters.barangay_id}
                onChange={(e) => handleFilterChange('barangay_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value="all">All Barangays</option>
                {barangays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Appointment Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pink Card Appointments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Lab Location
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No appointments found
                    </td>
                  </tr>
                ) : (
                  appointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {appointment.profiles.first_name} {appointment.profiles.last_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(appointment.appointment_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {appointment.appointment_time}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {appointment.lab_location || 'CHO'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            appointment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : appointment.status === 'scheduled' || appointment.status === 'pending'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Pink Card Statistics</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cards Issued
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Barangay
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {statistics.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No statistics found
                    </td>
                  </tr>
                ) : (
                  statistics.map((stat) => (
                    <tr key={stat.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(stat.record_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-fuchsia-600">
                        {stat.cards_issued}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {stat.barangays?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {stat.source || 'Manual Entry'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {stat.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
