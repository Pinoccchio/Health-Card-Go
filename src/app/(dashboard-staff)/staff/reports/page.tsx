'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';

interface ReportFilters {
  disease_type: string;
  start_date: string;
  end_date: string;
  barangay_id: string;
  report_type: 'summary' | 'detailed' | 'trend_analysis';
}

const DISEASE_TYPES = [
  { value: 'all', label: 'All Diseases' },
  { value: 'dengue', label: 'Dengue' },
  { value: 'hiv_aids', label: 'HIV/AIDS' },
  { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'measles', label: 'Measles' },
  { value: 'rabies', label: 'Rabies' },
];

const REPORT_TYPES = [
  {
    value: 'summary',
    label: 'Summary Report',
    description: 'High-level overview of disease cases by type and location',
    icon: BarChart3,
  },
  {
    value: 'detailed',
    label: 'Detailed Report',
    description: 'Comprehensive case-by-case report with full details',
    icon: FileText,
  },
  {
    value: 'trend_analysis',
    label: 'Trend Analysis',
    description: 'Time-series analysis showing disease patterns and trends',
    icon: TrendingUp,
  },
];

export default function StaffReportsPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    disease_type: 'all',
    start_date: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    barangay_id: 'all',
    report_type: 'summary',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [barangays, setBarangays] = useState<any[]>([]);

  // Fetch barangays on component mount
  useState(() => {
    const fetchBarangays = async () => {
      try {
        const response = await fetch('/api/barangays');
        const data = await response.json();
        if (data.success) {
          setBarangays(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching barangays:', err);
      }
    };
    fetchBarangays();
  });

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      // Build query parameters
      const params = new URLSearchParams({
        report_type: filters.report_type,
        start_date: filters.start_date,
        end_date: filters.end_date,
      });

      if (filters.disease_type !== 'all') {
        params.append('disease_type', filters.disease_type);
      }

      if (filters.barangay_id !== 'all') {
        params.append('barangay_id', filters.barangay_id);
      }

      const response = await fetch(`/api/reports/generate?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate report');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `disease-report-${filters.report_type}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('Report generated and downloaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error generating report:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout
      roleId={5}
      pageTitle="Disease Surveillance Reports"
      pageDescription="Generate and export disease surveillance reports"
    >
      <Container size="full">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* Report Type Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-teal" />
            Select Report Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REPORT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setFilters({ ...filters, report_type: type.value as any })}
                  className={`p-6 border-2 rounded-lg text-left transition-all ${
                    filters.report_type === type.value
                      ? 'border-primary-teal bg-primary-teal/5 ring-2 ring-primary-teal ring-offset-2'
                      : 'border-gray-200 hover:border-primary-teal/50 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        filters.report_type === type.value
                          ? 'bg-primary-teal text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{type.label}</h4>
                      <p className="text-sm text-gray-600">{type.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary-teal" />
            Report Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Disease Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disease Type
              </label>
              <select
                value={filters.disease_type}
                onChange={(e) => setFilters({ ...filters, disease_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
              >
                {DISEASE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                max={filters.end_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                min={filters.start_date}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
              />
            </div>

            {/* Barangay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Barangay
              </label>
              <select
                value={filters.barangay_id}
                onChange={(e) => setFilters({ ...filters, barangay_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
              >
                <option value="all">All Barangays</option>
                {barangays.map((barangay) => (
                  <option key={barangay.id} value={barangay.id}>
                    {barangay.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Report Preview/Summary */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <ProfessionalCard variant="flat" className="bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Report Type</p>
                  <p className="text-sm font-medium text-gray-900">
                    {REPORT_TYPES.find(t => t.value === filters.report_type)?.label}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Disease</p>
                  <p className="text-sm font-medium text-gray-900">
                    {DISEASE_TYPES.find(t => t.value === filters.disease_type)?.label}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Date Range</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(filters.start_date), 'MMM d')} - {format(new Date(filters.end_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
            </ProfessionalCard>

            <ProfessionalCard variant="flat" className="bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Location</p>
                  <p className="text-sm font-medium text-gray-900">
                    {filters.barangay_id === 'all'
                      ? 'All Barangays'
                      : barangays.find(b => b.id.toString() === filters.barangay_id)?.name || 'Unknown'}
                  </p>
                </div>
                <Filter className="w-8 h-8 text-gray-400" />
              </div>
            </ProfessionalCard>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="px-8 py-3 bg-primary-teal text-white rounded-md hover:bg-primary-teal-dark transition-colors disabled:opacity-50 flex items-center gap-3 shadow-lg hover:shadow-xl"
            >
              <Download className="w-5 h-5" />
              {generating ? 'Generating Report...' : 'Generate & Download Report'}
            </button>
          </div>
        </div>

        {/* Report Format Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">Report Format</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Reports are exported in CSV format for easy analysis in Excel or other tools</li>
                <li>• Summary reports include aggregated statistics by disease type and location</li>
                <li>• Detailed reports contain individual case records with all available information</li>
                <li>• Trend analysis reports include time-series data for pattern identification</li>
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
