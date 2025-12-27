'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { IndividualCasesReportGenerator } from '@/components/staff/IndividualCasesReportGenerator';
import { HistoricalStatisticsReportGenerator } from '@/components/staff/HistoricalStatisticsReportGenerator';
import { DiseaseChartsSection } from '@/components/staff/DiseaseChartsSection';
import { HistoricalChartsSection } from '@/components/staff/HistoricalChartsSection';
import {
  FileText,
  Activity,
  Calendar,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Database,
} from 'lucide-react';

interface SummaryStats {
  individualCases: {
    total: number;
    thisMonth: number;
    active: number;
  };
  historicalStats: {
    totalRecords: number;
    totalCases: number;
    dateRange: string;
  };
}

interface Barangay {
  id: number;
  name: string;
  code: string;
}

export default function StaffReportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SummaryStats>({
    individualCases: { total: 0, thisMonth: 0, active: 0 },
    historicalStats: { totalRecords: 0, totalCases: 0, dateRange: '-' },
  });
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [historicalData, setHistoricalData] = useState<any[]>([]); // Historical statistics for charts
  const [isIndividualCasesReportOpen, setIsIndividualCasesReportOpen] = useState(false);
  const [isHistoricalStatsReportOpen, setIsHistoricalStatsReportOpen] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'individual-cases' | 'historical-statistics'>('individual-cases');

  // Time range state
  const [timeRange, setTimeRange] = useState<6 | 12 | 24 | 'all'>(24);

  // Fetch summary statistics and barangays
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch barangays
        const barangaysRes = await fetch('/api/barangays');
        const barangaysData = await barangaysRes.json();
        if (barangaysData.success) {
          setBarangays(barangaysData.data || []);
        }

        // Fetch individual cases statistics
        const diseasesRes = await fetch('/api/diseases');
        const diseasesData = await diseasesRes.json();
        const diseases = diseasesData.data || [];

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthCases = diseases.filter((d: any) => {
          const diagnosisDate = new Date(d.diagnosis_date);
          return diagnosisDate >= startOfMonth;
        }).length;

        const activeCases = diseases.filter((d: any) =>
          d.status === 'active' || d.status === 'ongoing_treatment'
        ).length;

        // Fetch historical statistics
        const historicalRes = await fetch('/api/diseases/historical');
        const historicalData = await historicalRes.json();
        const historical = historicalData.data || [];
        const summary = historicalData.summary || {};

        // Store diseases for charts
        setDiseases(diseases);
        // Store historical data for charts
        setHistoricalData(historical);

        setStats({
          individualCases: {
            total: diseases.length,
            thisMonth: thisMonthCases,
            active: activeCases,
          },
          historicalStats: {
            totalRecords: historical.length,
            totalCases: summary.totalCases || 0,
            dateRange: summary.earliestDate && summary.latestDate
              ? `${new Date(summary.earliestDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${new Date(summary.latestDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
              : '-',
          },
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardLayout
      roleId={5}
      pageTitle="Disease Surveillance Reports"
      pageDescription="Generate and export comprehensive disease surveillance reports with professional formatting"
    >
      <Container size="full">
        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('individual-cases')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'individual-cases'
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Individual Cases
              </div>
            </button>
            <button
              onClick={() => setActiveTab('historical-statistics')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === 'historical-statistics'
                    ? 'border-primary-teal text-primary-teal'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Historical Statistics
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'individual-cases' ? (
          <div className="space-y-8">
            {/* Individual Cases Statistics */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-teal" />
                Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Individual Cases Stats */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Individual Disease Cases</h3>
                <Activity className="w-5 h-5 text-primary-teal" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total Cases:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {loading ? '...' : stats.individualCases.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">This Month:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {loading ? '...' : stats.individualCases.thisMonth.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Active Cases:</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {loading ? '...' : stats.individualCases.active.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Geographic Coverage */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Geographic Coverage</h3>
                <TrendingUp className="w-5 h-5 text-teal-600" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Total Barangays:</span>
                  <span className="text-lg font-bold text-gray-900">
                    {loading ? '...' : barangays.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">City:</span>
                  <span className="text-sm font-semibold text-teal-600">
                    Panabo City
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Province:</span>
                  <span className="text-xs font-medium text-gray-700">
                    Davao del Norte
                  </span>
                </div>
              </div>
            </div>
              </div>
            </div>

            {/* Individual Cases Report Generator */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-teal" />
                Generate Report
              </h2>
              {/* Individual Cases Report Card */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg shadow-md border border-teal-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-teal rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Individual Cases Report
                  </h3>
                  <p className="text-sm text-gray-700 mb-4">
                    Generate detailed reports for individual disease cases with patient information,
                    severity levels, and treatment status. Includes filtering by disease type,
                    barangay, and date range.
                  </p>
                  <ul className="text-xs text-gray-600 space-y-1 mb-4">
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary-teal rounded-full"></div>
                      Patient-level case data with severity and status
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary-teal rounded-full"></div>
                      Advanced filtering by disease, barangay, date
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary-teal rounded-full"></div>
                      Professional PDF format with summary statistics
                    </li>
                  </ul>
                </div>
              </div>
              <button
                onClick={() => setIsIndividualCasesReportOpen(true)}
                className="w-full px-4 py-3 bg-primary-teal text-white rounded-md hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Generate Individual Cases Report
              </button>
              </div>
            </div>

            {/* Trend Analysis Charts */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-teal" />
                  Trend Analysis
                </h2>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Time Range:</label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value === 'all' ? 'all' : Number(e.target.value) as 6 | 12 | 24)}
                    className="px-4 py-2 border border-teal-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  >
                    <option value={6}>Last 6 Months</option>
                    <option value={12}>Last 12 Months</option>
                    <option value={24}>Last 24 Months</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
          <DiseaseChartsSection
            individualCases={diseases}
            barangays={barangays}
            isLoading={loading}
            onRefresh={() => {
              // Trigger refetch of data
              setLoading(true);
              // The useEffect will handle the actual fetching
              window.location.reload();
            }}
            timeRangeMonths={timeRange}
          />
            </div>

            {/* Quick Links */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary-teal mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-teal-900 mb-2">Quick Access</h4>
              <ul className="text-sm text-teal-800 space-y-2">
                <li className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    To enter new disease cases, visit the{' '}
                    <a
                      href="/staff/disease-surveillance"
                      className="font-semibold underline hover:text-teal-900"
                    >
                      Disease Surveillance
                    </a>{' '}
                    page
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>
                    Reports support PDF export and direct printing with professional formatting
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>
                    Use filters to generate focused reports for specific diseases, time periods, or barangays
                  </span>
                </li>
              </ul>
            </div>
          </div>
            </div>
          </div>
        ) : (
          /* Historical Statistics Tab */
          <div className="space-y-8">
            {/* Historical Statistics Overview */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary-teal" />
                Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Historical Statistics */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Historical Statistics</h3>
                    <Database className="w-5 h-5 text-primary-teal" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Total Records:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {loading ? '...' : stats.historicalStats.totalRecords.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Aggregate Cases:</span>
                      <span className="text-sm font-semibold text-primary-teal">
                        {loading ? '...' : stats.historicalStats.totalCases.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Date Range:</span>
                      <span className="text-xs font-medium text-gray-700">
                        {loading ? '...' : stats.historicalStats.dateRange}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Data Coverage */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">Data Coverage</h3>
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Barangays with Data:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {loading ? '...' : new Set(historicalData.filter(h => h.barangay_id).map(h => h.barangay_id)).size}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Coverage Period:</span>
                      <span className="text-sm font-semibold text-teal-600">
                        {loading ? '...' : stats.historicalStats.dateRange}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Total Records:</span>
                      <span className="text-xs font-medium text-gray-700">
                        {loading ? '...' : stats.historicalStats.totalRecords.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Statistics Report Generator */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-teal" />
                Generate Report
              </h2>
              {/* Historical Statistics Report Card */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg shadow-md border border-teal-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-teal rounded-lg flex items-center justify-center flex-shrink-0">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Historical Statistics Report
                    </h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Generate aggregate historical disease statistics from DOH bulletins, CHO records,
                      and imported data. Perfect for trend analysis and long-term disease surveillance.
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1 mb-4">
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary-teal rounded-full"></div>
                        Aggregate case counts by disease and barangay
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary-teal rounded-full"></div>
                        Historical data from multiple sources (DOH, CHO)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-primary-teal rounded-full"></div>
                        Time-series analysis for pattern identification
                      </li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoricalStatsReportOpen(true)}
                  className="w-full px-4 py-3 bg-primary-teal text-white rounded-md hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 font-medium shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Generate Historical Statistics Report
                </button>
              </div>
            </div>

            {/* Trend Analysis Charts */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-teal" />
                  Trend Analysis
                </h2>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Time Range:</label>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value === 'all' ? 'all' : Number(e.target.value) as 6 | 12 | 24)}
                    className="px-4 py-2 border border-teal-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  >
                    <option value={6}>Last 6 Months</option>
                    <option value={12}>Last 12 Months</option>
                    <option value={24}>Last 24 Months</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
              <HistoricalChartsSection
                historicalStatistics={historicalData}
                barangays={barangays}
                isLoading={loading}
                onRefresh={() => {
                  // Trigger refetch of data
                  setLoading(true);
                  // The useEffect will handle the actual fetching
                  window.location.reload();
                }}
                timeRangeMonths={timeRange}
              />
            </div>

            {/* Quick Links */}
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-primary-teal mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-teal-900 mb-2">Quick Access</h4>
                  <ul className="text-sm text-teal-800 space-y-2">
                    <li className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        To enter new disease cases, visit the{' '}
                        <a
                          href="/staff/disease-surveillance"
                          className="font-semibold underline hover:text-teal-900"
                        >
                          Disease Surveillance
                        </a>{' '}
                        page
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>
                        Reports support PDF export and direct printing with professional formatting
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>
                        Use filters to generate focused reports for specific diseases, time periods, or barangays
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Generator Modals */}
        <IndividualCasesReportGenerator
          isOpen={isIndividualCasesReportOpen}
          onClose={() => setIsIndividualCasesReportOpen(false)}
          barangays={barangays}
        />

        <HistoricalStatisticsReportGenerator
          isOpen={isHistoricalStatsReportOpen}
          onClose={() => setIsHistoricalStatsReportOpen(false)}
          barangays={barangays}
        />
      </Container>
    </DashboardLayout>
  );
}
