'use client';

import { EnhancedTable } from '@/components/ui';
import { Badge } from '@/components/ui';
import { format } from 'date-fns';

interface AppointmentReportData {
  id: string;
  appointment_number: number;
  appointment_date: string;
  appointment_time: string;
  time_block: string;
  status: string;
  service_name: string;
  patient_number: string;
  patient_name: string;
  barangay_name: string;
  completed_by_name?: string | null;
  reason: string;
}

interface AppointmentReportTableProps {
  data: AppointmentReportData[];
  loading?: boolean;
}

export default function AppointmentReportTable({
  data,
  loading = false,
}: AppointmentReportTableProps) {
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

  const columns = [
    {
      header: 'Appt #',
      accessor: 'appointment_number',
      sortable: true,
    },
    {
      header: 'Date',
      accessor: 'appointment_date',
      sortable: true,
      render: (value: string) => {
        try {
          return format(new Date(value), 'MMM dd, yyyy');
        } catch {
          return value;
        }
      },
    },
    {
      header: 'Time Block',
      accessor: 'time_block',
      sortable: true,
      render: (value: string) => (
        <span className="font-medium">
          {value === 'AM' ? '8:00 AM - 12:00 PM' : '1:00 PM - 5:00 PM'}
        </span>
      ),
    },
    {
      header: 'Service',
      accessor: 'service_name',
      sortable: true,
    },
    {
      header: 'Patient #',
      accessor: 'patient_number',
      sortable: true,
    },
    {
      header: 'Patient Name',
      accessor: 'patient_name',
      sortable: true,
    },
    {
      header: 'Barangay',
      accessor: 'barangay_name',
      sortable: true,
    },
    {
      header: 'Status',
      accessor: 'status',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(value)}`}>
          {value.replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Completed By',
      accessor: 'completed_by_name',
      sortable: true,
      render: (value: string | null) => value || '—',
    },
  ];

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
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Appointments Data Table
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {data.length} {data.length === 1 ? 'appointment' : 'appointments'} found
        </p>
      </div>

      <EnhancedTable
        columns={columns}
        data={data}
        searchable={true}
        searchPlaceholder="Search by patient name, service, barangay, or status..."
        paginated={true}
        pageSize={50}
      />
    </div>
  );
}
