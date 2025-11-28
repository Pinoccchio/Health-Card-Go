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
  Shield,
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
    role_id: 4, // Default to Patient
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  /**
   * Validate form fields
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Common validations
    if (!formData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
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
    if (formData.role_id === 2 && !formData.admin_category) {
      newErrors.admin_category = 'Please select an admin category';
    }

    if (formData.role_id === 4) {
      if (!formData.barangay_id) {
        newErrors.barangay_id = 'Please select your barangay';
      }
      if (!formData.date_of_birth) {
        newErrors.date_of_birth = 'Date of birth is required';
      }
      if (!formData.gender) {
        newErrors.gender = 'Please select your gender';
      }
      if (!formData.contact_number) {
        newErrors.contact_number = 'Contact number is required';
      }
    }

    if (formData.role_id === 3) {
      if (!formData.specialization?.trim()) {
        newErrors.specialization = 'Specialization is required';
      }
      if (!formData.license_number?.trim()) {
        newErrors.license_number = 'License number is required';
      }
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!validate()) return;

    try {
      await register(formData as RegisterData);
      setSuccessMessage(
        formData.role_id === 4
          ? 'Registration successful! Your account is pending approval.'
          : 'Registration successful! Redirecting...'
      );

      setTimeout(() => {
        router.push(formData.role_id === 4 ? '/verify-email' : '/login');
      }, 2000);
    } catch (error) {
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
    { value: 4, label: ROLE_NAMES[4] },
    { value: 3, label: ROLE_NAMES[3] },
    { value: 2, label: ROLE_NAMES[2] },
    { value: 1, label: ROLE_NAMES[1] },
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
            id="role_id"
            options={roleOptions}
            placeholder="Select your role"
            value={formData.role_id || ''}
            onChange={(e) => handleChange('role_id', Number(e.target.value))}
            error={errors.role_id}
            disabled={loading}
          />

          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-6">
            <FormField
              id="first_name"
              label="First Name"
              type="text"
              placeholder="Juan"
              value={formData.first_name || ''}
              onChange={(e) => handleChange('first_name', e.target.value)}
              error={errors.first_name}
              icon={User}
              required
              disabled={loading}
            />

            <FormField
              id="last_name"
              label="Last Name"
              type="text"
              placeholder="Dela Cruz"
              value={formData.last_name || ''}
              onChange={(e) => handleChange('last_name', e.target.value)}
              error={errors.last_name}
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
          {formData.role_id === 2 && (
            <div>
              <label
                htmlFor="admin_category"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Admin Category <span className="text-danger">*</span>
              </label>
              <Select
                id="admin_category"
                options={adminCategoryOptions}
                placeholder="Select admin category"
                value={formData.admin_category || ''}
                onChange={(e) => handleChange('admin_category', e.target.value)}
                error={errors.admin_category}
                disabled={loading}
                helperText="Choose your area of specialization"
              />
            </div>
          )}

          {/* Patient-specific Fields */}
          {formData.role_id === 4 && (
            <>
              <div>
                <label
                  htmlFor="barangay_id"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Barangay <span className="text-danger">*</span>
                </label>
                <Select
                  id="barangay_id"
                  options={barangayOptions}
                  placeholder="Select your barangay"
                  value={formData.barangay_id || ''}
                  onChange={(e) =>
                    handleChange('barangay_id', Number(e.target.value))
                  }
                  error={errors.barangay_id}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  id="date_of_birth"
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  error={errors.date_of_birth}
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
                id="contact_number"
                label="Contact Number"
                type="tel"
                placeholder="+63 912 345 6789"
                value={formData.contact_number || ''}
                onChange={(e) => handleChange('contact_number', e.target.value)}
                error={errors.contact_number}
                icon={Phone}
                required
                disabled={loading}
              />
            </>
          )}

          {/* Doctor-specific Fields */}
          {formData.role_id === 3 && (
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
                id="license_number"
                label="License Number"
                type="text"
                placeholder="e.g., PRC-12345678"
                value={formData.license_number || ''}
                onChange={(e) => handleChange('license_number', e.target.value)}
                error={errors.license_number}
                icon={FileText}
                required
                disabled={loading}
              />
            </>
          )}

          {/* Super Admin Code (optional security) */}
          {formData.role_id === 1 && (
            <FormField
              id="admin_code"
              label="Admin Code"
              type="password"
              placeholder="Enter admin code"
              value={formData.admin_code || ''}
              onChange={(e) => handleChange('admin_code', e.target.value)}
              error={errors.admin_code}
              icon={Shield}
              helperText="Contact system administrator for the code"
              disabled={loading}
            />
          )}

          {/* Terms Checkbox */}
          <Checkbox
            id="acceptTerms"
            label="I accept the Terms and Conditions and Privacy Policy"
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
