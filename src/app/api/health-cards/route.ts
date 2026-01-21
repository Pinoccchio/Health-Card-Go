import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  getExpirationInfo,
  getExpirationStatus,
  getDaysRemaining,
  isHealthCardExpired,
  formatExpiryDate,
  getStatusLabel,
} from '@/lib/utils/healthCardExpiration';

/**
 * GET /api/health-cards
 * Fetch the authenticated patient's health card with expiration information
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[HEALTH CARD API] Auth check:', { userId: user?.id, authError });

    if (authError || !user) {
      console.error('[HEALTH CARD API] Unauthorized - no user');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to verify patient role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name, date_of_birth, gender, contact_number, barangay_id, emergency_contact')
      .eq('id', user.id)
      .single();

    console.log('[HEALTH CARD API] Profile query result:', { profile, profileError });

    if (profileError || !profile) {
      console.error('[HEALTH CARD API] Profile not found:', profileError);
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    // Only patients can fetch their own health cards
    if (profile.role !== 'patient') {
      return NextResponse.json(
        { success: false, error: 'Only patients can access health cards' },
        { status: 403 }
      );
    }

    // Get patient record
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select(`
        id,
        patient_number,
        allergies,
        current_medications,
        medical_history
      `)
      .eq('user_id', user.id)
      .single();

    console.log('[HEALTH CARD API] Patient query result:', { patient, patientError });

    if (patientError || !patient) {
      console.error('[HEALTH CARD API] Patient record not found:', patientError);
      return NextResponse.json({ success: false, error: 'Patient record not found' }, { status: 404 });
    }

    // Check if patient has at least one completed appointment
    const { data: completedAppointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patient.id)
      .eq('status', 'completed');

    console.log('[HEALTH CARD API] Completed appointments check:', {
      count: completedAppointments?.length || 0,
      appointmentError
    });

    if (!completedAppointments || completedAppointments.length === 0) {
      console.log('[HEALTH CARD API] No completed appointments - health card not available');
      return NextResponse.json(
        {
          success: false,
          error: 'Health card not available',
          message: 'Your health card will be available after your first completed appointment.'
        },
        { status: 404 }
      );
    }

    // Get barangay name separately (patients table has no FK to barangays)
    let barangayName = 'Unknown';
    if (profile.barangay_id) {
      const { data: barangay, error: barangayError } = await supabase
        .from('barangays')
        .select('name')
        .eq('id', profile.barangay_id)
        .single();

      console.log('[HEALTH CARD API] Barangay query result:', { barangay, barangayError });
      barangayName = barangay?.name || 'Unknown';
    }

    // Get health card with expiration status from the view
    const { data: healthCard, error: cardError } = await supabase
      .from('health_cards_with_status')
      .select('*')
      .eq('patient_id', patient.id)
      .single();

    console.log('[HEALTH CARD API] Health card query result:', { healthCard, cardError });

    if (cardError || !healthCard) {
      console.error('[HEALTH CARD API] Health card not found:', cardError);
      return NextResponse.json(
        {
          success: false,
          error: 'Health card not found',
          message: 'Your health card will be available after your first completed appointment.'
        },
        { status: 404 }
      );
    }

    // Calculate expiration information
    const expirationInfo = getExpirationInfo(healthCard.expiry_date);
    const expirationStatus = getExpirationStatus(healthCard.expiry_date);
    const statusLabel = getStatusLabel(expirationStatus);

    // Extract blood type from medical_history JSON if available
    const bloodType = patient.medical_history?.blood_type || null;

    // Combine all data for the health card
    const healthCardData = {
      ...healthCard,
      patient: {
        id: patient.id,
        patient_number: patient.patient_number,
        first_name: profile.first_name,
        last_name: profile.last_name,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        contact_number: profile.contact_number,
        blood_type: bloodType,
        barangay: barangayName,
        barangay_id: profile.barangay_id,
        allergies: patient.allergies,
        current_medications: patient.current_medications,
        emergency_contact: profile.emergency_contact,
        medical_history: patient.medical_history,
      },
      expiration: {
        expiry_date: healthCard.expiry_date,
        formatted_expiry_date: formatExpiryDate(healthCard.expiry_date),
        is_expired: isHealthCardExpired(healthCard.expiry_date),
        days_remaining: getDaysRemaining(healthCard.expiry_date),
        status: expirationStatus,
        status_label: statusLabel,
        warning_message: expirationInfo.warningMessage,
      }
    };

    console.log('[HEALTH CARD API] Success - returning health card data with expiration info');

    return NextResponse.json({
      success: true,
      data: healthCardData,
    });
  } catch (error) {
    console.error('Error fetching health card:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
