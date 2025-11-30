import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/health-cards/doctor/[patient_id]
 * Fetch health card for a patient (doctor access)
 * Security: Only returns health card if doctor has appointments with this patient
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patient_id: string }> }
) {
  try {
    const supabase = await createClient();
    const { patient_id } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a doctor
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Forbidden: Only doctors can access this endpoint' },
        { status: 403 }
      );
    }

    // Get doctor record
    const { data: doctorRecord } = await supabase
      .from('doctors')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!doctorRecord) {
      return NextResponse.json({ error: 'Doctor record not found' }, { status: 404 });
    }

    // Use admin client for verification
    const adminClient = createAdminClient();

    // Verify doctor has appointments with this patient
    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctorRecord.id)
      .eq('patient_id', patient_id)
      .limit(1)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'You do not have access to this patient\'s health card' },
        { status: 403 }
      );
    }

    // Fetch health card
    const { data: healthCard, error: healthCardError } = await adminClient
      .from('health_cards')
      .select(`
        *,
        patients!inner(
          id,
          patient_number,
          user_id,
          allergies,
          current_medications,
          medical_history,
          accessibility_requirements,
          profiles!inner(
            first_name,
            last_name,
            date_of_birth,
            gender,
            contact_number,
            emergency_contact,
            barangays(
              id,
              name,
              code
            )
          )
        )
      `)
      .eq('patient_id', patient_id)
      .eq('is_active', true)
      .single();

    if (healthCardError || !healthCard) {
      return NextResponse.json(
        { error: 'Health card not found for this patient' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: healthCard,
    });

  } catch (error) {
    console.error('Health card fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
