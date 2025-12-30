'use client';

import { EnhancedTable } from '@/components/ui';
import { format } from 'date-fns';

interface PatientReportData {
  id: string;
  patient_number: string;
  name: string;
  email: string;
  contact_number: string;
  barangay_name: string;
  status: string;
  registration_date: string;
  total_appointments: number;
  completed_appointments: number;
  no_show_count: number;
  suspended_until?: string | null;
}

interface PatientReportTableProps {
  data: PatientReportData[];
  loading?: boolean;
}

export default function PatientReportTable({
  data,
  loading = false,
}: PatientReportTableProps) {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRowColor = (row: PatientReportData) => {
    if (row.status === 'suspended') {
      return 'bg-red-50 hover:bg-red-100';
    }
    if (row.no_show_count >= 2) {
      return 'bg-orange-50 hover:bg-orange-100';
    }
    return '';
  };

  const columns = [
    {
      header: 'Patient #',
      accessor: 'patient_number',
      sortable: true,
    },
    {
      header: 'Name',
      accessor: 'name',
      sortable: true,
    },
    {
      header: 'Email',
      accessor: 'email',
      sortable: true,
    },
    {
      header: 'Contact',
      accessor: 'contact_number',
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
          {value.toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Registration',
      accessor: 'registration_date',
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
      header: 'Total Appts',
      accessor: 'total_appointments',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-blue-600">{value}</span>
      ),
    },
    {
      header: 'Completed',
      accessor: 'completed_appointments',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium text-green-600">{value}</span>
      ),
    },
    {
      header: 'No-Shows',
      accessor: 'no_show_count',
      sortable: true,
      render: (value: number, row: PatientReportData) => (
        <span className={`font-medium ${value >= 2 ? 'text-red-600' : 'text-gray-600'}`}>
          {value}
          {value >= 2 && ' ⚠️'}
        </span>
      ),
    },
    {
      header: 'Suspended Until',
      accessor: 'suspended_until',
      sortable: true,
      render: (value: string | null) => {
        if (!value) return '—';
        try {
          return format(new Date(value), 'MMM dd, yyyy');
        } catch {
          return value;
        }
      },
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
          Patients Data Table
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {data.length} {data.length === 1 ? 'patient' : 'patients'} found
        </p>
      </div>

      <EnhancedTable
        columns={columns}
        data={data}
        searchable={true}
        searchPlaceholder="Search by patient name, number, email, or barangay..."
        paginated={true}
        pageSize={50}
        getRowColor={getRowColor}
      />

      {/* Legend */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Legend:</p>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
            <span>Suspended patients</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
            <span>Patients with 2+ no-shows (at risk)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-medium">⚠️</span>
            <span>No-show count ≥ 2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
