'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button, Container } from '@/components/ui';
import { UserPlus, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/lib/contexts/ToastContext';

interface WalkInPatient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  contact_number: string;
  barangay_name: string;
  registered_at: string;
  status: 'waiting' | 'in_progress' | 'completed';
}

/**
 * Walk-in Queue Page
 * For Healthcare Admins assigned to walk-in services (Services 22, 23)
 * - Service 22: Walk-in Emergency Consultation (requires medical records)
 * - Service 23: Health Education Seminar (no medical records)
 *
 * Features:
 * - Register walk-in patients directly (no appointment needed)
 * - Bypasses 7-day advance booking rule
 * - Shows real-time walk-in queue
 * - Marks patients as in-progress or completed
 */
export default function WalkInQueuePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [isRegistering, setIsRegistering] = useState(false);
  const [walkInQueue, setWalkInQueue] = useState<WalkInPatient[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [serviceName, setServiceName] = useState<string>('');

  // Form state for patient registration
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    contactNumber: '',
    barangayId: '',
    address: '',
  });

  const [barangays, setBarangays] = useState<Array<{ id: number; name: string }>>([]);

  // Fetch service name
  useEffect(() => {
    async function fetchServiceName() {
      if (!user?.assigned_service_id) return;

      try {
        const res = await fetch(`/api/services/${user.assigned_service_id}`);
        const data = await res.json();
        if (data.success && data.data) {
          setServiceName(data.data.name);
        }
      } catch (error) {
        console.error('Error fetching service name:', error);
      }
    }

    fetchServiceName();
  }, [user?.assigned_service_id]);

  // Fetch barangays for dropdown
  useEffect(() => {
    async function fetchBarangays() {
      try {
        const res = await fetch('/api/barangays');
        const data = await res.json();
        if (data.success && data.data) {
          setBarangays(data.data);
        }
      } catch (error) {
        console.error('Error fetching barangays:', error);
      }
    }

    fetchBarangays();
  }, []);

  // Fetch today's walk-in queue
  useEffect(() => {
    async function fetchWalkInQueue() {
      if (!user?.assigned_service_id) return;

      setIsLoadingQueue(true);
      try {
        // TODO: Replace with actual API endpoint for walk-in queue
        // const res = await fetch(`/api/walk-in/queue?service_id=${user.assigned_service_id}`);
        // const data = await res.json();
        // if (data.success) {
        //   setWalkInQueue(data.data);
        // }

        // Placeholder empty queue for now
        setWalkInQueue([]);
      } catch (error) {
        console.error('Error fetching walk-in queue:', error);
        toast.error('Failed to load walk-in queue');
      } finally {
        setIsLoadingQueue(false);
      }
    }

    fetchWalkInQueue();
  }, [user?.assigned_service_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegisterWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    try {
      // TODO: Replace with actual walk-in registration API
      toast.success('Walk-in patient registered (placeholder - API not yet implemented)');

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        contactNumber: '',
        barangayId: '',
        address: '',
      });
    } catch (error) {
      console.error('Error registering walk-in patient:', error);
      toast.error('An error occurred while registering the patient');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <DashboardLayout roleId={2} pageTitle="Walk-in Queue" pageDescription={`Manage walk-in patients for ${serviceName}`}>
      <Container size="full">
        <div className="space-y-6">
          {/* Registration Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-primary-teal" />
              <h2 className="text-xl font-bold text-gray-900">Register Walk-in Patient</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Register patients who arrive without prior appointments. No 7-day booking rule applies.
            </p>

            <form onSubmit={handleRegisterWalkIn} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="Juan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Dela Cruz"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth *
                  </label>
                  <input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number *
                  </label>
                  <input
                    id="contactNumber"
                    name="contactNumber"
                    type="tel"
                    value={formData.contactNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="+639123456789"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="barangayId" className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay *
                  </label>
                  <select
                    id="barangayId"
                    name="barangayId"
                    value={formData.barangayId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  >
                    <option value="">Select Barangay</option>
                    {barangays.map((barangay) => (
                      <option key={barangay.id} value={barangay.id}>
                        {barangay.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    placeholder="Street, Purok, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isRegistering} className="w-full md:w-auto">
                {isRegistering ? 'Registering...' : 'Register Walk-in Patient'}
              </Button>
            </form>
          </div>

          {/* Queue Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary-teal" />
              <h2 className="text-xl font-bold text-gray-900">Today's Walk-in Queue</h2>
            </div>
            <p className="text-gray-600 mb-6">View and manage patients who have checked in today</p>

            {isLoadingQueue ? (
              <div className="text-center py-8 text-gray-500">Loading queue...</div>
            ) : walkInQueue.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No walk-in patients yet today</p>
                <p className="text-sm mt-1">Register patients using the form above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {walkInQueue.map((patient, index) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-primary-teal">#{index + 1}</div>
                      <div>
                        <p className="font-medium">
                          {patient.first_name} {patient.last_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {patient.barangay_name} • {patient.contact_number}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {patient.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Completed
                        </span>
                      ) : (
                        <Button variant="outline" size="sm">
                          Start Consultation
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Walk-in Service Information:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Walk-in patients do not need prior appointments</li>
                  <li>The 7-day advance booking rule does not apply</li>
                  <li>Patients are served on a first-come, first-served basis</li>
                  <li>Queue numbers reset daily</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </DashboardLayout>
  );
}
