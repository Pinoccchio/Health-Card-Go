'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Users, Heart, Calendar, TrendingUp } from 'lucide-react';
import PatientListView from '@/components/doctor/PatientListView';
import PatientDetailDrawer from '@/components/doctor/PatientDetailDrawer';
import QRCodeScanner from '@/components/doctor/QRCodeScanner';

export default function DoctorPatientsPage() {
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [stats, setStats] = useState({
    totalPatients: 0,
    thisWeekAppointments: 0,
    avgAge: 0,
    activePatients: 0,
    pendingPatients: 0,
    inactivePatients: 0,
  });

  // Fetch stats data on component mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      // Fetch all doctor's patients
      const patientsRes = await fetch('/api/patients/doctor-patients');
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        const patientsList = patientsData.data || [];
        setPatients(patientsList);

        // Calculate total patients and status breakdowns
        const totalPatients = patientsList.length;
        const activePatients = patientsList.filter((p: any) => p.profiles?.status === 'active').length;
        const pendingPatients = patientsList.filter((p: any) => p.profiles?.status === 'pending').length;
        const inactivePatients = patientsList.filter((p: any) => p.profiles?.status === 'inactive' || p.profiles?.status === 'rejected').length;

        // Calculate average age
        let avgAge = 0;
        if (totalPatients > 0) {
          const totalAge = patientsList.reduce((sum: number, p: any) => {
            if (p.profiles?.date_of_birth) {
              const birthDate = new Date(p.profiles.date_of_birth);
              const today = new Date();
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              return sum + age;
            }
            return sum;
          }, 0);
          avgAge = Math.round(totalAge / totalPatients);
        }

        // Fetch this week's appointments
        const appointmentsRes = await fetch('/api/appointments');
        if (appointmentsRes.ok) {
          const appointmentsData = await appointmentsRes.json();
          const appointmentsList = appointmentsData.data || [];
          setAppointments(appointmentsList);

          // Calculate this week's appointments
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          const thisWeekAppointments = appointmentsList.filter((apt: any) => {
            const aptDate = new Date(apt.appointment_date);
            return aptDate >= startOfWeek && aptDate <= endOfWeek;
          }).length;

          setStats({
            totalPatients,
            thisWeekAppointments,
            avgAge,
            activePatients,
            pendingPatients,
            inactivePatients,
          });
        }
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePatientClick = (patient: any) => {
    setSelectedPatient(patient);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedPatient(null), 300);
  };

  const handleScanQR = async (qrData: string) => {
    try {
      // Parse QR code data
      const data = JSON.parse(qrData);

      // Prioritize user_id (new format) over patient_id (old format)
      // user_id is the profiles.id which our by-user endpoint expects
      const userId = data.user_id || data.patient_id;

      if (userId) {
        // Wait for patient data to be fetched and drawer to open before closing scanner
        await fetchPatientById(userId);
      } else {
        alert('Invalid QR code format: missing patient identification');
      }
    } catch (err) {
      console.error('Error parsing QR code:', err);
      alert('Failed to read QR code data');
    } finally {
      // Always close scanner after handling (success or failure)
      setIsScannerOpen(false);
    }
  };

  const fetchPatientById = async (userId: string) => {
    try {
      // Use by-user endpoint since QR codes contain user_id, not patients.id
      const res = await fetch(`/api/patients/by-user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPatient(data.data);
        setIsDrawerOpen(true);
        // Give drawer time to render before closing scanner
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        alert('Patient not found or you do not have access');
      }
    } catch (err) {
      console.error('Error fetching patient:', err);
      alert('Failed to load patient data');
    }
  };

  return (
    <DashboardLayout
      roleId={3}
      pageTitle="Patients"
      pageDescription="Access patient records"
    >
      <Container size="full">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Patients */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalPatients}
                </p>
              </div>
              <div className="bg-primary-teal/10 p-3 rounded-full">
                <Users className="w-6 h-6 text-primary-teal" />
              </div>
            </div>
          </div>

          {/* This Week's Appointments */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.thisWeekAppointments}
                </p>
                <p className="text-xs text-gray-500 mt-1">Appointments</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Average Age */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Age</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {loadingStats ? (
                    <span className="text-gray-400">Loading...</span>
                  ) : stats.avgAge > 0 ? (
                    `${stats.avgAge} years`
                  ) : (
                    'N/A'
                  )}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Patient List */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary-teal" />
              Patient Records
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Search and access your assigned patients
            </p>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                selectedStatus === 'all'
                  ? 'bg-primary-teal text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({stats.totalPatients})
            </button>
            <button
              onClick={() => setSelectedStatus('active')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                selectedStatus === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active ({stats.activePatients})
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                selectedStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending ({stats.pendingPatients})
            </button>
            <button
              onClick={() => setSelectedStatus('inactive')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                selectedStatus === 'inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactive ({stats.inactivePatients})
            </button>
          </div>

          <PatientListView
            onPatientClick={handlePatientClick}
            onScanQRClick={() => setIsScannerOpen(true)}
            statusFilter={selectedStatus}
          />
        </div>

        {/* Patient Detail Drawer */}
        <PatientDetailDrawer
          patient={selectedPatient}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
        />

        {/* QR Scanner Modal */}
        <QRCodeScanner
          isOpen={isScannerOpen}
          onScan={handleScanQR}
          onClose={() => setIsScannerOpen(false)}
        />
      </Container>
    </DashboardLayout>
  );
}
