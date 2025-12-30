'use client';

import { useState } from 'react';
import { X, Download, FileSpreadsheet, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { generateCSV, generateExcel, formatFileName } from '@/lib/utils/exportUtils';

interface HistoricalStatisticsReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  barangays: Array<{ id: number; name: string }>;
}

const DISEASE_TYPES = [
  { value: 'all', label: 'All Diseases' },
  { value: 'dengue', label: 'Dengue' },
  { value: 'hiv_aids', label: 'HIV/AIDS' },
  { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'measles', label: 'Measles' },
  { value: 'rabies', label: 'Rabies' },
  { value: 'other', label: 'Other Diseases' },
];

export function HistoricalStatisticsReportGenerator({
  isOpen,
  onClose,
  barangays,
}: HistoricalStatisticsReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    disease_type: 'all',
    barangay_id: 'all',
    start_date: format(new Date(new Date().getFullYear() - 1, 0, 1), 'yyyy-MM-dd'), // Default to last year
    end_date: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchReportData = async () => {
    setIsGenerating(true);
    setError('');

    try {
      // Fetch filtered historical statistics
      const params = new URLSearchParams();
      if (filters.disease_type !== 'all') {
        params.append('disease_type', filters.disease_type);
      }
      if (filters.barangay_id !== 'all') {
        params.append('barangay_id', filters.barangay_id);
      }
      params.append('start_date', filters.start_date);
      params.append('end_date', filters.end_date);

      const response = await fetch(`/api/diseases/historical?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch historical statistics');
      }

      const records = result.data || [];
      const summary = result.summary || {};

      return { records, summary };
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch report data');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const { records } = await fetchReportData();

      if (!records || records.length === 0) {
        alert('No data available to export');
        return;
      }

      // Transform records into flat table data
      const tableData = records.map((record: any) => {
        let importedBy = 'Unknown';
        if (record.created_by) {
          const firstName = record.created_by.first_name || '';
          const lastName = record.created_by.last_name || '';
          importedBy = `${firstName} ${lastName}`.trim() || record.created_by.email || 'Staff';
        }

        return {
          record_date: format(new Date(record.record_date), 'MMM d, yyyy'),
          disease_type: DISEASE_TYPES.find(d => d.value === record.disease_type)?.label || record.disease_type,
          custom_disease_name: record.custom_disease_name || '-',
          barangay: record.barangays?.name || 'All Barangays',
          case_count: record.case_count?.toLocaleString() || '0',
          source: record.source || '-',
          imported_by: importedBy,
          notes: record.notes || '-',
        };
      });

      const filename = formatFileName('historical_statistics_report', 'csv');
      generateCSV(tableData, filename.replace('.csv', ''));
    } catch (err: any) {
      console.error('Error exporting CSV:', err);
      setError(err.message || 'Failed to export CSV');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const { records, summary } = await fetchReportData();

      if (!records || records.length === 0) {
        alert('No data available to export');
        return;
      }

      // Calculate summary statistics
      const totalRecords = summary.totalRecords || records.length;
      const totalCases = summary.totalCases || records.reduce((sum: number, r: any) => sum + (r.case_count || 0), 0);

      const diseaseLabel = DISEASE_TYPES.find(d => d.value === filters.disease_type)?.label || 'All Diseases';
      const barangayLabel = filters.barangay_id === 'all'
        ? 'All Barangays'
        : barangays.find(b => b.id === parseInt(filters.barangay_id))?.name || 'Unknown';

      const summaryObj = {
        report_type: 'Historical Disease Statistics Report',
        period: `${format(new Date(filters.start_date), 'MMM d, yyyy')} - ${format(new Date(filters.end_date), 'MMM d, yyyy')}`,
        disease_filter: diseaseLabel,
        barangay_filter: barangayLabel,
        total_records: totalRecords,
        total_aggregate_cases: totalCases.toLocaleString(),
        date_range: summary.earliestDate && summary.latestDate
          ? `${format(new Date(summary.earliestDate), 'MMM yyyy')} - ${format(new Date(summary.latestDate), 'MMM yyyy')}`
          : 'No data',
        most_common_disease: summary.mostCommonDisease
          ? `${DISEASE_TYPES.find(d => d.value === summary.mostCommonDisease)?.label || summary.mostCommonDisease} (${summary.diseaseTypeCounts?.[summary.mostCommonDisease] || 0} records)`
          : '-',
      };

      // Transform records into table data
      const tableData = records.map((record: any) => {
        let importedBy = 'Unknown';
        if (record.created_by) {
          const firstName = record.created_by.first_name || '';
          const lastName = record.created_by.last_name || '';
          importedBy = `${firstName} ${lastName}`.trim() || record.created_by.email || 'Staff';
        }

        return {
          record_date: format(new Date(record.record_date), 'MMM d, yyyy'),
          disease_type: DISEASE_TYPES.find(d => d.value === record.disease_type)?.label || record.disease_type,
          custom_disease_name: record.custom_disease_name || '-',
          barangay: record.barangays?.name || 'All Barangays',
          case_count: record.case_count?.toLocaleString() || '0',
          source: record.source || '-',
          imported_by: importedBy,
          notes: record.notes || '-',
        };
      });

      // Disease breakdown (if "All Diseases" selected)
      let diseaseData: any[] = [];
      if (filters.disease_type === 'all' && summary.diseaseTypeCounts) {
        diseaseData = Object.entries(summary.diseaseTypeCounts).map(([diseaseKey, count]) => {
          const standardDisease = DISEASE_TYPES.find(d => d.value === diseaseKey);
          const label = standardDisease ? standardDisease.label : diseaseKey;
          return {
            disease: label,
            record_count: count,
          };
        });
      }

      // Data source breakdown
      const sourceBreakdown = records.reduce((acc: any, record: any) => {
        const source = record.source || 'Unknown Source';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      const sourceData = Object.entries(sourceBreakdown).map(([source, count]) => ({
        source,
        count,
      }));

      const excelData: any = {
        summary: summaryObj,
        tableData,
      };

      if (diseaseData.length > 0) {
        excelData.diseaseBreakdown = diseaseData;
      }

      if (sourceData.length > 0) {
        excelData.sourceBreakdown = sourceData;
      }

      const filename = formatFileName('historical_statistics_report', 'xlsx');
      generateExcel(excelData, filename.replace('.xlsx', ''));
    } catch (err: any) {
      console.error('Error exporting Excel:', err);
      setError(err.message || 'Failed to export Excel');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-all duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal */}
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary-teal" />
                Export Historical Statistics Report
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Export aggregate historical disease data to CSV or Excel
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                Report Filters
              </h4>

              <div className="space-y-3">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                      max={filters.end_date}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                      min={filters.start_date}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                    />
                  </div>
                </div>

                {/* Disease Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Disease Type
                  </label>
                  <select
                    value={filters.disease_type}
                    onChange={(e) => setFilters({ ...filters, disease_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    {DISEASE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Barangay Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay
                  </label>
                  <select
                    value={filters.barangay_id}
                    onChange={(e) => setFilters({ ...filters, barangay_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal text-sm"
                  >
                    <option value="all">All Barangays</option>
                    {barangays.map(barangay => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isGenerating}
              >
                <Download className="w-4 h-4" />
                {isGenerating ? 'Exporting...' : 'Export CSV'}
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2 bg-primary-teal text-white rounded-md hover:bg-primary-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isGenerating}
              >
                <FileSpreadsheet className="w-4 h-4" />
                {isGenerating ? 'Exporting...' : 'Export Excel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
