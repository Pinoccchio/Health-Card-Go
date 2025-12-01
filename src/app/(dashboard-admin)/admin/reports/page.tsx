'use client';

import { useState, useEffect, useRef } from 'react';
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
  X,
  Filter,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, ProfessionalCard } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useToast } from '@/lib/contexts/ToastContext';
import type { ReportType } from '@/types/reports';
import { ReportSummaryCards } from '@/components/reports/ReportSummaryCards';
import {
  AppointmentTrendChart,
  AppointmentStatusChart,
  AppointmentByServiceChart,
} from '@/components/reports/charts/AppointmentCharts';
import {
  DiseaseDistributionChart,
  DiseaseTrendChart,
  DiseaseByBarangayChart,
  DiseaseSeverityChart,
} from '@/components/reports/charts/DiseaseCharts';
import {
  PatientRegistrationTrendChart,
  PatientStatusChart,
  PatientByBarangayChart,
  PatientAgeDistributionChart,
} from '@/components/reports/charts/PatientCharts';
import {
  FeedbackRatingDistributionChart,
  FeedbackByServiceChart,
  FeedbackRecommendationChart,
  FeedbackTrendChart,
  FeedbackByDoctorChart,
} from '@/components/reports/charts/FeedbackCharts';
import { exportToCSV, exportToPDF, prepareSummaryForPDF, getChartCanvases } from '@/lib/utils/reportExport';

