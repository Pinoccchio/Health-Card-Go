'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import ReportsCharts from '@/components/healthcare-admin/ReportsCharts';
import ReportsFilters from '@/components/healthcare-admin/ReportsFilters';
import AppointmentListTable from '@/components/healthcare-admin/AppointmentListTable';
import PatientListTable from '@/components/healthcare-admin/PatientListTable';
import ExportButtons from '@/components/healthcare-admin/ExportButtons';

interface ServiceData {
  id: number;
  name: string;
  requires_appointment: boolean;
  requires_medical_record: boolean;
}

export default function HealthcareAdminReportsPage() {
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
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'patients'>('overview');

  // Track if filters have changed (to trigger re-fetch)
  const [filtersKey, setFiltersKey] = useState(0);

  // Data states for export
  const [appointmentsData, setAppointmentsData] = useState<any>(null);
  const [patientsData, setPatientsData] = useState<any>(null);

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

        // Fetch appointments data if service requires appointments
        if (service.requires_appointment && (activeTab === 'overview' || activeTab === 'appointments')) {
          const apptResponse = await fetch(`/api/healthcare-admin/reports/appointments?${params}`);
          if (apptResponse.ok) {
            const apptData = await apptResponse.json();
            setAppointmentsData(apptData.data); // Extract inner data object
          }
        }

        // Fetch patients data
        if (activeTab === 'overview' || activeTab === 'patients') {
          const patientParams = new URLSearchParams(params);
          const patientResponse = await fetch(`/api/healthcare-admin/reports/patients?${patientParams}`);
          if (patientResponse.ok) {
            const patientData = await patientResponse.json();
            setPatientsData(patientData.data); // Extract inner data object
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

  if (loading) {
    return (
      <DashboardLayout
        roleId={2}
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
        roleId={2}
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
      roleId={2}
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
                  data={activeTab === 'appointments' ? appointmentsData : patientsData}
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
