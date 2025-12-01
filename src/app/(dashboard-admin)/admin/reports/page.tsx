'use client';

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  Users,
  Activity,
  MessageSquare,
  BarChart3,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useToast } from '@/lib/contexts/ToastContext';
import type { ReportType } from '@/types/reports';

export default function SuperAdminReportsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ReportType>('appointments');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Date range state (default: last 30 days)
  const [startDate, setStartDate] = useState<string>(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Filter states
  const [barangayId, setBarangayId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // Options for filters (to be fetched)
  const [barangays, setBarangays] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch report when tab changes
  useEffect(() => {
    if (activeTab) {
      generateReport();
    }
  }, [activeTab]);

  const fetchFilterOptions = async () => {
    try {
      // Fetch barangays
      const barangaysRes = await fetch('/api/barangays');
      if (barangaysRes.ok) {
        const data = await barangaysRes.json();
        setBarangays(data.barangays || []);
      }

      // Note: Services and doctors APIs may need to be created
      // For now, we'll leave these empty
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (barangayId) filters.barangay_id = parseInt(barangayId);
      if (serviceId) filters.service_id = parseInt(serviceId);
      if (doctorId) filters.doctor_id = doctorId;
      if (status) filters.status = status;

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: activeTab,
          start_date: startDate,
          end_date: endDate,
          filters,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportData(data.report);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    toast.info('PDF export functionality coming soon');
  };

  const exportToCSV = () => {
    toast.info('CSV export functionality coming soon');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Reports & Analytics"
      pageDescription="Comprehensive reports and insights for the City Health Office"
    >
      <Container size="full">
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex justify-end gap-2 print:hidden">
            <Button
              onClick={exportToPDF}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-6 print:hidden">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Report Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Conditional filters based on active tab */}
              {(activeTab === 'appointments' || activeTab === 'disease_surveillance' || activeTab === 'patient_registration') && barangays.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay
                  </label>
                  <select
                    value={barangayId}
                    onChange={(e) => setBarangayId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Barangays</option>
                    {barangays.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'appointments' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={generateReport}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Report Tabs */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ReportType)}>
            <TabsList className="grid w-full grid-cols-5 mb-6 print:hidden">
              <TabsTrigger value="appointments" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Appointments</span>
              </TabsTrigger>
              <TabsTrigger value="disease_surveillance" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Disease</span>
              </TabsTrigger>
              <TabsTrigger value="patients" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Patients</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Feedback</span>
              </TabsTrigger>
              <TabsTrigger value="system_overview" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <TabsContent value="appointments">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Appointments Report</h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    {reportData.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 bg-blue-50">
                          <p className="text-sm text-gray-600">Total Appointments</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {reportData.summary.total_appointments}
                          </p>
                        </Card>
                        <Card className="p-4 bg-green-50">
                          <p className="text-sm text-gray-600">Completed</p>
                          <p className="text-3xl font-bold text-green-600">
                            {reportData.summary.completed}
                          </p>
                        </Card>
                        <Card className="p-4 bg-red-50">
                          <p className="text-sm text-gray-600">Cancelled</p>
                          <p className="text-3xl font-bold text-red-600">
                            {reportData.summary.cancelled}
                          </p>
                        </Card>
                        <Card className="p-4 bg-amber-50">
                          <p className="text-sm text-gray-600">No Show</p>
                          <p className="text-3xl font-bold text-amber-600">
                            {reportData.summary.no_show}
                          </p>
                        </Card>
                      </div>
                    )}

                    {/* Raw Data (for debugging) */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        View Raw Data
                      </summary>
                      <pre className="mt-2 bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                        {JSON.stringify(reportData, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <p className="text-gray-500">Click "Generate Report" to view data</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="disease_surveillance">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Disease Surveillance Report</h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    {reportData.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 bg-blue-50">
                          <p className="text-sm text-gray-600">Total Cases</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {reportData.summary.total_cases}
                          </p>
                        </Card>
                        <Card className="p-4 bg-green-50">
                          <p className="text-sm text-gray-600">Active Cases</p>
                          <p className="text-3xl font-bold text-green-600">
                            {reportData.summary.active_cases}
                          </p>
                        </Card>
                        <Card className="p-4 bg-purple-50">
                          <p className="text-sm text-gray-600">Recovered</p>
                          <p className="text-3xl font-bold text-purple-600">
                            {reportData.summary.recovered_cases}
                          </p>
                        </Card>
                        <Card className="p-4 bg-red-50">
                          <p className="text-sm text-gray-600">Critical</p>
                          <p className="text-3xl font-bold text-red-600">
                            {reportData.summary.critical_cases}
                          </p>
                        </Card>
                      </div>
                    )}

                    {/* Raw Data */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        View Raw Data
                      </summary>
                      <pre className="mt-2 bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                        {JSON.stringify(reportData, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <p className="text-gray-500">Click "Generate Report" to view data</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="patients">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Patient Registration Report</h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    {reportData.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 bg-blue-50">
                          <p className="text-sm text-gray-600">Total Patients</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {reportData.summary.total_patients}
                          </p>
                        </Card>
                        <Card className="p-4 bg-green-50">
                          <p className="text-sm text-gray-600">Active</p>
                          <p className="text-3xl font-bold text-green-600">
                            {reportData.summary.active}
                          </p>
                        </Card>
                        <Card className="p-4 bg-amber-50">
                          <p className="text-sm text-gray-600">Pending</p>
                          <p className="text-3xl font-bold text-amber-600">
                            {reportData.summary.pending}
                          </p>
                        </Card>
                        <Card className="p-4 bg-red-50">
                          <p className="text-sm text-gray-600">Rejected</p>
                          <p className="text-3xl font-bold text-red-600">
                            {reportData.summary.rejected}
                          </p>
                        </Card>
                      </div>
                    )}

                    {/* Raw Data */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        View Raw Data
                      </summary>
                      <pre className="mt-2 bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                        {JSON.stringify(reportData, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <p className="text-gray-500">Click "Generate Report" to view data</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="feedback">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Feedback & Satisfaction Report</h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    {reportData.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 bg-blue-50">
                          <p className="text-sm text-gray-600">Total Feedback</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {reportData.summary.total_feedback}
                          </p>
                        </Card>
                        <Card className="p-4 bg-green-50">
                          <p className="text-sm text-gray-600">Avg Rating</p>
                          <p className="text-3xl font-bold text-green-600">
                            {reportData.summary.avg_overall_rating}
                          </p>
                        </Card>
                        <Card className="p-4 bg-purple-50">
                          <p className="text-sm text-gray-600">Would Recommend</p>
                          <p className="text-3xl font-bold text-purple-600">
                            {reportData.summary.would_recommend_percentage}%
                          </p>
                        </Card>
                        <Card className="p-4 bg-amber-50">
                          <p className="text-sm text-gray-600">Response Rate</p>
                          <p className="text-3xl font-bold text-amber-600">
                            {reportData.summary.response_rate}%
                          </p>
                        </Card>
                      </div>
                    )}

                    {/* Raw Data */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        View Raw Data
                      </summary>
                      <pre className="mt-2 bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                        {JSON.stringify(reportData, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <p className="text-gray-500">Click "Generate Report" to view data</p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="system_overview">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Health Office Overview</h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    {reportData.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 bg-blue-50">
                          <p className="text-sm text-gray-600">Total Appointments</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {reportData.summary.total_appointments}
                          </p>
                        </Card>
                        <Card className="p-4 bg-green-50">
                          <p className="text-sm text-gray-600">Disease Cases</p>
                          <p className="text-3xl font-bold text-green-600">
                            {reportData.summary.total_disease_cases}
                          </p>
                        </Card>
                        <Card className="p-4 bg-purple-50">
                          <p className="text-sm text-gray-600">New Patients</p>
                          <p className="text-3xl font-bold text-purple-600">
                            {reportData.summary.new_patients}
                          </p>
                        </Card>
                        <Card className="p-4 bg-amber-50">
                          <p className="text-sm text-gray-600">Avg Satisfaction</p>
                          <p className="text-3xl font-bold text-amber-600">
                            {reportData.summary.avg_feedback_rating}
                          </p>
                        </Card>
                      </div>
                    )}

                    {/* Raw Data */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        View Raw Data
                      </summary>
                      <pre className="mt-2 bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                        {JSON.stringify(reportData, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <p className="text-gray-500">Click "Generate Report" to view data</p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Print-only styles */}
        <style jsx global>{`
          @media print {
            nav, aside, header, .print\\:hidden {
              display: none !important;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}</style>
      </Container>
    </DashboardLayout>
  );
}
