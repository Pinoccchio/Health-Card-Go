'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container, Button } from '@/components/ui';
import { FormField } from '@/components/auth';
import { useToast } from '@/lib/contexts/ToastContext';
import { User, Shield, Mail, Phone } from 'lucide-react';

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  role: string;
  status: string;
  created_at: string;
}

export default function EducationAdminProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    contact_number: '',
  });
  const [originalData, setOriginalData] = useState({
    first_name: '',
    last_name: '',
    contact_number: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load profile data
  useEffect(() => {
    if (user && user.role_id === 6) {
      loadProfileData();
    }
  }, [user]);

  // Detect changes
  useEffect(() => {
    setHasChanges(JSON.stringify(formData) !== JSON.stringify(originalData));
  }, [formData, originalData]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();

      if (response.ok && data.success) {
        setProfileData(data.data);

        // Populate form data
        const formValues = {
          first_name: data.data.first_name || '',
          last_name: data.data.last_name || '',
          contact_number: data.data.contact_number || '',
        };

        setFormData(formValues);
        setOriginalData(JSON.parse(JSON.stringify(formValues)));
      } else {
        toast.error(data.error || 'Failed to load profile');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('An unexpected error occurred while loading your profile');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name?.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (formData.contact_number && formData.contact_number.trim()) {
      const phoneRegex = /^(09|\+639)\d{9}$/;
      if (!phoneRegex.test(formData.contact_number.replace(/[-\s]/g, ''))) {
        newErrors.contact_number = 'Contact number must be a valid Philippine mobile number (e.g., 09XX XXX XXXX or +639XX XXX XXXX)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || 'Profile updated successfully');
        setProfileData(data.data);

        // Update form data with response
        const updatedFormValues = {
          first_name: data.data.first_name || '',
          last_name: data.data.last_name || '',
          contact_number: data.data.contact_number || '',
        };

        setFormData(updatedFormValues);
        setOriginalData(JSON.parse(JSON.stringify(updatedFormValues)));
        setHasChanges(false);
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An unexpected error occurred while updating your profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(JSON.parse(JSON.stringify(originalData)));
    setErrors({});
    setHasChanges(false);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout
        roleId={6}
        pageTitle="Profile"
        pageDescription="Manage your Education Admin (HEPA) profile"
      >
        <Container size="full">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  if (!user || user.role_id !== 6) {
    return (
      <DashboardLayout
        roleId={6}
        pageTitle="Profile"
        pageDescription="Manage your Education Admin (HEPA) profile"
      >
        <Container size="full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">
              Unauthorized access. This page is only accessible to Education Admin (HEPA) users.
            </p>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      roleId={6}
      pageTitle="Profile"
      pageDescription="Manage your Education Admin (HEPA) profile"
    >
      <Container size="full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-primary-teal" />
              <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="First Name"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                error={errors.first_name}
              />

              <FormField
                label="Last Name"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                error={errors.last_name}
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>Email Address</span>
                  </div>
                </label>
                <input
                  type="email"
                  value={profileData?.email || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Email address cannot be changed. Contact Super Admin if you need to update it.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>Contact Number</span>
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent ${
                    errors.contact_number ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="09XX XXX XXXX"
                />
                {errors.contact_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.contact_number}</p>
                )}
                {!errors.contact_number && (
                  <p className="mt-1 text-sm text-gray-500">
                    Enter a valid Philippine mobile number (e.g., 09XX XXX XXXX)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Account Information (Read-only) */}
          <div className="bg-gray-50 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">Account Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-gray-600 font-medium mb-1">Role</p>
                <p className="text-gray-900 font-semibold">Education Admin (HEPA)</p>
                <p className="text-gray-500 text-xs mt-1">
                  Health Education Promotion Assistant - Announcement Management
                </p>
              </div>

              <div>
                <p className="text-gray-600 font-medium mb-1">Account Status</p>
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                    profileData?.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : profileData?.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {profileData?.status ? profileData.status.charAt(0).toUpperCase() + profileData.status.slice(1) : 'Unknown'}
                </span>
              </div>

              {profileData?.created_at && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Member Since</p>
                  <p className="text-gray-900">
                    {new Date(profileData.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={!hasChanges || saving}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={!hasChanges || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Container>
    </DashboardLayout>
  );
}
