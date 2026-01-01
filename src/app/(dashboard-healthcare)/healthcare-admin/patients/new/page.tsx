'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { UserPlus, ArrowLeft, AlertCircle } from 'lucide-react';

interface Barangay {
  id: number;
  name: string;
}

export default function NewWalkInPatient() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
    barangayId: '',
    contactNumber: '',
    email: '',
    bloodType: '',
    allergies: '',
    currentMedications: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactEmail: '',
    diseaseType: '',
    password: '',
    confirmPassword: '',
  });

  // Check if user is general_admin
  useEffect(() => {
    if (user && user.admin_category !== 'general_admin') {
      router.push('/healthcare-admin/dashboard');
    }
  }, [user, router]);

  // Fetch barangays
  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const response = await fetch('/api/barangays');
        const data = await response.json();
        if (response.ok) {
          setBarangays(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching barangays:', err);
      }
    };
    fetchBarangays();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validate email and password (always required now)
    if (!formData.email) {
      setError('Email is required');
      setLoading(false);
      return;
    }
    if (!formData.password) {
      setError('Password is required');
      setLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/patients/walk-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          barangay_id: parseInt(formData.barangayId),
          contact_number: formData.contactNumber,
          email: formData.email || undefined,
          blood_type: formData.bloodType || undefined,
          allergies: formData.allergies || undefined,
          current_medications: formData.currentMedications || undefined,
          emergency_contact: {
            name: formData.emergencyContactName,
            phone: formData.emergencyContactPhone,
            email: formData.emergencyContactEmail || undefined,
          },
          disease_type: formData.diseaseType || undefined,
          create_user_account: true, // Always create user account
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to register walk-in patient');
      }

      setSuccess(true);
      setBookingNumber(result.data.booking_number);
      setAccountCreated(result.data.user_account_created || false);
      setCreatedEmail(result.data.email || null);

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'male',
        barangayId: '',
        contactNumber: '',
        email: '',
        bloodType: '',
        allergies: '',
        currentMedications: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactEmail: '',
        diseaseType: '',
        password: '',
        confirmPassword: '',
      });

      // Redirect to patients page after 3 seconds
      setTimeout(() => {
        router.push('/healthcare-admin/patients');
      }, 3000);
    } catch (err) {
      console.error('Error registering walk-in patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Redirect if not general_admin
  if (user && user.admin_category !== 'general_admin') {
    return null;
  }

  return (
    <DashboardLayout roleId={user?.role_id || 2} pageTitle="Add Walk-in Patient">
      <Container>
        <div className="mb-6">
          <button
            onClick={() => router.push('/healthcare-admin/dashboard')}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-teal transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary-teal/10 rounded-lg">
              <UserPlus className="w-6 h-6 text-primary-teal" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add Walk-in Patient</h1>
              <p className="text-sm text-gray-600">Quick registration for patients without appointments</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {success && bookingNumber && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">Patient registered successfully!</p>
              <p className="text-sm text-green-700">
                Booking Number: <span className="font-mono font-bold">{bookingNumber}</span>
              </p>
              {accountCreated && createdEmail && (
                <div className="mt-2 pt-2 border-t border-green-300">
                  <p className="text-sm font-medium text-green-800 mb-1">User Account Created</p>
                  <p className="text-sm text-green-700">
                    Email: <span className="font-semibold">{createdEmail}</span>
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Patient can now log in to the patient portal with their email and password
                  </p>
                </div>
              )}
              <p className="text-xs text-green-600 mt-2">Redirecting to patients page...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="barangayId" className="block text-sm font-medium text-gray-700 mb-1">
                    Barangay <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="barangayId"
                    name="barangayId"
                    value={formData.barangayId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
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
                  <label htmlFor="bloodType" className="block text-sm font-medium text-gray-700 mb-1">
                    Blood Type (Optional)
                  </label>
                  <select
                    id="bloodType"
                    name="bloodType"
                    value={formData.bloodType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
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
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="contactNumber"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    required
                    placeholder="+63 XXX XXX XXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="patient@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                  <p className="text-xs text-amber-600 mt-1">Required for user account login</p>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="emergencyContactName"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="emergencyContactPhone"
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleChange}
                    required
                    placeholder="+63 XXX XXX XXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    id="emergencyContactEmail"
                    name="emergencyContactEmail"
                    value={formData.emergencyContactEmail}
                    onChange={handleChange}
                    placeholder="emergency@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
                    Allergies (Optional)
                  </label>
                  <textarea
                    id="allergies"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    rows={2}
                    placeholder="List any known allergies"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="currentMedications" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Medications (Optional)
                  </label>
                  <textarea
                    id="currentMedications"
                    name="currentMedications"
                    value={formData.currentMedications}
                    onChange={handleChange}
                    rows={2}
                    placeholder="List any current medications"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="diseaseType" className="block text-sm font-medium text-gray-700 mb-1">
                    Disease Type (Optional - for surveillance)
                  </label>
                  <select
                    id="diseaseType"
                    name="diseaseType"
                    value={formData.diseaseType}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  >
                    <option value="">None</option>
                    <option value="dengue">Dengue</option>
                    <option value="malaria">Malaria</option>
                    <option value="measles">Measles</option>
                    <option value="rabies">Rabies</option>
                  </select>
                </div>
              </div>
            </div>

            {/* User Account Credentials */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Create user account</h2>
              <p className="text-sm text-gray-600 mb-4">
                You will create login credentials for this patient to access the patient portal
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs text-amber-600">
                    Note: The patient will use this email and password to log in to the patient portal.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/healthcare-admin/dashboard')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary-teal text-white rounded-lg hover:bg-primary-teal-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Register Patient
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Container>
    </DashboardLayout>
  );
}
