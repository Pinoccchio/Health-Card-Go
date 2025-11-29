'use client';

import { useState, FormEvent } from 'react';
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
} from '@/components/auth';
import { Button } from '@/components/ui';
import { RegisterData, RoleId, ROLE_NAMES, ADMIN_CATEGORY_NAMES } from '@/types/auth';
import { BARANGAYS } from '@/lib/config/barangaysConfig';

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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
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
    }

    if (formData.role === 'doctor') {
      if (!formData.specialization?.trim()) {
        newErrors.specialization = 'Specialization is required';
      }
      if (!formData.licenseNumber?.trim()) {
        newErrors.licenseNumber = 'License number is required';
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
    console.log('📝 [FORM SUBMIT] Registration data:', {
      ...formData,
      password: '***REDACTED***',
      confirmPassword: '***REDACTED***'
    });

    try {
      console.log('🚀 [FORM SUBMIT] Calling register function...');
      await register(formData as RegisterData);
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

  // Prepare select options
  const roleOptions = [
    { value: 'patient', label: ROLE_NAMES[4] },
    { value: 'doctor', label: ROLE_NAMES[3] },
    { value: 'healthcare_admin', label: ROLE_NAMES[2] },
    { value: 'super_admin', label: ROLE_NAMES[1] },
  ];

  const adminCategoryOptions = [
    { value: 'healthcard', label: ADMIN_CATEGORY_NAMES.healthcard },
    { value: 'hiv', label: ADMIN_CATEGORY_NAMES.hiv },
    { value: 'pregnancy', label: ADMIN_CATEGORY_NAMES.pregnancy },
    { value: 'general_admin', label: ADMIN_CATEGORY_NAMES.general_admin },
    { value: 'laboratory', label: ADMIN_CATEGORY_NAMES.laboratory },
  ];

  const barangayOptions = BARANGAYS.map((b) => ({
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

          {/* Role Selection */}
          <Select
            id="role"
            options={roleOptions}
            placeholder="Select your role"
            value={formData.role || ''}
            onChange={(e) => handleChange('role', e.target.value)}
            error={errors.role}
            disabled={loading}
          />

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
                onChange={(e) => handleChange('password', e.target.value)}
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
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                error={errors.confirmPassword}
                icon={Lock}
                disabled={loading}
              />
            </div>
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
                  placeholder="Select your barangay"
                  value={formData.barangayId || ''}
                  onChange={(e) =>
                    handleChange('barangayId', Number(e.target.value))
                  }
                  error={errors.barangayId}
                  disabled={loading}
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
            </>
          )}

          {/* Doctor-specific Fields */}
          {formData.role === 'doctor' && (
            <>
              <FormField
                id="specialization"
                label="Specialization"
                type="text"
                placeholder="e.g., General Practitioner"
                value={formData.specialization || ''}
                onChange={(e) => handleChange('specialization', e.target.value)}
                error={errors.specialization}
                icon={Stethoscope}
                required
                disabled={loading}
              />

              <FormField
                id="licenseNumber"
                label="License Number"
                type="text"
                placeholder="e.g., PRC-12345678"
                value={formData.licenseNumber || ''}
                onChange={(e) => handleChange('licenseNumber', e.target.value)}
                error={errors.licenseNumber}
                icon={FileText}
                required
                disabled={loading}
              />
            </>
          )}

          {/* Terms Checkbox */}
          <Checkbox
            id="acceptTerms"
            label={
              <span>
                I accept the{' '}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-teal hover:text-primary-teal-dark underline font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-teal hover:text-primary-teal-dark underline font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
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
      </AuthCard>
    </div>
  );
}
