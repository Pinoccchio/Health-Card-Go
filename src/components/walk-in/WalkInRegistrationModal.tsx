'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { X } from 'lucide-react';

interface WalkInRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barangays: Array<{ id: number; name: string }>;
}

export function WalkInRegistrationModal({
  isOpen,
  onClose,
  onSuccess,
  barangays
}: WalkInRegistrationModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate portal account fields if enabled
      if (createPortalAccount) {
        if (!email || !password || !confirmPassword) {
          toast.error('Please fill in all portal account fields');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 8) {
          toast.error('Password must be at least 8 characters');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setIsSubmitting(false);
          return;
        }
        if (emailError) {
          toast.error('Please fix email errors before submitting');
          setIsSubmitting(false);
          return;
        }

        // Final email uniqueness check
        const isEmailUnique = await checkEmailUniqueness(email);
        if (!isEmailUnique) {
          setEmailError('This email is already registered');
          toast.error('Email is already in use');
          setIsSubmitting(false);
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

      // Close modal and trigger success callback
      onSuccess();
    } catch (error) {
      console.error('Error registering walk-in patient:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while registering the patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form state on close
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
    setCreatePortalAccount(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEmailError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1002] overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-lg transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Sticky Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Register Walk-in Patient</h3>
              <p className="text-sm text-gray-600 mt-1">
                Register patients who arrive without prior appointments. No 7-day booking rule applies.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Personal Information</h4>
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
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="md:col-span-2">
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
                </div>
              </div>

              {/* Medical Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Medical Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              {/* Portal Account Section */}
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
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
            </div>

            {/* Footer Buttons */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary-teal hover:bg-primary-teal/90"
              >
                {isSubmitting ? 'Registering...' : 'Register Walk-in Patient'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
