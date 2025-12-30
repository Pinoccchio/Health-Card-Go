'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import HealthCardDisplay from '@/components/health-card/HealthCardDisplay';
import { Heart, Loader2, AlertCircle } from 'lucide-react';

interface HealthCardData {
  id: string;
  card_number: string;
  qr_code_data: string;
  issue_date: string;
  expiry_date: string | null;
  is_active: boolean | null;
  patient: {
    id: string;
    patient_number: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    contact_number: string;
    blood_type?: string;
    barangay: string;
    allergies?: string;
    current_medications?: string;
    emergency_contact: {
      name: string;
      phone: string;
      relationship?: string;
    };
  };
}

export default function PatientHealthCardPage() {
  const t = useTranslations('health_card');
  const [healthCard, setHealthCard] = useState<HealthCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHealthCard();
  }, []);

  const loadHealthCard = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[HEALTH CARD PAGE] Fetching health card...');
      const response = await fetch('/api/health-cards');
      const data = await response.json();

      console.log('[HEALTH CARD PAGE] API Response:', {
        status: response.status,
        ok: response.ok,
        data
      });

      if (!response.ok) {
        console.error('[HEALTH CARD PAGE] API error:', data);
        setError(data.error || data.message || 'Failed to load health card');
        return;
      }

      if (data.success) {
        console.log('[HEALTH CARD PAGE] Health card loaded successfully');
        setHealthCard(data.data);
      }
    } catch (err) {
      console.error('[HEALTH CARD PAGE] Exception:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      roleId={4}
      pageTitle={t('title')}
      pageDescription={t('description')}
    >
      <Container size="full">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-600">{t('loading')}</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('error.title')}</h2>
              <p className="text-gray-600 text-center max-w-md mb-6">{error}</p>
              <button
                onClick={loadHealthCard}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('error.try_again')}
              </button>
            </div>
          </div>
        ) : healthCard ? (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('success.heading')}</h2>
              <p className="text-gray-600">
                {t('success.description')}
              </p>
            </div>

            <HealthCardDisplay healthCard={healthCard} />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('no_card.heading')}</h2>
              <p className="text-gray-600">
                {t('no_card.description')}
              </p>
            </div>
          </div>
        )}
      </Container>
    </DashboardLayout>
  );
}
