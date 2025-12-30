'use client';

import { EnhancedTable } from '@/components/ui';
import { format } from 'date-fns';
import { getDiseaseDisplayName } from '@/lib/constants/diseaseConstants';

interface DiseaseReportData {
  id: string;
  disease_type: string;
  disease_display_name: string;
  custom_disease_name?: string | null;
  diagnosis_date: string;
  severity: string;
  status: string;
  barangay_name: string;
  patient_name: string;
  patient_number: string;
  patient_type: 'registered' | 'anonymous' | 'unknown';
  notes?: string | null;
}

interface DiseaseReportTableProps {
  data: DiseaseReportData[];
  loading?: boolean;
}

export default function DiseaseReportTable({
  data,
  loading = false,
}: DiseaseReportTableProps) {
  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'mild':
        return 'bg-green-100 text-green-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'severe':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-100 text-red-800';
      case 'recovered':
        return 'bg-green-100 text-green-800';
      case 'deceased':
        return 'bg-gray-800 text-white';
      case 'ongoing_treatment':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRowColor = (row: DiseaseReportData) => {
    if (row.severity === 'critical') {
      return 'bg-red-50 hover:bg-red-100';
    }
    if (row.severity === 'severe') {
      return 'bg-orange-50 hover:bg-orange-100';
    }
    return '';
  };

  const columns = [
    {
      header: 'Disease',
      accessor: 'disease_display_name',
      sortable: true,
      render: (value: string, row: DiseaseReportData) => {
        const displayName = row.disease_type === 'other' && row.custom_disease_name
          ? row.custom_disease_name
          : getDiseaseDisplayName(row.disease_type);
        return <span className="font-medium">{displayName}</span>;
      },
    },
    {
      header: 'Patient',
      accessor: 'patient_name',
      sortable: true,
      render: (value: string, row: DiseaseReportData) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">
            {row.patient_type === 'anonymous' ? (
              <span className="italic text-orange-600">Anonymous</span>
            ) : (
              row.patient_number
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Barangay',
      accessor: 'barangay_name',
      sortable: true,
    },
    {
      header: 'Diagnosis Date',
      accessor: 'diagnosis_date',
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
      header: 'Severity',
      accessor: 'severity',
      sortable: true,
      render: (value: string) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadgeClass(value)}`}>
          {value.toUpperCase()}
        </span>
      ),
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
      header: 'Notes',
      accessor: 'notes',
      sortable: false,
      render: (value: string | null) => {
        if (!value) return '—';
        return (
          <div className="max-w-xs truncate" title={value}>
            {value}
          </div>
        );
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
          Disease Cases Data Table
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {data.length} {data.length === 1 ? 'case' : 'cases'} found
        </p>
      </div>

      <EnhancedTable
        columns={columns}
        data={data}
        searchable={true}
        searchPlaceholder="Search by disease, patient name, or barangay..."
        paginated={true}
        pageSize={50}
        getRowColor={getRowColor}
      />

      {/* Legend */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Legend:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
          <div>
            <p className="font-medium mb-1">Severity Levels:</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Mild</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Moderate</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Severe</span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">Critical</span>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Status:</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">Active</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Treatment</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Recovered</span>
              <span className="px-2 py-1 bg-gray-800 text-white rounded">Deceased</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <p className="font-medium mb-1">Row Highlighting:</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                <span>Critical severity cases</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
                <span>Severe cases</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="italic text-orange-600 text-xs">Anonymous</span>
                <span>Walk-in patient (no patient record)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
