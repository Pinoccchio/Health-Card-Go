'use client';

import { EnhancedTable } from '@/components/ui';
import { format } from 'date-fns';
import { getDiseaseDisplayName } from '@/lib/constants/diseaseConstants';

interface DiseaseReportData {
  id: string;
  disease_type: string;
  disease_display_name: string;
  custom_disease_name?: string | null;
  record_date: string;
  case_count: number;
  severity: string;
  source?: string | null;
  barangay_name: string;
  notes?: string | null;
  created_at?: string;
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
      case 'low_risk':
        return 'bg-green-100 text-green-800';
      case 'medium_risk':
        return 'bg-orange-100 text-orange-800';
      case 'high_risk':
        return 'bg-red-100 text-red-800';
      // Legacy support for old severity values
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

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'low_risk':
        return 'Low Risk';
      case 'medium_risk':
        return 'Medium Risk';
      case 'high_risk':
        return 'High Risk';
      // Legacy support
      case 'mild':
        return 'Mild';
      case 'moderate':
        return 'Moderate';
      case 'severe':
        return 'Severe';
      case 'critical':
        return 'Critical';
      default:
        return severity.toUpperCase();
    }
  };

  const getRowColor = (row: DiseaseReportData) => {
    if (row.severity === 'high_risk' || row.severity === 'critical') {
      return 'bg-red-50 hover:bg-red-100';
    }
    if (row.severity === 'medium_risk' || row.severity === 'severe') {
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
      header: 'Cases',
      accessor: 'case_count',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{value ?? 0}</span>
      ),
    },
    {
      header: 'Barangay',
      accessor: 'barangay_name',
      sortable: true,
    },
    {
      header: 'Date',
      accessor: 'record_date',
      sortable: true,
      render: (value: string) => {
        if (!value) return '—';
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
          {getSeverityLabel(value)}
        </span>
      ),
    },
    {
      header: 'Source',
      accessor: 'source',
      sortable: true,
      render: (value: string | null) => {
        if (!value) return '—';
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {value}
          </span>
        );
      },
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
        searchPlaceholder="Search by disease, barangay, or source..."
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
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Low Risk (&lt;50%)</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">Medium Risk (50-69%)</span>
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">High Risk (≥70%)</span>
            </div>
          </div>
          <div>
            <p className="font-medium mb-1">Row Highlighting:</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
                <span>High risk cases (≥70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-50 border border-orange-200 rounded"></div>
                <span>Medium risk cases (50-69%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
