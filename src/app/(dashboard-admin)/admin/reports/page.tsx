'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container, Card } from '@/components/ui';
import AdminReportsFilters from '@/components/admin/reports/AdminReportsFilters';
import AdminExportButtons from '@/components/admin/reports/AdminExportButtons';
import AdminReportsCharts from '@/components/admin/reports/AdminReportsCharts';
import AppointmentReportTable from '@/components/admin/reports/AppointmentReportTable';
import PatientReportTable from '@/components/admin/reports/PatientReportTable';
import DiseaseReportTable from '@/components/admin/reports/DiseaseReportTable';
import FeedbackReportTable from '@/components/admin/reports/FeedbackReportTable';
import { BarChart3, Users, Activity, MessageSquare } from 'lucide-react';

type TabType = 'overview' | 'appointments' | 'patients' | 'diseases' | 'feedback';

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersKey, setFiltersKey] = useState(0);

  // Filter states
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [serviceId, setServiceId] = useState<number | undefined>(undefined);
  const [barangayId, setBarangayId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [diseaseType, setDiseaseType] = useState<string | undefined>(undefined);

  // Data states
  const [appointmentsData, setAppointmentsData] = useState<any>(null);
  const [patientsData, setPatientsData] = useState<any>(null);
  const [diseasesData, setDiseasesData] = useState<any>(null);
  const [feedbackData, setFeedbackData] = useState<any>(null);

  const handleApplyFilters = () => {
    setFiltersKey((prev) => prev + 1);
  };

  // Fetch data based on active tab and filters
  useEffect(() => {
    const fetchData = async () => {
      const fetchStartTime = Date.now();
      const fetchId = crypto.randomUUID().substring(0, 8);

      console.log(`[${fetchId}] 🔄 Admin Reports - Starting data fetch:`, {
        activeTab,
        filters: { startDate, endDate, serviceId, barangayId, status, diseaseType },
        timestamp: new Date().toISOString(),
      });

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          start_date: startDate,
          end_date: endDate,
        });

        if (barangayId) params.append('barangay_id', barangayId.toString());

        const errors: string[] = [];

        // Fetch appointments data
        if (activeTab === 'overview' || activeTab === 'appointments') {
          try {
            const apptParams = new URLSearchParams(params);
            if (serviceId) apptParams.append('service_id', serviceId.toString());
            if (status) apptParams.append('status', status);

            console.log(`[${fetchId}] 📊 Fetching appointments...`);
            const apptResponse = await fetch(`/api/admin/reports/appointments?${apptParams}`);

            if (!apptResponse.ok) {
              const errorText = await apptResponse.text();
              console.error(`[${fetchId}] ❌ Appointments fetch failed:`, {
                status: apptResponse.status,
                statusText: apptResponse.statusText,
                error: errorText,
              });
              errors.push(`Appointments (${apptResponse.status})`);
            } else {
              const apptData = await apptResponse.json();
              setAppointmentsData(apptData);
              console.log(`[${fetchId}] ✅ Appointments loaded:`, apptData.summary);
            }
          } catch (err) {
            console.error(`[${fetchId}] ❌ Appointments error:`, err);
            errors.push('Appointments (network error)');
          }
        }

        // Fetch patients data
        if (activeTab === 'overview' || activeTab === 'patients') {
          try {
            const patientParams = new URLSearchParams(params);
            if (status) patientParams.append('status', status);

            console.log(`[${fetchId}] 👥 Fetching patients...`);
            const patientResponse = await fetch(`/api/admin/reports/patients?${patientParams}`);

            if (!patientResponse.ok) {
              const errorText = await patientResponse.text();
              console.error(`[${fetchId}] ❌ Patients fetch failed:`, {
                status: patientResponse.status,
                statusText: patientResponse.statusText,
                error: errorText,
              });
              errors.push(`Patients (${patientResponse.status})`);
            } else {
              const patientData = await patientResponse.json();
              setPatientsData(patientData);
              console.log(`[${fetchId}] ✅ Patients loaded:`, patientData.summary);
            }
          } catch (err) {
            console.error(`[${fetchId}] ❌ Patients error:`, err);
            errors.push('Patients (network error)');
          }
        }

        // Fetch diseases data
        if (activeTab === 'overview' || activeTab === 'diseases') {
          try {
            const diseaseParams = new URLSearchParams(params);
            if (diseaseType) diseaseParams.append('disease_type', diseaseType);

            console.log(`[${fetchId}] 🦠 Fetching diseases...`);
            const diseaseResponse = await fetch(`/api/admin/reports/diseases?${diseaseParams}`);

            if (!diseaseResponse.ok) {
              const errorText = await diseaseResponse.text();
              console.error(`[${fetchId}] ❌ Diseases fetch failed:`, {
                status: diseaseResponse.status,
                statusText: diseaseResponse.statusText,
                error: errorText,
              });
              errors.push(`Diseases (${diseaseResponse.status})`);
            } else {
              const diseaseData = await diseaseResponse.json();
              setDiseasesData(diseaseData);
              console.log(`[${fetchId}] ✅ Diseases loaded:`, diseaseData.summary);
            }
          } catch (err) {
            console.error(`[${fetchId}] ❌ Diseases error:`, err);
            errors.push('Diseases (network error)');
          }
        }

        // Fetch feedback data
        if (activeTab === 'overview' || activeTab === 'feedback') {
          try {
            const feedbackParams = new URLSearchParams(params);
            if (serviceId) feedbackParams.append('service_id', serviceId.toString());

            console.log(`[${fetchId}] 💬 Fetching feedback...`);
            const feedbackResponse = await fetch(`/api/admin/reports/feedback?${feedbackParams}`);

            if (!feedbackResponse.ok) {
              const errorText = await feedbackResponse.text();
              console.error(`[${fetchId}] ❌ Feedback fetch failed:`, {
                status: feedbackResponse.status,
                statusText: feedbackResponse.statusText,
                error: errorText,
              });
              errors.push(`Feedback (${feedbackResponse.status})`);
            } else {
              const fbData = await feedbackResponse.json();
              setFeedbackData(fbData);
              console.log(`[${fetchId}] ✅ Feedback loaded:`, fbData.summary);
            }
          } catch (err) {
            console.error(`[${fetchId}] ❌ Feedback error:`, err);
            errors.push('Feedback (network error)');
          }
        }

        const duration = Date.now() - fetchStartTime;

        if (errors.length > 0) {
          const errorMessage = `Failed to load: ${errors.join(', ')}. Please check console for details.`;
          setError(errorMessage);
          console.error(`[${fetchId}] ⚠️ Fetch completed with errors (${duration}ms):`, errors);
        } else {
          console.log(`[${fetchId}] ✅ All data fetched successfully (${duration}ms)`);
        }

      } catch (err) {
        const duration = Date.now() - fetchStartTime;
        console.error(`[${fetchId}] ❌ Unexpected error (${duration}ms):`, err);
        setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, filtersKey, startDate, endDate, serviceId, barangayId, status, diseaseType]);

  // Summary cards for overview tab
  const renderSummaryCards = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Appointments</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {appointmentsData?.summary?.total || 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {appointmentsData?.completion_rate || 0}% completed
              </p>
            </div>
            <BarChart3 className="w-12 h-12 text-blue-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Patients</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {patientsData?.summary?.total_patients || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {patientsData?.summary?.active || 0} active
              </p>
            </div>
            <Users className="w-12 h-12 text-green-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Disease Cases</p>
              <p className="text-3xl font-bold text-red-900 mt-2">
                {diseasesData?.summary?.total_cases || 0}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {diseasesData?.summary?.active || 0} active
              </p>
            </div>
            <Activity className="w-12 h-12 text-red-600 opacity-50" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Feedback</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {feedbackData?.summary?.total || 0}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Avg: {feedbackData?.summary?.average_rating || '0.0'} ⭐
              </p>
            </div>
            <MessageSquare className="w-12 h-12 text-purple-600 opacity-50" />
          </div>
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Reports & Analytics"
      pageDescription="Comprehensive system-wide reports and analytics"
    >
      <Container size="full">
        <div className="space-y-6">
          {/* Header with Export Buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">System Reports</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Comprehensive analytics across all services and modules
                </p>
              </div>
              <div>
                <AdminExportButtons
                  activeTab={activeTab}
                  startDate={startDate}
                  endDate={endDate}
                  serviceId={serviceId}
                  barangayId={barangayId}
                  data={
                    activeTab === 'appointments' ? appointmentsData :
                    activeTab === 'patients' ? patientsData :
                    activeTab === 'diseases' ? diseasesData :
                    activeTab === 'feedback' ? feedbackData :
                    appointmentsData
                  }
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <AdminReportsFilters
            startDate={startDate}
            endDate={endDate}
            serviceId={serviceId}
            barangayId={barangayId}
            status={status}
            diseaseType={diseaseType}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onServiceChange={setServiceId}
            onBarangayChange={setBarangayId}
            onStatusChange={setStatus}
            onDiseaseTypeChange={setDiseaseType}
            onApplyFilters={handleApplyFilters}
            activeTab={activeTab}
          />

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex flex-wrap -mb-px">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'appointments', label: 'Appointments', icon: BarChart3 },
                  { id: 'patients', label: 'Patients', icon: Users },
                  { id: 'diseases', label: 'Diseases', icon: Activity },
                  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-6">
              {loading && (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading reports...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6">
                  <h3 className="font-semibold text-lg mb-2">Error Loading Reports</h3>
                  <p>{error}</p>
                </div>
              )}

              {!loading && !error && (
                <>
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {renderSummaryCards()}

                      {/* Key Charts Grid */}
                      <div className="space-y-6">
                        {appointmentsData && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointments Overview</h3>
                            <AdminReportsCharts data={appointmentsData} type="appointments" />
                          </div>
                        )}

                        {patientsData && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patients Overview</h3>
                            <AdminReportsCharts data={patientsData} type="patients" />
                          </div>
                        )}

                        {diseasesData && (
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Disease Surveillance Overview</h3>
                            <AdminReportsCharts data={diseasesData} type="diseases" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Appointments Tab */}
                  {activeTab === 'appointments' && appointmentsData && (
                    <div className="space-y-6">
                      <AdminReportsCharts data={appointmentsData} type="appointments" />
                      <AppointmentReportTable data={appointmentsData.table_data || []} loading={false} />
                    </div>
                  )}

                  {/* Patients Tab */}
                  {activeTab === 'patients' && patientsData && (
                    <div className="space-y-6">
                      <AdminReportsCharts data={patientsData} type="patients" />
                      <PatientReportTable data={patientsData.table_data || []} loading={false} />
                    </div>
                  )}

                  {/* Diseases Tab */}
                  {activeTab === 'diseases' && diseasesData && (
                    <div className="space-y-6">
                      <AdminReportsCharts data={diseasesData} type="diseases" />
                      <DiseaseReportTable data={diseasesData.table_data || []} loading={false} />
                    </div>
                  )}

                  {/* Feedback Tab */}
                  {activeTab === 'feedback' && feedbackData && (
                    <div className="space-y-6">
                      <AdminReportsCharts data={feedbackData} type="feedback" />
                      <FeedbackReportTable data={feedbackData.table_data || []} loading={false} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> All reports show system-wide data across all services and barangays.
              Use filters above to narrow down the results by date range, service, barangay, or status.
            </p>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