export default function SuperAdminReportsPage() {
  const toast = useToast();
  const chartsContainerRef = useRef<HTMLDivElement>(null);
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

  // Options for filters
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

      // Fetch services
      try {
        const servicesRes = await fetch('/api/admin/services');
        if (servicesRes.ok) {
          const data = await servicesRes.json();
          setServices(data.services || []);
        }
      } catch (error) {
        console.log('Services API not available');
      }

      // Fetch doctors
      try {
        const doctorsRes = await fetch('/api/doctors');
        if (doctorsRes.ok) {
          const data = await doctorsRes.json();
          setDoctors(data.doctors || []);
        }
      } catch (error) {
        console.log('Doctors API not available');
      }
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
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToPDF = () => {
    try {
      if (!reportData) {
        toast.error('No report data to export');
        return;
      }

      const reportTitles: Record<ReportType, string> = {
        appointments: 'Appointments Report',
        disease_surveillance: 'Disease Surveillance Report',
        patients: 'Patient Registration Report',
        feedback: 'Feedback & Satisfaction Report',
        system_overview: 'Health Office Overview Report',
      };

      // Get chart canvases
      const charts: Array<{ title: string; canvas: HTMLCanvasElement }> = [];
      if (chartsContainerRef.current) {
        const canvases = chartsContainerRef.current.querySelectorAll('canvas');
        canvases.forEach((canvas, index) => {
          charts.push({
            title: `Chart ${index + 1}`,
            canvas: canvas as HTMLCanvasElement,
          });
        });
      }

      // Prepare summary data
      const summary = prepareSummaryForPDF(reportData.summary || {});

      // Export to PDF
      exportToPDF({
        title: reportTitles[activeTab],
        dateRange: { start: startDate, end: endDate },
        summary,
        charts,
        tables: [], // Add tables if needed
      });

      toast.success('Report exported to PDF successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleExportToCSV = () => {
    try {
      if (!reportData) {
        toast.error('No report data to export');
        return;
      }

      const reportTitles: Record<ReportType, string> = {
        appointments: 'Appointments_Report',
        disease_surveillance: 'Disease_Surveillance_Report',
        patients: 'Patient_Registration_Report',
        feedback: 'Feedback_Report',
        system_overview: 'System_Overview_Report',
      };

      // Prepare data for CSV
      let csvData: any[] = [];
      if (reportData.summary) {
        csvData = Object.entries(reportData.summary).map(([key, value]) => ({
          Metric: key.replace(/_/g, ' ').toUpperCase(),
          Value: value,
        }));
      }

      exportToCSV(csvData, reportTitles[activeTab]);
      toast.success('Report exported to CSV successfully');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const clearFilters = () => {
    setBarangayId('');
    setServiceId('');
    setDoctorId('');
    setStatus('');
    toast.info('Filters cleared');
  };

  const activeFiltersCount = [barangayId, serviceId, doctorId, status].filter(
    (f) => f !== ''
  ).length;

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
              onClick={handleExportToPDF}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!reportData}
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
            <Button
              onClick={handleExportToCSV}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!reportData}
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-teal" />
                Report Filters
              </h3>
              {activeFiltersCount > 0 && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  Clear Filters ({activeFiltersCount})
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                  />
                </div>
              </div>

              {/* Active Filter Badges */}
              {activeFiltersCount > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center gap-1 text-xs text-blue-700">
                    <Filter className="h-3 w-3" />
                    Active Filters:
                  </div>
                  {barangayId && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">
                      Barangay: {barangays.find((b) => b.id === parseInt(barangayId))?.name}
                      <button onClick={() => setBarangayId('')} className="hover:text-blue-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {serviceId && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">
                      Service: {services.find((s) => s.id === parseInt(serviceId))?.name}
                      <button onClick={() => setServiceId('')} className="hover:text-blue-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {doctorId && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">
                      Doctor
                      <button onClick={() => setDoctorId('')} className="hover:text-blue-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {status && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">
                      Status: {status}
                      <button onClick={() => setStatus('')} className="hover:text-blue-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}

              {/* Conditional Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Barangay Filter */}
                {barangays.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barangay
                    </label>
                    <select
                      value={barangayId}
                      onChange={(e) => setBarangayId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
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

                {/* Service Category Filter */}
                {services.length > 0 && activeTab === 'appointments' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Category
                    </label>
                    <select
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    >
                      <option value="">All Services</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Doctor Filter */}
                {doctors.length > 0 && (activeTab === 'appointments' || activeTab === 'feedback') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Doctor
                    </label>
                    <select
                      value={doctorId}
                      onChange={(e) => setDoctorId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
                    >
                      <option value="">All Doctors</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          Dr. {d.first_name} {d.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Status Filter */}
                {activeTab === 'appointments' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal"
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
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={generateReport}
                disabled={loading}
                className="flex items-center gap-2 bg-primary-teal hover:bg-primary-teal-dark text-white"
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

            {/* Appointments Report */}
            <TabsContent value="appointments">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-primary-teal" />
                  Appointments Report
                </h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6" ref={chartsContainerRef}>
                    {/* Summary Cards */}
                    <ReportSummaryCards reportType="appointments" data={reportData} />

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      <Card className="p-4">
                        <AppointmentTrendChart data={reportData} />
                      </Card>
                      <Card className="p-4">
                        <AppointmentStatusChart data={reportData} />
                      </Card>
                    </div>

                    {reportData.by_service && (
                      <Card className="p-4 mt-6">
                        <AppointmentByServiceChart data={reportData} />
                      </Card>
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
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Click "Generate Report" to view data</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Disease Surveillance Report */}
            <TabsContent value="disease_surveillance">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Activity className="h-6 w-6 text-primary-teal" />
                  Disease Surveillance Report
                </h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6" ref={chartsContainerRef}>
                    {/* Summary Cards */}
                    <ReportSummaryCards reportType="disease_surveillance" data={reportData} />

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      <Card className="p-4">
                        <DiseaseDistributionChart data={reportData} />
                      </Card>
                      <Card className="p-4">
                        <DiseaseSeverityChart data={reportData} />
                      </Card>
                    </div>

                    <Card className="p-4 mt-6">
                      <DiseaseTrendChart data={reportData} />
                    </Card>

                    {reportData.by_barangay && (
                      <Card className="p-4 mt-6">
                        <DiseaseByBarangayChart data={reportData} />
                      </Card>
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
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Click "Generate Report" to view data</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Patients Report */}
            <TabsContent value="patients">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary-teal" />
                  Patient Registration Report
                </h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6" ref={chartsContainerRef}>
                    {/* Summary Cards */}
                    <ReportSummaryCards reportType="patients" data={reportData} />

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      <Card className="p-4">
                        <PatientRegistrationTrendChart data={reportData} />
                      </Card>
                      <Card className="p-4">
                        <PatientStatusChart data={reportData} />
                      </Card>
                    </div>

                    {reportData.by_barangay && (
                      <Card className="p-4 mt-6">
                        <PatientByBarangayChart data={reportData} />
                      </Card>
                    )}

                    {reportData.by_age_group && (
                      <Card className="p-4 mt-6">
                        <PatientAgeDistributionChart data={reportData} />
                      </Card>
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
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Click "Generate Report" to view data</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Feedback Report */}
            <TabsContent value="feedback">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <MessageSquare className="h-6 w-6 text-primary-teal" />
                  Feedback & Satisfaction Report
                </h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6" ref={chartsContainerRef}>
                    {/* Summary Cards */}
                    <ReportSummaryCards reportType="feedback" data={reportData} />

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                      <Card className="p-4">
                        <FeedbackRatingDistributionChart data={reportData} />
                      </Card>
                      <Card className="p-4">
                        <FeedbackRecommendationChart data={reportData} />
                      </Card>
                    </div>

                    {reportData.trend_data && (
                      <Card className="p-4 mt-6">
                        <FeedbackTrendChart data={reportData} />
                      </Card>
                    )}

                    {reportData.by_service && (
                      <Card className="p-4 mt-6">
                        <FeedbackByServiceChart data={reportData} />
                      </Card>
                    )}

                    {reportData.by_doctor && (
                      <Card className="p-4 mt-6">
                        <FeedbackByDoctorChart data={reportData} />
                      </Card>
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
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Click "Generate Report" to view data</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* System Overview Report */}
            <TabsContent value="system_overview">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary-teal" />
                  Health Office Overview Report
                </h2>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-4 border-primary-teal border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportData ? (
                  <div className="space-y-6" ref={chartsContainerRef}>
                    {/* Summary Cards */}
                    <ReportSummaryCards reportType="system_overview" data={reportData} />

                    {/* Additional overview content can be added here */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">System Performance Metrics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {reportData.summary && Object.entries(reportData.summary).map(([key, value]) => (
                          <Card key={key} className="p-4">
                            <p className="text-sm text-gray-600 mb-1">
                              {key.replace(/_/g, ' ').toUpperCase()}
                            </p>
                            <p className="text-2xl font-bold text-gray-900">
                              {typeof value === 'number' ? value.toLocaleString() : value}
                            </p>
                          </Card>
                        ))}
                      </div>
                    </div>

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
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Click "Generate Report" to view data</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Container>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          @page {
            margin: 1cm;
            size: A4;
          }

          .print\\:hidden {
            display: none !important;
          }

          header,
          nav,
          aside,
          footer {
            display: none !important;
          }

          .no-print {
            display: none !important;
          }

          canvas {
            max-width: 100%;
            height: auto !important;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
