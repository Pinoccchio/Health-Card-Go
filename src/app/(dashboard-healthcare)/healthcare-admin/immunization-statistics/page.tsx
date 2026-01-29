'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuth } from '@/lib/auth';
import {
  Syringe,
  Activity,
  Calendar,
  MapPin,
  TrendingUp,
  FileText,
  Download,
  Filter,
  AlertCircle,
  Sparkles,
  Loader2,
  CheckCircle2,
  Upload,
  Baby,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import ServiceHistoricalImportModal from '@/components/healthcare-admin/ServiceHistoricalImportModal';
import ServiceSARIMAChart from '@/components/healthcare-admin/ServiceSARIMAChart';
import ServiceSARIMAMetrics from '@/components/healthcare-admin/ServiceSARIMAMetrics';
import { AppointmentStatusChart } from '@/components/charts';

export default function ImmunizationStatisticsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Determine which service this admin is assigned to (19 = Child Immunization, 20 = Adult Vaccination)
  const [assignedServiceId, setAssignedServiceId] = useState<number | null>(null);
  const [serviceName, setServiceName] = useState<string>('');

  // Import and SARIMA state
  const [isAppointmentImportOpen, setIsAppointmentImportOpen] = useState(false);
  const [predictionRefreshKey, setPredictionRefreshKey] = useState(0);
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });

  // Appointment Statistics state (for status breakdown chart)
  const [appointmentStats, setAppointmentStats] = useState<any[]>([]);
  const [appointmentStatsLoading, setAppointmentStatsLoading] = useState(true);

  // Summary stats
  const [summary, setSummary] = useState({
    total_appointments: 0,
    completed: 0,
    scheduled: 0,
    cancelled: 0,
    no_show: 0,
  });

  useEffect(() => {
    // Check if the healthcare admin has child_immunization or adult_vaccination category
    if (user) {
      const isChildImmunizationAdmin = user.role_id === 2 && user.admin_category === 'child_immunization';
      const isAdultVaccinationAdmin = user.role_id === 2 && user.admin_category === 'adult_vaccination';
      const isSuperAdmin = user.role_id === 1;

      if (!isChildImmunizationAdmin && !isAdultVaccinationAdmin && !isSuperAdmin) {
        setHasAccess(false);
        toast.error('You do not have permission to access this page. This page is only for Healthcare Admins with Child Immunization or Adult Vaccination category.');
        router.push('/healthcare-admin/dashboard');
      } else {
        setHasAccess(true);
        // Set assigned service info
        if (user.assigned_service_id) {
          setAssignedServiceId(user.assigned_service_id);
          if (user.assigned_service_id === 19) {
            setServiceName('Child Immunization');
          } else if (user.assigned_service_id === 20) {
            setServiceName('Adult Vaccination');
          }
        }
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (hasAccess && assignedServiceId) {
      fetchAppointmentStatistics();
    }
  }, [hasAccess, assignedServiceId]);

  const fetchAppointmentStatistics = async () => {
    if (!assignedServiceId) return;

    try {
      setAppointmentStatsLoading(true);
      const response = await fetch(`/api/appointments/statistics?service_id=${assignedServiceId}`);
      const data = await response.json();

      if (data.success) {
        setAppointmentStats(data.data.monthly || []);

        // Calculate summary from the response
        const summaryData = data.data.summary || {};
        setSummary({
          total_appointments: summaryData.total || 0,
          completed: summaryData.completed || 0,
          scheduled: summaryData.scheduled || 0,
          cancelled: summaryData.cancelled || 0,
          no_show: summaryData.no_show || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching appointment statistics:', err);
    } finally {
      setAppointmentStatsLoading(false);
    }
  };

  const handleGeneratePredictions = async () => {
    if (!assignedServiceId) {
      toast.error('No service assigned');
      return;
    }

    setIsGeneratingPredictions(true);
    setGenerationStatus({ type: 'idle' });

    try {
      const response = await fetch('/api/services/generate-predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: assignedServiceId,
          months_forecast: 12,
          granularity: 'monthly',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGenerationStatus({ type: 'success', message: `Generated predictions for ${data.data?.saved_count || data.data?.forecast_periods || 0} months` });
        setPredictionRefreshKey(prev => prev + 1);
        toast.success('Predictions generated successfully');
      } else {
        setGenerationStatus({ type: 'error', message: data.error || 'Failed to generate predictions' });
        toast.error(data.error || 'Failed to generate predictions');
      }
    } catch (error) {
      console.error('Generate predictions error:', error);
      setGenerationStatus({ type: 'error', message: 'An unexpected error occurred' });
      toast.error('An unexpected error occurred');
    } finally {
      setIsGeneratingPredictions(false);
    }
  };

  // Show loading state while checking access
  if (hasAccess === null || loading) {
    return (
      <DashboardLayout
        roleId={2}
        pageTitle="Immunization Statistics"
        pageDescription="Manage immunization appointment data"
      >
        <Container size="full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#20C997]"></div>
              <p className="mt-2 text-sm text-gray-500">Checking access permissions...</p>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  // Show access denied message if no access
  if (hasAccess === false) {
    return (
      <DashboardLayout
        roleId={2}
        pageTitle="Immunization Statistics"
        pageDescription="Access Denied"
      >
        <Container size="full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="p-3 bg-red-100 rounded-full inline-block mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">
                You do not have permission to access this page. This page is only available to Healthcare Admins with Immunization category.
              </p>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  const ServiceIcon = assignedServiceId === 19 ? Baby : Users;

  return (
    <DashboardLayout
      roleId={2}
      pageTitle="Immunization Statistics"
      pageDescription={`Track and manage ${serviceName} appointment data`}
    >
      <Container size="full">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-teal-100 rounded-lg">
                <Syringe className="w-6 h-6 text-[#20C997]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{serviceName} Statistics</h1>
                <p className="text-sm text-gray-600">Monitor and track {serviceName.toLowerCase()} appointments and demand forecasting</p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-end gap-3">
            <a
              href={`/templates/${assignedServiceId === 19 ? 'child-immunization' : 'adult-vaccination'}-appointment-import-template.xlsx`}
              download
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
              title="Download Excel Template"
            >
              <Download className="w-4 h-4" />
              Download Template
            </a>
            <button
              onClick={() => setIsAppointmentImportOpen(true)}
              className="px-4 py-2 bg-[#20C997] text-white rounded-md hover:bg-[#1AA179] transition-colors flex items-center gap-2 shadow-sm"
              title="Import Appointment Data"
            >
              <Upload className="w-4 h-4" />
              Import Appointment Data
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-700">Total Appointments</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.total_appointments}</p>
            </div>

            <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="text-sm font-medium text-green-700">Completed</h3>
              </div>
              <p className="text-2xl font-bold text-green-900">{summary.completed}</p>
            </div>

            <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-blue-700">Scheduled</h3>
              </div>
              <p className="text-2xl font-bold text-blue-900">{summary.scheduled}</p>
            </div>

            <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
                <h3 className="text-sm font-medium text-yellow-700">Cancelled</h3>
              </div>
              <p className="text-2xl font-bold text-yellow-900">{summary.cancelled}</p>
            </div>

            <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-medium text-red-700">No Show</h3>
              </div>
              <p className="text-2xl font-bold text-red-900">{summary.no_show}</p>
            </div>
          </div>

          {/* Appointment Status Breakdown Chart */}
          <AppointmentStatusChart
            data={appointmentStats}
            loading={appointmentStatsLoading}
            title={`Monthly ${serviceName} Appointment Status Breakdown (Completed, Cancelled, No Show)`}
            height={450}
          />

          {/* SARIMA Predictions Section */}
          {assignedServiceId && (
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-teal-500 to-blue-500 rounded-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{serviceName} Appointment Forecast (SARIMA)</h3>
                      <p className="text-sm text-gray-600">SARIMA predictions for {serviceName.toLowerCase()} demand</p>
                    </div>
                  </div>
                  <button
                    onClick={handleGeneratePredictions}
                    disabled={isGeneratingPredictions}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#20C997] text-white rounded-lg hover:bg-[#1AA179] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isGeneratingPredictions ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Predictions
                      </>
                    )}
                  </button>
                </div>
                {generationStatus.type !== 'idle' && (
                  <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                    generationStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    {generationStatus.type === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <p className={`text-sm ${generationStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                      {generationStatus.message}
                    </p>
                  </div>
                )}
              </div>
              <div className="p-6">
                <ServiceSARIMAChart key={predictionRefreshKey} serviceId={assignedServiceId} />
                <div className="mt-6">
                  <ServiceSARIMAMetrics key={predictionRefreshKey} serviceId={assignedServiceId} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Appointment Import Modal */}
        {assignedServiceId && (
          <ServiceHistoricalImportModal
            isOpen={isAppointmentImportOpen}
            onClose={() => setIsAppointmentImportOpen(false)}
            onImportSuccess={() => {
              toast.success('Appointment data imported successfully');
              fetchAppointmentStatistics();
              setPredictionRefreshKey(prev => prev + 1);
            }}
            serviceId={assignedServiceId}
            serviceName={serviceName}
          />
        )}
      </Container>
    </DashboardLayout>
  );
}
