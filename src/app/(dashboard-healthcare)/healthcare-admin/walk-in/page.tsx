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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Portal account toggle
  const [createPortalAccount, setCreatePortalAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');

  // Form state for patient registration
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    contactNumber: '',
    barangayId: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactEmail: '',
    bloodType: '',
    allergies: '',
    currentMedications: '',
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
        const res = await fetch('/api/walk-in/queue');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch walk-in queue');
        }

        if (data.success) {
          setWalkInQueue(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching walk-in queue:', error);
        toast.error('Failed to load walk-in queue');
      } finally {
        setIsLoadingQueue(false);
      }
    }

    fetchWalkInQueue();
  }, [user?.assigned_service_id, toast, refreshTrigger]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const checkEmailUniqueness = async (emailToCheck: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(emailToCheck)}`);
      const data = await res.json();
      return data.available === true;
    } catch (error) {
      console.error('Error checking email uniqueness:', error);
      return false;
    }
  };

  const handleRegisterWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    try {
      // Validate portal account fields if enabled
      if (createPortalAccount) {
        if (!email || !password || !confirmPassword) {
          toast.error('Please fill in all portal account fields');
          setIsRegistering(false);
          return;
        }
        if (password.length < 8) {
          toast.error('Password must be at least 8 characters');
          setIsRegistering(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setIsRegistering(false);
          return;
        }
        if (emailError) {
          toast.error('Please fix email errors before submitting');
          setIsRegistering(false);
          return;
        }

        // Final email uniqueness check
        const isEmailUnique = await checkEmailUniqueness(email);
        if (!isEmailUnique) {
          setEmailError('This email is already registered');
          toast.error('Email is already in use');
          setIsRegistering(false);
          return;
        }
      }

      // Map form data to API expected format (camelCase → snake_case)
      const requestBody: any = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        barangay_id: parseInt(formData.barangayId),
        contact_number: formData.contactNumber,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        emergency_contact_email: formData.emergencyContactEmail || null,
        blood_type: formData.bloodType || null,
        allergies: formData.allergies || null,
        current_medications: formData.currentMedications || null,
      };

      // Add portal account fields if enabled
      if (createPortalAccount) {
        requestBody.create_user_account = true;
        requestBody.email = email;
        requestBody.password = password;
      }

      const response = await fetch('/api/admin/patients/walk-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register walk-in patient');
      }

      // Success!
      const successMessage = createPortalAccount
        ? `Patient registered successfully! Booking Number: ${data.data.booking_number}\nEmail: ${email}`
        : `Patient registered successfully! Booking Number: ${data.data.booking_number}`;

      toast.success(successMessage);

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        contactNumber: '',
        barangayId: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactEmail: '',
        bloodType: '',
        allergies: '',
        currentMedications: '',
      });

      // Reset portal account fields
      setCreatePortalAccount(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setEmailError('');

      // Refresh the walk-in queue by incrementing the trigger
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error registering walk-in patient:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while registering the patient');
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
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
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
                  <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Name *
                  </label>
                  <input
                    id="emergencyContactName"
                    name="emergencyContactName"
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                    required
                    placeholder="Rosa Dela Cruz"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Phone *
                  </label>
                  <input
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                    required
                    placeholder="+639198765432"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Email
                  </label>
                  <input
                    id="emergencyContactEmail"
                    name="emergencyContactEmail"
                    type="email"
                    value={formData.emergencyContactEmail}
                    onChange={handleInputChange}
                    placeholder="juanmiguel.santos@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="bloodType" className="block text-sm font-medium text-gray-700 mb-1">
                    Blood Type
                  </label>
                  <select
                    id="bloodType"
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  >
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
                    Allergies
                  </label>
                  <input
                    id="allergies"
                    name="allergies"
                    type="text"
                    value={formData.allergies}
                    onChange={handleInputChange}
                    placeholder="Peanuts"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="currentMedications" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Medications / Medical Conditions
                  </label>
                  <textarea
                    id="currentMedications"
                    name="currentMedications"
                    value={formData.currentMedications}
                    onChange={handleInputChange}
                    placeholder="HIV, Hypertension medications, etc."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>
              </div>

              {/* Portal Account Section */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createPortalAccount}
                    onChange={(e) => setCreatePortalAccount(e.target.checked)}
                    className="w-4 h-4 text-primary-teal focus:ring-primary-teal border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-900">
                    Create portal account for patient (optional)
                  </span>
                </label>
                <p className="text-xs text-gray-600 mt-1 ml-6">
                  Enable this to provide immediate access to the patient portal. Otherwise, patient can claim account later via password reset.
                </p>

                {createPortalAccount && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError('');
                        }}
                        onBlur={async () => {
                          if (email) {
                            const isUnique = await checkEmailUniqueness(email);
                            if (!isUnique) {
                              setEmailError('This email is already registered');
                            }
                          }
                        }}
                        required={createPortalAccount}
                        placeholder="patient@email.com"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent ${
                          emailError ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {emailError && (
                        <p className="text-xs text-red-500 mt-1">{emailError}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={createPortalAccount}
                        placeholder="Minimum 8 characters"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                      />
                      {password && password.length < 8 && (
                        <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required={createPortalAccount}
                        placeholder="Re-enter password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                )}
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
