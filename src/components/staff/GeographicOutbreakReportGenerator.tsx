'use client';

import { useState } from 'react';
import { X, Download, FileSpreadsheet, Calendar, Filter, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { generateCSV, generateExcel, formatFileName } from '@/lib/utils/exportUtils';

interface GeographicOutbreakReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  barangays: Array<{ id: number; name: string }>;
  outbreakData?: any[]; // Current outbreak alerts from the map
  filters?: {
    disease_type?: string;
    barangay_id?: number | null;
    time_range?: string;
  };
}

const DISEASE_TYPES = [
  { value: 'all', label: 'All Diseases' },
  { value: 'dengue', label: 'Dengue' },
  { value: 'hiv_aids', label: 'HIV/AIDS' },
  { value: 'pregnancy_complications', label: 'Pregnancy Complications' },
  { value: 'malaria', label: 'Malaria' },
  { value: 'measles', label: 'Measles' },
  { value: 'rabies', label: 'Rabies' },
  { value: 'animal_bite', label: 'Animal Bite' },
  { value: 'other', label: 'Other Diseases' },
];

const RISK_LEVELS = [
  { value: 'critical', label: 'Critical Risk', color: 'text-red-600' },
  { value: 'high', label: 'High Risk', color: 'text-orange-600' },
  { value: 'medium', label: 'Medium Risk', color: 'text-yellow-600' },
  { value: 'low', label: 'Low Risk', color: 'text-green-600' },
];

