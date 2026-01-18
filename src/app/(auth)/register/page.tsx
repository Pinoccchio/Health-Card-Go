'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail,
  Lock,
  User,
  MapPin,
  Phone,
  Calendar,
  Stethoscope,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  AuthCard,
  FormField,
  PasswordInput,
  Select,
  Checkbox,
  Alert,
  TermsModal,
  PrivacyPolicyModal,
  PasswordRequirementsDisplay,
} from '@/components/auth';
import { Button } from '@/components/ui';
import { RegisterData, RoleId, ROLE_NAMES, ADMIN_CATEGORY_NAMES } from '@/types/auth';
import {
  validatePasswordComplexity,
  isPasswordValid,
  type PasswordValidationRules,
} from '@/lib/validators/passwordValidation';

interface Barangay {
  id: number;
  name: string;
  code: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading } = useAuth();

  const [formData, setFormData] = useState<Partial<RegisterData>>({
    role: 'patient', // Default to Patient
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [barangaysLoading, setBarangaysLoading] = useState<boolean>(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationRules>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasDigit: false,
    hasSpecialChar: false,
  });
  const [isPasswordFieldActive, setIsPasswordFieldActive] = useState<boolean>(false);

  // Fetch barangays from API on mount
  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const response = await fetch('/api/barangays');
        const result = await response.json();

        if (result.success && result.data) {
          setBarangays(result.data);
        } else {
          console.error('Failed to fetch barangays:', result.error);
        }
      } catch (error) {
        console.error('Error fetching barangays:', error);
      } finally {
        setBarangaysLoading(false);
      }
    };

    fetchBarangays();
  }, []);

  /**
   * Validate form fields
   */
  const validate = (): boolean => {
    console.log('🔍 [VALIDATION] Starting validation with formData:', formData);
    const newErrors: Record<string, string> = {};

    // Common validations
    if (!formData.firstName?.trim()) {
      console.log('❌ [VALIDATION] First name is missing');
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName?.trim()) {
      console.log('❌ [VALIDATION] Last name is missing');
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      console.log('❌ [VALIDATION] Email is missing');
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(formData.email);
      console.log('📧 [VALIDATION] Email:', formData.email);
      console.log('📧 [VALIDATION] Email regex test result:', isValidEmail);

      if (!isValidEmail) {
        console.log('❌ [VALIDATION] Email failed regex validation');
        newErrors.email = 'Please enter a valid email address';
      } else {
        console.log('✅ [VALIDATION] Email passed validation');
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isPasswordValid(passwordValidation)) {
      newErrors.password = 'Password does not meet all requirements';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validations
    if (formData.role === 'healthcare_admin' && !formData.adminCategory) {
      newErrors.adminCategory = 'Please select an admin category';
    }

    // Patient-specific validations
    if (formData.role === 'patient') {
      if (!formData.barangayId) {
        newErrors.barangayId = 'Please select your barangay';
      }
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required';
      }
      if (!formData.gender) {
        newErrors.gender = 'Please select your gender';
      }
      if (!formData.contactNumber) {
        newErrors.contactNumber = 'Contact number is required';
      }

      // Emergency contact validation
      if (!formData.emergencyContact?.name?.trim()) {
        newErrors.emergencyContactName = 'Emergency contact name is required';
      }
      if (!formData.emergencyContact?.phone?.trim()) {
        newErrors.emergencyContactPhone = 'Emergency contact phone is required';
      }
      // Email is optional, but validate format if provided
      if (formData.emergencyContact?.email && formData.emergencyContact.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.emergencyContact.email)) {
          newErrors.emergencyContactEmail = 'Please enter a valid email address';
        }
      }
    }

    if (!formData.acceptTerms) {
      console.log('❌ [VALIDATION] Terms not accepted');
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('🔍 [VALIDATION] Validation complete. Errors:', newErrors);
    console.log('🔍 [VALIDATION] Is valid:', isValid);
    return isValid;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('📝 [FORM SUBMIT] Form submitted');
    setServerError('');
    setSuccessMessage('');

    console.log('📝 [FORM SUBMIT] Starting validation...');
    if (!validate()) {
      console.log('❌ [FORM SUBMIT] Validation failed, stopping submission');
      return;
    }

    console.log('✅ [FORM SUBMIT] Validation passed, proceeding with registration');

    // Normalize names: trim whitespace and capitalize properly
    const normalizedData = {
      ...formData,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
    };

    console.log('📝 [FORM SUBMIT] Registration data:', {
      ...normalizedData,
      password: '***REDACTED***',
      confirmPassword: '***REDACTED***'
    });

    try {
      console.log('🚀 [FORM SUBMIT] Calling register function...');
      await register(normalizedData as RegisterData);
      console.log('✅ [FORM SUBMIT] Registration successful!');

      setSuccessMessage(
        formData.role === 'patient'
          ? 'Registration successful! Your account is pending approval.'
          : 'Registration successful! Redirecting...'
      );

      setTimeout(() => {
        router.push(formData.role === 'patient' ? '/verify-email' : '/login');
      }, 2000);
    } catch (error) {
      console.error('❌ [FORM SUBMIT] Registration failed:', error);
      console.error('❌ [FORM SUBMIT] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });

      setServerError(
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again.'
      );
    }
  };

  /**
   * Handle input changes
   */
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  /**
   * Handle password change with real-time validation
   */
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setFormData((prev) => ({ ...prev, password }));
    setPasswordValidation(validatePasswordComplexity(password));

    // Clear error for password field
    if (errors.password) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.password;
        return updated;
      });
    }

    // Also validate confirm password mismatch if user already typed confirm password
    if (formData.confirmPassword) {
      if (password && formData.confirmPassword !== password) {
        // Passwords don't match - show error on confirm field
        setErrors((prev) => ({
          ...prev,
          confirmPassword: 'Passwords do not match',
        }));
      } else {
        // Passwords match - clear confirm password error
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.confirmPassword;
          return updated;
        });
      }
    }
  };

  /**
   * Handle confirm password change with real-time validation
   */
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const confirmPassword = e.target.value;
    setFormData((prev) => ({ ...prev, confirmPassword }));

    // Also validate against the main password to show requirements
    // This allows users to see validation feedback when typing in confirm field
    if (formData.password) {
      setPasswordValidation(validatePasswordComplexity(formData.password));
    }

    // Real-time password mismatch validation
    if (formData.password && confirmPassword && confirmPassword !== formData.password) {
      // Passwords don't match - show error
      setErrors((prev) => ({
        ...prev,
        confirmPassword: 'Passwords do not match',
      }));
    } else {
      // Passwords match or field is empty - clear error
      if (errors.confirmPassword) {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.confirmPassword;
          return updated;
        });
      }
    }
  };

  // Prepare select options - Only patients can self-register (business rule)
  const roleOptions = [
    { value: 'patient', label: ROLE_NAMES[4] },
  ];

  const adminCategoryOptions = [
    { value: 'healthcard', label: ADMIN_CATEGORY_NAMES.healthcard },
    { value: 'hiv', label: ADMIN_CATEGORY_NAMES.hiv },
    { value: 'pregnancy', label: ADMIN_CATEGORY_NAMES.pregnancy },
    { value: 'general_admin', label: ADMIN_CATEGORY_NAMES.general_admin },
    { value: 'laboratory', label: ADMIN_CATEGORY_NAMES.laboratory },
  ];

  const barangayOptions = barangays.map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="flex justify-center py-8">
      <AuthCard title="Create Account" subtitle="Join the HealthCard System">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alerts */}
          {serverError && (
            <Alert
              variant="error"
              message={serverError}
              closeable
              onClose={() => setServerError('')}
            />
          )}

          {successMessage && (
            <Alert variant="success" message={successMessage} />
          )}

          {/* Role is fixed to patient - no dropdown needed (security: prevent unauthorized role creation) */}
          <input type="hidden" name="role" value="patient" />

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-6">
            <FormField
              id="firstName"
              label="First Name"
              type="text"
              placeholder="Juan"
              value={formData.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              error={errors.firstName}
              icon={User}
              required
              disabled={loading}
            />

            <FormField
              id="lastName"
              label="Last Name"
              type="text"
              placeholder="Dela Cruz"
              value={formData.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              error={errors.lastName}
              icon={User}
              required
              disabled={loading}
            />
          </div>

          <FormField
            id="email"
            label="Email Address"
            type="email"
            placeholder="your.email@example.com"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            icon={Mail}
            required
            disabled={loading}
          />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Password <span className="text-danger">*</span>
                </label>
                <PasswordInput
                  id="password"
                  placeholder="Min. 8 characters"
                  value={formData.password || ''}
                  onChange={handlePasswordChange}
                  onFocus={() => setIsPasswordFieldActive(true)}
                  onBlur={() => setIsPasswordFieldActive(false)}
                  error={errors.password}
                  icon={Lock}
                  disabled={loading}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Confirm Password <span className="text-danger">*</span>
                </label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword || ''}
                  onChange={handleConfirmPasswordChange}
                  onFocus={() => setIsPasswordFieldActive(true)}
                  onBlur={() => setIsPasswordFieldActive(false)}
                  error={errors.confirmPassword}
                  icon={Lock}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Requirements Display */}
            <PasswordRequirementsDisplay
              validationRules={passwordValidation}
              isActive={isPasswordFieldActive}
              showOnlyWhenActive={false}
            />
          </div>

          {/* Healthcare Admin Category */}
          {formData.role === 'healthcare_admin' && (
            <div>
              <label
                htmlFor="adminCategory"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Admin Category <span className="text-danger">*</span>
              </label>
              <Select
                id="adminCategory"
                options={adminCategoryOptions}
                placeholder="Select admin category"
                value={formData.adminCategory || ''}
                onChange={(e) => handleChange('adminCategory', e.target.value)}
                error={errors.adminCategory}
                disabled={loading}
                helperText="Choose your area of specialization"
              />
            </div>
          )}

          {/* Patient-specific Fields */}
          {formData.role === 'patient' && (
            <>
              <div>
                <label
                  htmlFor="barangayId"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Barangay <span className="text-danger">*</span>
                </label>
                <Select
                  id="barangayId"
                  options={barangayOptions}
                  placeholder={barangaysLoading ? "Loading barangays..." : "Select your barangay"}
                  value={formData.barangayId || ''}
                  onChange={(e) =>
                    handleChange('barangayId', Number(e.target.value))
                  }
                  error={errors.barangayId}
                  disabled={loading || barangaysLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  id="dateOfBirth"
                  label="Date of Birth"
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  error={errors.dateOfBirth}
                  icon={Calendar}
                  required
                  disabled={loading}
                />

                <div>
                  <label
                    htmlFor="gender"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Gender <span className="text-danger">*</span>
                  </label>
                  <Select
                    id="gender"
                    options={genderOptions}
                    placeholder="Select gender"
                    value={formData.gender || ''}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    error={errors.gender}
                    disabled={loading}
                  />
                </div>
              </div>

              <FormField
                id="contactNumber"
                label="Contact Number"
                type="tel"
                placeholder="+63 912 345 6789"
                value={formData.contactNumber || ''}
                onChange={(e) => handleChange('contactNumber', e.target.value)}
                error={errors.contactNumber}
                icon={Phone}
                required
                disabled={loading}
              />

              {/* Emergency Contact Section */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">
                  Emergency Contact <span className="text-danger">*</span>
                </h3>

                <FormField
                  id="emergencyContactName"
                  label="Contact Name"
                  type="text"
                  placeholder="e.g., Maria Dela Cruz"
                  value={formData.emergencyContact?.name || ''}
                  onChange={(e) =>
                    handleChange('emergencyContact', {
                      ...formData.emergencyContact,
                      name: e.target.value,
                    })
                  }
                  error={errors.emergencyContactName}
                  icon={User}
                  required
                  disabled={loading}
                />

                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    id="emergencyContactPhone"
                    label="Contact Phone"
                    type="tel"
                    placeholder="+63 912 999 9999"
                    value={formData.emergencyContact?.phone || ''}
                    onChange={(e) =>
                      handleChange('emergencyContact', {
                        ...formData.emergencyContact,
                        phone: e.target.value,
                      })
                    }
                    error={errors.emergencyContactPhone}
                    icon={Phone}
                    required
                    disabled={loading}
                  />

                  <FormField
                    id="emergencyContactEmail"
                    label="Contact Email (Optional)"
                    type="email"
                    placeholder="contact@example.com"
                    value={formData.emergencyContact?.email || ''}
                    onChange={(e) =>
                      handleChange('emergencyContact', {
                        ...formData.emergencyContact,
                        email: e.target.value,
                      })
                    }
                    error={errors.emergencyContactEmail}
                    icon={Mail}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Optional Medical Information Section */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">
                  Medical Information (Optional)
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="bloodType"
                      className="block text-sm font-medium text-gray-700 mb-1.5"
                    >
                      Blood Type
                    </label>
                    <Select
                      id="bloodType"
                      options={[
                        { value: 'A+', label: 'A+' },
                        { value: 'A-', label: 'A-' },
                        { value: 'B+', label: 'B+' },
                        { value: 'B-', label: 'B-' },
                        { value: 'AB+', label: 'AB+' },
                        { value: 'AB-', label: 'AB-' },
                        { value: 'O+', label: 'O+' },
                        { value: 'O-', label: 'O-' },
                      ]}
                      placeholder="Select blood type"
                      value={formData.bloodType || ''}
                      onChange={(e) => handleChange('bloodType', e.target.value)}
                      error={errors.bloodType}
                      disabled={loading}
                    />
                  </div>

                  <FormField
                    id="allergies"
                    label="Allergies"
                    type="text"
                    placeholder="e.g., Penicillin, Peanuts"
                    value={formData.allergies || ''}
                    onChange={(e) => handleChange('allergies', e.target.value)}
                    error={errors.allergies}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="medicalConditions"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Existing Medical Conditions
                  </label>
                  <textarea
                    id="medicalConditions"
                    rows={3}
                    placeholder="e.g., Diabetes, Hypertension"
                    value={formData.medicalConditions || ''}
                    onChange={(e) => handleChange('medicalConditions', e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                  {errors.medicalConditions && (
                    <p className="mt-1.5 text-sm text-danger">
                      {errors.medicalConditions}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Terms Checkbox */}
          <Checkbox
            id="acceptTerms"
            label={
              <span>
                I accept the{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsTermsModalOpen(true);
                  }}
                  className="text-primary-teal hover:text-primary-teal-dark underline font-medium transition-colors"
                >
                  Terms and Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsPrivacyModalOpen(true);
                  }}
                  className="text-primary-teal hover:text-primary-teal-dark underline font-medium transition-colors"
                >
                  Privacy Policy
                </button>
              </span>
            }
            checked={formData.acceptTerms}
            onChange={(e) => handleChange('acceptTerms', e.target.checked)}
            error={errors.acceptTerms}
            disabled={loading}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

          {/* Login Link */}
          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary-teal hover:text-primary-teal-dark transition-colors"
            >
              Sign in
            </Link>
          </div>
        </form>

        {/* Terms and Privacy Modals */}
        <TermsModal
          isOpen={isTermsModalOpen}
          onClose={() => setIsTermsModalOpen(false)}
        />
        <PrivacyPolicyModal
          isOpen={isPrivacyModalOpen}
          onClose={() => setIsPrivacyModalOpen(false)}
        />
      </AuthCard>
    </div>
  );
}
