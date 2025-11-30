import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/health-cards
 * Fetch the authenticated patient's health card
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[HEALTH CARD API] Auth check:', { userId: user?.id, authError });

    if (authError || !user) {
      console.error('[HEALTH CARD API] Unauthorized - no user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only patients can fetch their own health cards
    if (profile.role !== 'patient') {
      return NextResponse.json(
        { error: 'Only patients can access health cards' },
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
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
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

    // Get health card
    const { data: healthCard, error: cardError } = await supabase
      .from('health_cards')
      .select('*')
      .eq('patient_id', patient.id)
      .single();

    console.log('[HEALTH CARD API] Health card query result:', { healthCard, cardError });

    if (cardError || !healthCard) {
      console.error('[HEALTH CARD API] Health card not found:', cardError);
      return NextResponse.json(
        {
          error: 'Health card not found',
          message: 'Your health card will be generated once your account is approved.'
        },
        { status: 404 }
      );
    }

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
      }
    };

    console.log('[HEALTH CARD API] Success - returning health card data');

    return NextResponse.json({
      success: true,
      data: healthCardData,
    });
  } catch (error) {
    console.error('Error fetching health card:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
