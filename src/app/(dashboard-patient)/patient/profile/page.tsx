'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { FormField, Select } from '@/components/auth';
import { Button } from '@/components/ui';
import { useToast } from '@/lib/contexts/ToastContext';
import { User, Phone, MapPin, Heart, Calendar, Shield, FileText } from 'lucide-react';
import { BLOOD_TYPES, GENDER_OPTIONS } from '@/lib/config/profileConstants';
import { validateProfileForm, hasValidationErrors, ValidationErrors, ProfileFormData } from '@/lib/validators/profileValidation';

interface Barangay {
  id: number;
  name: string;
  code: string;
}

export default function PatientProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<ProfileFormData>>({
    first_name: '',
    last_name: '',
    contact_number: '',
    date_of_birth: '',
    gender: '',
    barangay_id: null,
    emergency_contact: {
      name: '',
      phone: '',
      email: '',
    },
    blood_type: '',
    philhealth_number: '',
    medical_history: {},
    allergies: [],
    current_medications: '',
    accessibility_requirements: '',
  });
  const [originalData, setOriginalData] = useState<Partial<ProfileFormData>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [barangaysLoading, setBarangaysLoading] = useState<boolean>(true);

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

  // Barangay options for select
  const barangayOptions = barangays.map(b => ({
    value: b.id,
    label: b.name,
  }));

  // Load profile data
  useEffect(() => {
    if (user && user.role_id === 4) {
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
        const formValues: Partial<ProfileFormData> = {
          first_name: data.data.first_name || '',
          last_name: data.data.last_name || '',
          contact_number: data.data.contact_number || '',
          date_of_birth: data.data.date_of_birth || '',
          gender: data.data.gender || '',
          barangay_id: data.data.barangay_id || null,
          emergency_contact: {
            name: data.data.emergency_contact?.name || '',
            phone: data.data.emergency_contact?.phone || '',
            email: data.data.emergency_contact?.email || '',
          },
          blood_type: data.data.blood_type || '',
          philhealth_number: data.data.philhealth_number || '',
          medical_history: data.data.medical_history || {},
          allergies: Array.isArray(data.data.allergies) ? data.data.allergies : [],
          current_medications: data.data.current_medications || '',
          accessibility_requirements: data.data.accessibility_requirements || '',
        };

        setFormData(formValues);
        setOriginalData(JSON.parse(JSON.stringify(formValues)));
      } else {
        toast.error(data.error || t('errors.load_failed'));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error(t('errors.unexpected'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateProfileForm(formData);
    setErrors(validationErrors);

    if (hasValidationErrors(validationErrors)) {
      toast.error(t('errors.validation_failed'));
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
        toast.success(data.message || t('messages.success'));
        setProfileData(data.data);

        // Update form data with response
        const updatedFormValues: Partial<ProfileFormData> = {
          first_name: data.data.first_name || '',
          last_name: data.data.last_name || '',
          contact_number: data.data.contact_number || '',
          date_of_birth: data.data.date_of_birth || '',
          gender: data.data.gender || '',
          barangay_id: data.data.barangay_id || null,
          emergency_contact: {
            name: data.data.emergency_contact?.name || '',
            phone: data.data.emergency_contact?.phone || '',
            email: data.data.emergency_contact?.email || '',
          },
          blood_type: data.data.blood_type || '',
          philhealth_number: data.data.philhealth_number || '',
          medical_history: data.data.medical_history || {},
          allergies: Array.isArray(data.data.allergies) ? data.data.allergies : [],
          current_medications: data.data.current_medications || '',
          accessibility_requirements: data.data.accessibility_requirements || '',
        };

        setFormData(updatedFormValues);
        setOriginalData(JSON.parse(JSON.stringify(updatedFormValues)));
        setHasChanges(false);
      } else {
        toast.error(data.error || t('errors.update_failed'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('errors.unexpected'));
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
      <DashboardLayout roleId={4} pageTitle={t('title')} pageDescription={t('description')}>
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

  if (!user || user.role_id !== 4) {
    return (
      <DashboardLayout roleId={4} pageTitle={t('title')} pageDescription={t('description')}>
        <Container size="full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{t('unauthorized')}</p>
          </div>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout roleId={4} pageTitle={t('title')} pageDescription={t('description')}>
      <Container size="full">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-6 h-6 text-primary-teal" />
              <h2 className="text-xl font-bold text-gray-900">{t('sections.personal_info')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <FormField
                label={t('fields.first_name')}
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                error={errors.first_name}
              />

              <FormField
                label={t('fields.last_name')}
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                error={errors.last_name}
              />

              <div className="md:col-span-2">
                <FormField
                  label={t('fields.email')}
                  type="email"
                  value={profileData?.email || ''}
                  disabled
                  helperText={t('fields.email_readonly')}
                />
              </div>

              <FormField
                label={t('fields.date_of_birth')}
                type="date"
                required
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                error={errors.date_of_birth}
              />

              <Select
                label={t('fields.gender')}
                required
                options={GENDER_OPTIONS}
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                error={errors.gender}
              />

              <FormField
                label={t('fields.contact_number')}
                required
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                error={errors.contact_number}
                helperText={t('fields.phone_format')}
              />

              <Select
                label={t('fields.barangay')}
                required
                options={barangayOptions}
                placeholder={barangaysLoading ? t('fields.loading_barangays') : t('fields.select_barangay')}
                value={formData.barangay_id?.toString() || ''}
                onChange={(e) => setFormData({ ...formData, barangay_id: parseInt(e.target.value) })}
                error={errors.barangay_id}
                disabled={barangaysLoading}
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <Phone className="w-6 h-6 text-primary-teal" />
              <h2 className="text-xl font-bold text-gray-900">{t('sections.emergency_contact')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label={t('fields.emergency_name')}
                required
                value={formData.emergency_contact?.name || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact!, name: e.target.value }
                })}
                error={errors.emergency_contact_name}
              />

              <FormField
                label={t('fields.emergency_phone')}
                required
                value={formData.emergency_contact?.phone || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact!, phone: e.target.value }
                })}
                error={errors.emergency_contact_phone}
                helperText={t('fields.phone_format')}
              />

              <FormField
                label={t('fields.emergency_email')}
                type="email"
                value={formData.emergency_contact?.email || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  emergency_contact: { ...formData.emergency_contact!, email: e.target.value }
                })}
                error={errors.emergency_contact_email}
              />
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <Heart className="w-6 h-6 text-primary-teal" />
              <h2 className="text-xl font-bold text-gray-900">{t('sections.medical_info')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label={t('fields.blood_type')}
                options={BLOOD_TYPES}
                value={formData.blood_type || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  blood_type: e.target.value
                })}
                placeholder={t('fields.select_blood_type')}
              />

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.allergies')}
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  rows={3}
                  value={Array.isArray(formData.allergies) ? formData.allergies.join('\n') : ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    allergies: e.target.value.split('\n').filter(a => a.trim() !== '')
                  })}
                  placeholder={t('fields.allergies_placeholder')}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.current_medications')}
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
                  rows={3}
                  value={formData.current_medications || ''}
                  onChange={(e) => setFormData({ ...formData, current_medications: e.target.value })}
                  placeholder={t('fields.medications_placeholder')}
                />
              </div>
            </div>
          </div>

          {/* Account Information (Read-only) */}
          <div className="bg-gray-50 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-gray-600" />
              <h2 className="text-xl font-bold text-gray-900">{t('sections.account_info')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-gray-600 font-medium mb-1">{t('fields.account_status')}</p>
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                  profileData?.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : profileData?.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {profileData?.status || 'Unknown'}
                </span>
              </div>

              {profileData?.patient_number && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">{t('fields.patient_number')}</p>
                  <p className="text-gray-900 font-mono">{profileData.patient_number}</p>
                </div>
              )}

              {profileData?.created_at && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">{t('fields.member_since')}</p>
                  <p className="text-gray-900">
                    {new Date(profileData.created_at).toLocaleDateString()}
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
              {t('actions.cancel')}
            </Button>

            <Button
              type="submit"
              disabled={!hasChanges || saving}
            >
              {saving ? t('actions.saving') : t('actions.save_changes')}
            </Button>
          </div>
        </form>
      </Container>
    </DashboardLayout>
  );
}
