'use client';

import { useState } from 'react';
import { X, Download, FileSpreadsheet, Calendar, Filter, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { generateCSV, generateExcel, formatFileName } from '@/lib/utils/exportUtils';

interface TrendsAnalysisReportGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  barangays: Array<{ id: number; name: string }>;
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

const TIME_RANGES = [
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last 12 months' },
];

export function TrendsAnalysisReportGenerator({
  isOpen,
  onClose,
  barangays,
  filters = {},
}: TrendsAnalysisReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [reportFilters, setReportFilters] = useState({
    disease_type: filters.disease_type || 'all',
    barangay_id: filters.barangay_id?.toString() || 'all',
    time_range: filters.time_range || '90',
  });

  const fetchReportData = async () => {
    setIsGenerating(true);
    setError('');

    try {
      // Fetch historical statistics for trend analysis
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(reportFilters.time_range));

      const params = new URLSearchParams();
      if (reportFilters.disease_type !== 'all') {
        params.append('disease_type', reportFilters.disease_type);
      }
      if (reportFilters.barangay_id !== 'all') {
        params.append('barangay_id', reportFilters.barangay_id);
      }
      params.append('start_date', format(startDate, 'yyyy-MM-dd'));
      params.append('end_date', format(endDate, 'yyyy-MM-dd'));

      const response = await fetch(`/api/diseases/historical?${params.toString()}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch trend data');
      }

      const records = result.data || [];
      const summary = result.summary || {};

      // Calculate trend metrics
      const trendMetrics = calculateTrendMetrics(records, parseInt(reportFilters.time_range));

      return { records, summary, trendMetrics };
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to fetch report data');
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateTrendMetrics = (records: any[], timeRange: number) => {
    if (!records || records.length === 0) {
      return {
        totalCases: 0,
        avgCasesPerDay: 0,
        peakDay: null,
        trendDirection: 'stable',
        changePercentage: 0,
      };
    }

    // Calculate total cases
    const totalCases = records.reduce((sum, r) => sum + (r.case_count || 0), 0);
    const avgCasesPerDay = (totalCases / timeRange).toFixed(2);

    // Find peak day
    const peakRecord = records.reduce((max, r) =>
      (r.case_count || 0) > (max.case_count || 0) ? r : max
    , records[0]);

    // Calculate trend (compare first half vs second half)
    const midPoint = Math.floor(records.length / 2);
    const firstHalf = records.slice(0, midPoint);
    const secondHalf = records.slice(midPoint);

    const firstHalfAvg = firstHalf.reduce((sum, r) => sum + (r.case_count || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, r) => sum + (r.case_count || 0), 0) / secondHalf.length;

    const changePercentage = firstHalfAvg > 0
      ? (((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100).toFixed(1)
      : 0;

    let trendDirection = 'stable';
    if (Math.abs(Number(changePercentage)) < 5) {
      trendDirection = 'stable';
    } else if (Number(changePercentage) > 0) {
      trendDirection = 'increasing';
    } else {
      trendDirection = 'decreasing';
    }

    return {
      totalCases,
      avgCasesPerDay: Number(avgCasesPerDay),
      peakDay: peakRecord ? format(new Date(peakRecord.record_date), 'MMM d, yyyy') : null,
      peakDayCases: peakRecord ? peakRecord.case_count : 0,
      trendDirection,
      changePercentage: Number(changePercentage),
    };
  };

  const handleExportCSV = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const { records, trendMetrics } = await fetchReportData();

      if (!records || records.length === 0) {
        alert('No trend data available to export');
        return;
      }

      // Transform records into time-series data
      const tableData = records.map((record: any) => ({
        date: format(new Date(record.record_date), 'MMM d, yyyy'),
        disease_type: DISEASE_TYPES.find(d => d.value === record.disease_type)?.label || record.disease_type,
        custom_disease_name: record.custom_disease_name || '-',
        barangay: record.barangays?.name || 'All Barangays',
        case_count: record.case_count || 0,
        severity: record.severity || '-',
        source: record.source || '-',
      }));

      const filename = formatFileName('trends_analysis_report', 'csv');
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
      const { records, summary, trendMetrics } = await fetchReportData();

      if (!records || records.length === 0) {
        alert('No trend data available to export');
        return;
      }

      const diseaseLabel = DISEASE_TYPES.find(d => d.value === reportFilters.disease_type)?.label || 'All Diseases';
      const barangayLabel = reportFilters.barangay_id === 'all'
        ? 'All Barangays'
        : barangays.find(b => b.id === parseInt(reportFilters.barangay_id))?.name || 'Unknown';

      const timeRangeLabel = TIME_RANGES.find(t => t.value === reportFilters.time_range)?.label || `Last ${reportFilters.time_range} days`;

      // Summary with trend metrics
      const summaryObj = {
        report_type: 'Disease Trends Analysis Report',
        period: timeRangeLabel,
        disease_filter: diseaseLabel,
        barangay_filter: barangayLabel,
        total_records: summary.totalRecords || records.length,
        total_cases: trendMetrics.totalCases.toLocaleString(),
        average_cases_per_day: trendMetrics.avgCasesPerDay,
        peak_day: trendMetrics.peakDay || 'N/A',
        peak_day_cases: trendMetrics.peakDayCases,
        trend_direction: trendMetrics.trendDirection.toUpperCase(),
        trend_change_percentage: `${trendMetrics.changePercentage}%`,
        date_range: summary.earliestDate && summary.latestDate
          ? `${format(new Date(summary.earliestDate), 'MMM d, yyyy')} - ${format(new Date(summary.latestDate), 'MMM d, yyyy')}`
          : 'No data',
      };

      // Time-series data
      const timeSeriesData = records
        .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime())
        .map((record: any) => ({
          date: format(new Date(record.record_date), 'MMM d, yyyy'),
          disease_type: DISEASE_TYPES.find(d => d.value === record.disease_type)?.label || record.disease_type,
          custom_disease_name: record.custom_disease_name || '-',
          barangay: record.barangays?.name || 'All Barangays',
          case_count: record.case_count || 0,
          severity: record.severity || '-',
          source: record.source || '-',
        }));

      // Disease type breakdown (if "All Diseases")
      let diseaseBreakdown: any[] = [];
      if (reportFilters.disease_type === 'all' && summary.diseaseTypeCounts) {
        diseaseBreakdown = Object.entries(summary.diseaseTypeCounts).map(([diseaseKey, count]) => {
          const standardDisease = DISEASE_TYPES.find(d => d.value === diseaseKey);
          const label = standardDisease ? standardDisease.label : diseaseKey;
          const diseaseCases = records
            .filter((r: any) => r.disease_type === diseaseKey)
            .reduce((sum, r) => sum + (r.case_count || 0), 0);
          return {
            disease: label,
            record_count: count,
            total_cases: diseaseCases,
            percentage: ((Number(count) / summary.totalRecords) * 100).toFixed(1) + '%',
          };
        });
      }

      // Barangay breakdown (if "All Barangays")
      let barangayBreakdown: any[] = [];
      if (reportFilters.barangay_id === 'all') {
        const barangayCounts = records.reduce((acc: any, record: any) => {
          const barangay = record.barangays?.name || 'Unknown';
          if (!acc[barangay]) {
            acc[barangay] = { records: 0, cases: 0 };
          }
          acc[barangay].records += 1;
          acc[barangay].cases += record.case_count || 0;
          return acc;
        }, {});

        barangayBreakdown = Object.entries(barangayCounts)
          .map(([barangay, data]: [string, any]) => ({
            barangay,
            record_count: data.records,
            total_cases: data.cases,
          }))
          .sort((a, b) => b.total_cases - a.total_cases);
      }

      // Monthly aggregation for trend visualization
      const monthlyData = records.reduce((acc: any, record: any) => {
        const month = format(new Date(record.record_date), 'MMM yyyy');
        if (!acc[month]) {
          acc[month] = { records: 0, cases: 0 };
        }
        acc[month].records += 1;
        acc[month].cases += record.case_count || 0;
        return acc;
      }, {});

      const monthlyTrend = Object.entries(monthlyData).map(([month, data]: [string, any]) => ({
        month,
        record_count: data.records,
        total_cases: data.cases,
      }));

      const excelData: any = {
        summary: summaryObj,
        time_series: timeSeriesData,
        monthly_trend: monthlyTrend,
      };

      if (diseaseBreakdown.length > 0) {
        excelData.disease_breakdown = diseaseBreakdown;
      }

      if (barangayBreakdown.length > 0) {
        excelData.barangay_breakdown = barangayBreakdown;
      }

      const filename = formatFileName('trends_analysis_report', 'xlsx');
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
                <TrendingUp className="w-5 h-5 text-green-600" />
                Generate Trends Analysis Report
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Export time-series analysis with trend metrics and predictions
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
                  Analysis Period
                </label>
                <select
                  id="time-range"
                  value={reportFilters.time_range}
                  onChange={(e) => setReportFilters({ ...reportFilters, time_range: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {TIME_RANGES.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Report Information */}
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-sm font-semibold text-green-900 mb-2">Report Contents</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Trend metrics (total cases, average per day, peak day)</li>
                <li>• Trend direction (increasing, decreasing, stable)</li>
                <li>• Time-series data with chronological records</li>
                <li>• Monthly aggregation for trend visualization</li>
                <li>• Disease type and barangay breakdowns (if applicable)</li>
                <li>• Statistical analysis and comparison metrics</li>
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
              className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Export CSV'}
            </button>
            <button
              onClick={handleExportExcel}
              disabled={isGenerating}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
