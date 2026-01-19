'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import ReportsCharts from '@/components/healthcare-admin/ReportsCharts';
import ReportsFilters from '@/components/healthcare-admin/ReportsFilters';
import AppointmentListTable from '@/components/healthcare-admin/AppointmentListTable';
import PatientListTable from '@/components/healthcare-admin/PatientListTable';
import ExportButtons from '@/components/healthcare-admin/ExportButtons';
import HealthCardSARIMAChart from '@/components/healthcare-admin/HealthCardSARIMAChart';
import HealthCardSARIMAMetrics from '@/components/healthcare-admin/HealthCardSARIMAMetrics';
import ServiceSARIMAChart from '@/components/healthcare-admin/ServiceSARIMAChart';
import ServiceSARIMAMetrics from '@/components/healthcare-admin/ServiceSARIMAMetrics';
import { getHealthCardType, isHealthCardService } from '@/lib/utils/healthcardHelpers';
import type { HealthCardType } from '@/types/healthcard';
import { Sparkles, CheckCircle2, XCircle } from 'lucide-react';

interface ServiceData {
  id: number;
  name: string;
  requires_appointment: boolean;
  requires_medical_record: boolean;
}

export default function HealthcareAdminReportsPage() {
  const { user } = useAuth();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date filters - default to last 30 days
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [barangayId, setBarangayId] = useState<number | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'patients' | 'healthcard-forecast'>('overview');

  // Track if filters have changed (to trigger re-fetch)
  const [filtersKey, setFiltersKey] = useState(0);

  // Data states for export
  const [appointmentsData, setAppointmentsData] = useState<any>(null);
  const [patientsData, setPatientsData] = useState<any>(null);
  const [sarimaData, setSarimaData] = useState<any>(null);
  const [sarimaMetrics, setSarimaMetrics] = useState<any>(null);
  const [overviewData, setOverviewData] = useState<any>(null);

  // Service predictions state
  const [isGeneratingPredictions, setIsGeneratingPredictions] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const [predictionRefreshKey, setPredictionRefreshKey] = useState(0);
  const [servicePredictionMetrics, setServicePredictionMetrics] = useState<any>(null);

  useEffect(() => {
    const fetchServiceInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError('Authentication required. Please log in.');
          return;
        }

        // Get user's profile with assigned service
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            role,
            assigned_service_id,
            services:assigned_service_id (
              id,
              name,
              requires_appointment,
              requires_medical_record
            )
          `)
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          setError('Failed to load your profile. Please try again.');
          return;
        }

        // Verify role
        if (profile.role !== 'healthcare_admin') {
          setError('Access denied. This page is for Healthcare Admins only.');
          return;
        }

        // Verify assigned service
        if (!profile.assigned_service_id) {
          setError('No service assigned to your account. Please contact the administrator.');
          return;
        }

        const serviceData = profile.services as any;
        if (!serviceData) {
          setError('Service information not found. Please contact the administrator.');
          return;
        }

        setService({
          id: serviceData.id,
          name: serviceData.name,
          requires_appointment: serviceData.requires_appointment,
          requires_medical_record: serviceData.requires_medical_record,
        });

      } catch (err) {
        console.error('Error fetching service info:', err);
        setError('An unexpected error occurred. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchServiceInfo();
  }, []);

  // Fetch report data for export
  useEffect(() => {
    const fetchReportData = async () => {
      if (!service) return;

      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
          service_id: service.id.toString(),
        });

        if (barangayId) params.append('barangay_id', barangayId.toString());

        // Fetch overview data (combines appointments + patients)
        if (activeTab === 'overview') {
          const tempOverviewData: any = {
            summary: {},
            table_data: [],
          };

          // Fetch appointments if service requires them
          if (service.requires_appointment) {
            const apptResponse = await fetch(`/api/healthcare-admin/reports/appointments?${params}`);
            if (apptResponse.ok) {
              const apptData = await apptResponse.json();
              setAppointmentsData(apptData.data);
              // Combine for overview
              tempOverviewData.summary = { ...tempOverviewData.summary, ...apptData.data.summary };
              tempOverviewData.table_data.push(...(apptData.data.table_data || []));
            }
          }

          // Fetch patients
          const patientResponse = await fetch(`/api/healthcare-admin/reports/patients?${params}`);
          if (patientResponse.ok) {
            const patientData = await patientResponse.json();
            setPatientsData(patientData.data);
            // Combine for overview
            tempOverviewData.summary = { ...tempOverviewData.summary, ...patientData.data.summary };
            // Don't duplicate table_data, keep separate tabs for detailed views
          }

          // Set overview data
          setOverviewData(tempOverviewData);
        }

        // Fetch service prediction metrics for non-HealthCard services
        if (!isHealthCardService(service.id) && activeTab === 'healthcard-forecast') {
          const servicePredParams = new URLSearchParams({
            service_id: service.id.toString(),
            days_back: '30',
            days_forecast: '30',
          });

          if (barangayId) servicePredParams.append('barangay_id', barangayId.toString());

          const servicePredResponse = await fetch(`/api/services/predictions?${servicePredParams}`);
          if (servicePredResponse.ok) {
            const servicePredData = await servicePredResponse.json();
            // Extract model_accuracy from metadata
            setServicePredictionMetrics(servicePredData.metadata?.model_accuracy || null);
          } else {
            setServicePredictionMetrics(null);
          }
        }

        // Fetch appointments data if service requires appointments
        if (service.requires_appointment && activeTab === 'appointments') {
          const apptResponse = await fetch(`/api/healthcare-admin/reports/appointments?${params}`);
          if (apptResponse.ok) {
            const apptData = await apptResponse.json();
            setAppointmentsData(apptData.data); // Extract inner data object
          }
        }

        // Fetch patients data
        if (activeTab === 'patients') {
          const patientParams = new URLSearchParams(params);
          const patientResponse = await fetch(`/api/healthcare-admin/reports/patients?${patientParams}`);
          if (patientResponse.ok) {
            const patientData = await patientResponse.json();
            setPatientsData(patientData.data); // Extract inner data object
          }
        }

        // Fetch SARIMA data if HealthCard service and forecast tab is active
        if (isHealthCardService(service.id) && activeTab === 'healthcard-forecast') {
          const healthcardType = getHealthCardType(service.id);
          const sarimaParams = new URLSearchParams({
            healthcard_type: healthcardType,
            days_back: '30',
            days_forecast: '30',
          });

          if (barangayId) sarimaParams.append('barangay_id', barangayId.toString());

          // Fetch export data for CSV/Excel
          const sarimaResponse = await fetch(`/api/healthcards/predictions/export?${sarimaParams}`);
          if (sarimaResponse.ok) {
            const sarimaResponseData = await sarimaResponse.json();
            setSarimaData(sarimaResponseData); // Store entire response for export
          }

          // Fetch chart data to get model_accuracy from API
          // This is the ONLY source for metrics display (calculated from overlapping data)
          const chartParams = new URLSearchParams({
            healthcard_type: healthcardType,
            days_back: '30',
            days_forecast: '30',
          });

          if (barangayId) chartParams.append('barangay_id', barangayId.toString());

          const chartResponse = await fetch(`/api/healthcards/predictions?${chartParams}`);
          if (chartResponse.ok) {
            const chartData = await chartResponse.json();
            // Extract model_accuracy from transformed data (null if < 5 overlapping points)
            setSarimaMetrics(chartData.data?.model_accuracy || null);
          } else {
            // If chart API fails, ensure metrics are null
            setSarimaMetrics(null);
          }
        }
      } catch (err) {
        console.error('Error fetching report data:', err);
      }
    };

    fetchReportData();
  }, [service, activeTab, filtersKey, startDate, endDate, barangayId]);

  const handleApplyFilters = () => {
    // Increment key to trigger re-render of child components
    setFiltersKey((prev) => prev + 1);
  };

  const handleGeneratePredictions = async () => {
    if (!service) return;

    setIsGeneratingPredictions(true);
    setGenerationStatus({ type: 'idle' });

    try {
      // Use different API endpoint for HealthCard vs other services
      const isHealthCard = isHealthCardService(service.id);
      const endpoint = isHealthCard ? '/api/healthcards/generate-predictions' : '/api/services/generate-predictions';

      const requestBody = isHealthCard
        ? {
            healthcard_type: getHealthCardType(service.id),
            barangay_id: barangayId || null,
            days_forecast: 30,
          }
        : {
            service_id: service.id,
            barangay_id: barangayId || null,
            days_forecast: 30,
            auto_save: true,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        const predictionsCount = isHealthCard
          ? data.data?.predictions?.length || 0
          : data.data?.predictions?.length || 0;

        setGenerationStatus({
          type: 'success',
          message: `Successfully generated ${predictionsCount} predictions for the next 30 days`,
        });

        // Force chart to reload with new cached predictions
        setPredictionRefreshKey((prev) => prev + 1);

        // Reload metrics
        if (isHealthCard) {
          const healthcardType = getHealthCardType(service.id);
          const chartParams = new URLSearchParams({
            healthcard_type: healthcardType,
            days_back: '30',
            days_forecast: '30',
          });
          if (barangayId) chartParams.append('barangay_id', barangayId.toString());

          const chartResponse = await fetch(`/api/healthcards/predictions?${chartParams}`);
          if (chartResponse.ok) {
            const chartData = await chartResponse.json();
            setSarimaMetrics(chartData.data?.model_accuracy || null);
          }
        } else {
          const servicePredParams = new URLSearchParams({
            service_id: service.id.toString(),
            days_back: '30',
            days_forecast: '30',
          });
          if (barangayId) servicePredParams.append('barangay_id', barangayId.toString());

          const servicePredResponse = await fetch(`/api/services/predictions?${servicePredParams}`);
          if (servicePredResponse.ok) {
            const servicePredData = await servicePredResponse.json();
            setServicePredictionMetrics(servicePredData.metadata?.model_accuracy || null);
          }
        }
      } else {
        setGenerationStatus({
          type: 'error',
          message: data.error || 'Failed to generate predictions',
        });
      }
    } catch (error) {
      console.error('Error generating predictions:', error);
      setGenerationStatus({
        type: 'error',
        message: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsGeneratingPredictions(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout
        roleId={user?.role_id || 2}
        pageTitle="Reports & Analytics"
        pageDescription="View detailed reports and analytics for your assigned service"
      >
        <Container size="full">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading reports...</p>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout
        roleId={user?.role_id || 2}
        pageTitle="Reports & Analytics"
        pageDescription="View detailed reports and analytics for your assigned service"
      >
        <Container size="full">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-2">Error Loading Reports</h3>
            <p>{error}</p>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  if (!service) {
    return null;
  }

  return (
    <DashboardLayout
      roleId={user?.role_id || 2}
      pageTitle="Reports & Analytics"
      pageDescription={`Reports for ${service.name}`}
    >
      <Container size="full">
        <div className="space-y-6">
          {/* Header with Service Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Service Type:{' '}
                  {service.requires_appointment && service.requires_medical_record && 'Appointment + Medical Records'}
                  {service.requires_appointment && !service.requires_medical_record && 'Appointment Only'}
                  {!service.requires_appointment && service.requires_medical_record && 'Walk-in + Medical Records'}
                  {!service.requires_appointment && !service.requires_medical_record && 'Walk-in Only'}
                </p>
              </div>
              <div>
                <ExportButtons
                  activeTab={activeTab}
                  serviceName={service.name}
                  startDate={startDate}
                  endDate={endDate}
                  barangayId={barangayId}
                  data={
                    activeTab === 'overview' ? overviewData :
                    activeTab === 'appointments' ? appointmentsData :
                    activeTab === 'patients' ? patientsData :
                    activeTab === 'healthcard-forecast' ? sarimaData :
                    null
                  }
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <ReportsFilters
            startDate={startDate}
            endDate={endDate}
            barangayId={barangayId}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onBarangayChange={setBarangayId}
            onApplyFilters={handleApplyFilters}
          />

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                {service.requires_appointment && (
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'appointments'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Appointments
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('patients')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'patients'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Patients
                </button>
                <button
                  onClick={() => setActiveTab('healthcard-forecast')}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'healthcard-forecast'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Service Forecasts
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab - Charts */}
              {activeTab === 'overview' && (
                <ReportsCharts
                  key={filtersKey} // Re-render when filters change
                  serviceId={service.id}
                  serviceName={service.name}
                  requiresAppointment={service.requires_appointment}
                  requiresMedicalRecord={service.requires_medical_record}
                  startDate={startDate}
                  endDate={endDate}
                  barangayId={barangayId}
                />
              )}

              {/* Appointments Tab - Table */}
              {activeTab === 'appointments' && service.requires_appointment && (
                <AppointmentListTable
                  key={filtersKey}
                  serviceId={service.id}
                  startDate={startDate}
                  endDate={endDate}
                  barangayId={barangayId}
                />
              )}

              {/* Patients Tab - Table */}
              {activeTab === 'patients' && (
                <PatientListTable
                  key={filtersKey}
                  serviceId={service.id}
                  requiresAppointment={service.requires_appointment}
                  requiresMedicalRecord={service.requires_medical_record}
                  startDate={startDate}
                  endDate={endDate}
                  barangayId={barangayId}
                />
              )}

              {/* Service Forecasts Tab - SARIMA Predictions */}
              {activeTab === 'healthcard-forecast' && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 mb-2">
                          {isHealthCardService(service.id)
                            ? 'HealthCard Issuance Forecasting (SARIMA)'
                            : `${service.name} Appointment Forecasting (SARIMA)`}
                        </h3>
                        <p className="text-sm text-blue-800">
                          {isHealthCardService(service.id)
                            ? 'This chart shows historical health card issuances and AI-predicted future demand for your assigned service. Use these insights to optimize staffing and resource allocation.'
                            : `This chart shows historical appointment bookings and AI-predicted future demand for ${service.name}. Use these insights to optimize staffing and resource allocation.`}
                        </p>
                      </div>
                      <button
                        onClick={handleGeneratePredictions}
                        disabled={isGeneratingPredictions}
                        className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap ${
                          isHealthCardService(service.id)
                            ? 'bg-yellow-600 hover:bg-yellow-700'
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        {isGeneratingPredictions ? 'Generating...' : 'Generate Predictions'}
                      </button>
                    </div>
                  </div>

                  {/* Status Messages */}
                  {generationStatus.type !== 'idle' && (
                    <div
                      className={`rounded-lg p-4 flex items-start gap-3 ${
                        generationStatus.type === 'success'
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      {generationStatus.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            generationStatus.type === 'success' ? 'text-green-900' : 'text-red-900'
                          }`}
                        >
                          {generationStatus.type === 'success' ? 'Success' : 'Error'}
                        </p>
                        <p
                          className={`text-sm mt-1 ${
                            generationStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                          }`}
                        >
                          {generationStatus.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {isHealthCardService(service.id) ? (
                    <>
                      <HealthCardSARIMAChart
                        key={predictionRefreshKey} // Force reload when predictions are regenerated
                        healthcardType={getHealthCardType(service.id) as HealthCardType}
                        barangayId={barangayId || null}
                        daysBack={30}
                        daysForecast={30}
                        showTitle={true}
                        height={450}
                      />

                      {/* Only show metrics section if metrics are available */}
                      {sarimaMetrics && (
                        <HealthCardSARIMAMetrics
                          metrics={sarimaMetrics}
                          showDetails={true}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <ServiceSARIMAChart
                        key={predictionRefreshKey} // Force reload when predictions are regenerated
                        serviceId={service.id}
                        serviceName={service.name}
                        barangayId={barangayId || null}
                        daysBack={30}
                        daysForecast={30}
                        showTitle={true}
                        height={450}
                      />

                      {/* Only show metrics section if metrics are available */}
                      {servicePredictionMetrics && (
                        <ServiceSARIMAMetrics
                          metrics={servicePredictionMetrics}
                          showDetails={true}
                          dataPointsCount={servicePredictionMetrics.data_points_count}
                          dataQuality={servicePredictionMetrics.data_quality}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> All reports are filtered to show data specific to your assigned service ({service.name}).
              {service.requires_medical_record && ' Disease case reports are based on medical records you have created.'}
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
