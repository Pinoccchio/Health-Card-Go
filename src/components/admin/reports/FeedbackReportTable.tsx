'use client';

import { EnhancedTable } from '@/components/ui';
import { format } from 'date-fns';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';

interface FeedbackReportData {
  id: string;
  created_at: string;
  patient_name: string;
  patient_number: string;
  service_name: string;
  appointment_date: string;
  rating: number;
  facility_rating: number;
  wait_time_rating: number;
  would_recommend: boolean;
  comments?: string | null;
  admin_response?: string | null;
  responded_by_name?: string | null;
  responded_at?: string | null;
}

interface FeedbackReportTableProps {
  data: FeedbackReportData[];
  loading?: boolean;
}

export default function FeedbackReportTable({
  data,
  loading = false,
}: FeedbackReportTableProps) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'created_at',
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
      header: 'Patient',
      accessor: 'patient_name',
      sortable: true,
      render: (value: string, row: FeedbackReportData) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-xs text-gray-500">{row.patient_number}</div>
        </div>
      ),
    },
    {
      header: 'Service',
      accessor: 'service_name',
      sortable: true,
    },
    {
      header: 'Overall',
      accessor: 'rating',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-2">
          {renderStars(value)}
          <span className={`font-semibold ${getRatingColor(value)}`}>
            {value}/5
          </span>
        </div>
      ),
    },
    {
      header: 'Facility',
      accessor: 'facility_rating',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-1">
          {renderStars(value)}
          <span className="text-sm text-gray-600">{value}/5</span>
        </div>
      ),
    },
    {
      header: 'Wait Time',
      accessor: 'wait_time_rating',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-1">
          {renderStars(value)}
          <span className="text-sm text-gray-600">{value}/5</span>
        </div>
      ),
    },
    {
      header: 'Recommend',
      accessor: 'would_recommend',
      sortable: true,
      render: (value: boolean) => (
        <div className="flex items-center justify-center">
          {value ? (
            <ThumbsUp className="w-5 h-5 text-green-600" />
          ) : (
            <ThumbsDown className="w-5 h-5 text-red-600" />
          )}
        </div>
      ),
    },
    {
      header: 'Comments',
      accessor: 'comments',
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
    {
      header: 'Response Status',
      accessor: 'admin_response',
      sortable: true,
      render: (value: string | null, row: FeedbackReportData) => {
        if (!value) {
          return <span className="text-xs text-gray-500 italic">No response</span>;
        }
        return (
          <div className="text-xs">
            <div className="text-green-600 font-medium">Responded</div>
            {row.responded_by_name && (
              <div className="text-gray-500">by {row.responded_by_name}</div>
            )}
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
          Feedback Data Table
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {data.length} {data.length === 1 ? 'feedback' : 'feedback submissions'} found
        </p>
      </div>

      <EnhancedTable
        columns={columns}
        data={data}
        searchable={true}
        searchPlaceholder="Search by patient name, service, or comments..."
        paginated={true}
        pageSize={50}
      />

      {/* Legend */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Rating Guide:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>Filled star = rating given</span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-green-600" />
            <span>Would recommend service</span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-red-600" />
            <span>Would not recommend</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-600">4-5 stars:</span>
            <span>Excellent/Good</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-yellow-600">3 stars:</span>
            <span>Average</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-red-600">1-2 stars:</span>
            <span>Poor/Very Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