export function GeographicOutbreakReportGenerator({
  isOpen,
  onClose,
  barangays,
  outbreakData = [],
  filters = {},
}: GeographicOutbreakReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [reportFilters, setReportFilters] = useState({
    disease_type: filters.disease_type || 'all',
    barangay_id: filters.barangay_id?.toString() || 'all',
    time_range: filters.time_range || '30',
  });

  const fetchReportData = async () => {
    setIsGenerating(true);
    setError('');

    try {
      // Fetch outbreak detection data with filters
      const params = new URLSearchParams();
      if (reportFilters.disease_type !== 'all') {
        params.append('disease_type', reportFilters.disease_type);
      }
      if (reportFilters.barangay_id !== 'all') {
        params.append('barangay_id', reportFilters.barangay_id);
      }
      params.append('time_range', reportFilters.time_range);

      const response = await fetch(`/api/diseases/outbreak-detection?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch outbreak data');
      }

      const outbreaks = result.data || [];
      const metadata = result.metadata || {};

      return { outbreaks, metadata };
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
      const { outbreaks } = await fetchReportData();

      if (!outbreaks || outbreaks.length === 0) {
        alert('No outbreak data available to export');
        return;
      }

      // Transform outbreak data into flat table
      const tableData = outbreaks.map((outbreak: any) => ({
        disease_type: DISEASE_TYPES.find(d => d.value === outbreak.disease_type)?.label || outbreak.disease_type,
        custom_disease_name: outbreak.custom_disease_name || '-',
        barangay: outbreak.barangay_name || 'Unknown',
        total_cases: outbreak.case_count || 0,
        critical_cases: outbreak.critical_cases || 0,
        severe_cases: outbreak.severe_cases || 0,
        moderate_cases: outbreak.moderate_cases || 0,
        risk_level: RISK_LEVELS.find(r => r.value === outbreak.risk_level)?.label || outbreak.risk_level,
        period_days: outbreak.period_days || reportFilters.time_range,
        latest_case_date: outbreak.latest_case_date
          ? format(new Date(outbreak.latest_case_date), 'MMM d, yyyy')
          : 'N/A',
      }));

      const filename = formatFileName('geographic_outbreak_report', 'csv');
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
      const { outbreaks, metadata } = await fetchReportData();

      if (!outbreaks || outbreaks.length === 0) {
        alert('No outbreak data available to export');
        return;
      }

      // Calculate summary statistics
      const totalOutbreaks = outbreaks.length;
      const affectedBarangays = new Set(outbreaks.map((o: any) => o.barangay_id)).size;
      const totalCases = outbreaks.reduce((sum: number, o: any) => sum + (o.case_count || 0), 0);
      const criticalOutbreaks = outbreaks.filter((o: any) => o.risk_level === 'critical').length;
      const highRiskOutbreaks = outbreaks.filter((o: any) => o.risk_level === 'high').length;

      // Most affected barangay
      const barangayCounts = outbreaks.reduce((acc: any, outbreak: any) => {
        const barangay = outbreak.barangay_name || 'Unknown';
        acc[barangay] = (acc[barangay] || 0) + (outbreak.case_count || 0);
        return acc;
      }, {});
      const mostAffected = Object.entries(barangayCounts).sort((a: any, b: any) => b[1] - a[1])[0];

      const diseaseLabel = DISEASE_TYPES.find(d => d.value === reportFilters.disease_type)?.label || 'All Diseases';
      const barangayLabel = reportFilters.barangay_id === 'all'
        ? 'All Barangays'
        : barangays.find(b => b.id === parseInt(reportFilters.barangay_id))?.name || 'Unknown';

      const summaryObj = {
        report_type: 'Geographic Outbreak Analysis Report',
        period: `Last ${reportFilters.time_range} days (as of ${format(new Date(), 'MMM d, yyyy')})`,
        disease_filter: diseaseLabel,
        barangay_filter: barangayLabel,
        total_outbreaks: totalOutbreaks,
        affected_barangays: affectedBarangays,
        total_cases: totalCases.toLocaleString(),
        critical_risk_outbreaks: criticalOutbreaks,
        high_risk_outbreaks: highRiskOutbreaks,
        most_affected_barangay: mostAffected ? `${mostAffected[0]} (${mostAffected[1]} cases)` : 'N/A',
      };

      // Transform outbreak data into table
      const tableData = outbreaks.map((outbreak: any) => ({
        disease_type: DISEASE_TYPES.find(d => d.value === outbreak.disease_type)?.label || outbreak.disease_type,
        custom_disease_name: outbreak.custom_disease_name || '-',
        barangay: outbreak.barangay_name || 'Unknown',
        total_cases: outbreak.case_count || 0,
        critical_cases: outbreak.critical_cases || 0,
        severe_cases: outbreak.severe_cases || 0,
        moderate_cases: outbreak.moderate_cases || 0,
        risk_level: RISK_LEVELS.find(r => r.value === outbreak.risk_level)?.label || outbreak.risk_level,
        period_days: outbreak.period_days || reportFilters.time_range,
        latest_case_date: outbreak.latest_case_date
          ? format(new Date(outbreak.latest_case_date), 'MMM d, yyyy')
          : 'N/A',
      }));

      // Risk level breakdown
      const riskBreakdown = RISK_LEVELS.map(risk => ({
        risk_level: risk.label,
        count: outbreaks.filter((o: any) => o.risk_level === risk.value).length,
        total_cases: outbreaks
          .filter((o: any) => o.risk_level === risk.value)
          .reduce((sum: number, o: any) => sum + (o.case_count || 0), 0),
      })).filter(item => item.count > 0);

      // Barangay summary
      const barangaySummary = Object.entries(barangayCounts)
        .map(([barangay, cases]) => ({
          barangay,
          total_cases: cases,
          outbreaks: outbreaks.filter((o: any) => o.barangay_name === barangay).length,
        }))
        .sort((a: any, b: any) => b.total_cases - a.total_cases);

      const excelData: any = {
        summary: summaryObj,
        outbreaks: tableData,
        risk_breakdown: riskBreakdown,
        barangay_summary: barangaySummary,
      };

      const filename = formatFileName('geographic_outbreak_report', 'xlsx');
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
              <h2 id="modal-title" className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Generate Geographic Outbreak Report
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Export outbreak data with geographic distribution and risk analysis
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Filters */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Filter className="w-4 h-4" />
                Report Filters
              </div>

              {/* Disease Type */}
              <div>
                <label htmlFor="disease-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Disease Type
                </label>
                <select
                  id="disease-type"
                  value={reportFilters.disease_type}
                  onChange={(e) => setReportFilters({ ...reportFilters, disease_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DISEASE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Barangay */}
              <div>
                <label htmlFor="barangay" className="block text-sm font-medium text-gray-700 mb-1">
                  Barangay
                </label>
                <select
                  id="barangay"
                  value={reportFilters.barangay_id}
                  onChange={(e) => setReportFilters({ ...reportFilters, barangay_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Barangays</option>
                  {barangays.map((barangay) => (
                    <option key={barangay.id} value={barangay.id}>
                      {barangay.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Range */}
              <div>
                <label htmlFor="time-range" className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Time Range
                </label>
                <select
                  id="time-range"
                  value={reportFilters.time_range}
                  onChange={(e) => setReportFilters({ ...reportFilters, time_range: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="7">Last 7 days</option>
                  <option value="14">Last 14 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="60">Last 60 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>

            {/* Report Information */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Report Contents</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Summary statistics (outbreaks, affected barangays, total cases)</li>
                <li>• Outbreak details with risk levels (critical, high, medium, low)</li>
                <li>• Risk level breakdown by severity</li>
                <li>• Barangay summary with case counts</li>
                <li>• Geographic distribution analysis</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-lg border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              onClick={handleExportCSV}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Export CSV'}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Export Excel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
