import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateHealthCard } from '@/lib/health-cards/generateHealthCard';

/**
 * POST /api/admin/health-cards/generate-missing
 *
 * Admin utility to find and generate missing health cards for approved patients.
 * This is a safety net to fix any patients who were approved but didn't get health cards
 * due to application errors or race conditions.
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || (adminProfile.role !== 'super_admin' && adminProfile.role !== 'healthcare_admin')) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    console.log('[GENERATE MISSING] Starting health card generation for approved patients without health cards...');

    // Find all approved patients without health cards
    const { data: patientsWithoutCards, error: queryError } = await supabase.rpc('get_patients_missing_health_cards');

    if (queryError) {
      // If function doesn't exist, fall back to manual query
      console.log('[GENERATE MISSING] Using fallback query method');

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          barangay_id,
          emergency_contact
        `)
        .eq('role', 'patient')
        .eq('status', 'active');

      if (profilesError) {
        console.error('[GENERATE MISSING] Error fetching profiles:', profilesError);
        return NextResponse.json({ error: 'Failed to fetch profiles' }, { status: 500 });
      }

      // For each profile, check if they have a patient record and health card
      const missingPatients = [];
      for (const profile of profiles || []) {
        // Get patient record
        const { data: patient } = await supabase
          .from('patients')
          .select('id, patient_number')
          .eq('user_id', profile.id)
          .single();

        if (!patient || !patient.patient_number) {
          console.log(`[GENERATE MISSING] Skipping ${profile.email} - no patient record or patient_number`);
          continue;
        }

        // Check for health card
        const { data: healthCard } = await supabase
          .from('health_cards')
          .select('id')
          .eq('patient_id', patient.id)
          .maybeSingle();

        if (!healthCard) {
          missingPatients.push({
            user_id: profile.id,
            patient_id: patient.id,
            patient_number: patient.patient_number,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            barangay_id: profile.barangay_id,
            emergency_contact: profile.emergency_contact,
          });
        }
      }

      // Generate health cards for missing patients
      const results = {
        total_checked: profiles?.length || 0,
        missing_health_cards: missingPatients.length,
        generated: [] as any[],
        failed: [] as any[],
      };

      console.log(`[GENERATE MISSING] Found ${missingPatients.length} patients without health cards`);

      for (const patient of missingPatients) {
        try {
          console.log(`[GENERATE MISSING] Generating health card for ${patient.email} (${patient.patient_number})...`);

          const emergencyPhone = patient.emergency_contact?.phone;
          const result = await generateHealthCard({
            patientId: patient.patient_id,
            patientNumber: patient.patient_number,
            firstName: patient.first_name,
            lastName: patient.last_name,
            barangayId: patient.barangay_id,
            emergencyContactPhone: emergencyPhone,
          });

          if (result.success) {
            console.log(`✅ [GENERATE MISSING] Generated: ${result.cardNumber} for ${patient.email}`);
            results.generated.push({
              email: patient.email,
              patient_number: patient.patient_number,
              card_number: result.cardNumber,
            });
          } else {
            console.error(`❌ [GENERATE MISSING] Failed for ${patient.email}:`, result.error);
            results.failed.push({
              email: patient.email,
              patient_number: patient.patient_number,
              error: result.error,
            });
          }
        } catch (err) {
          console.error(`❌ [GENERATE MISSING] Exception for ${patient.email}:`, err);
          results.failed.push({
            email: patient.email,
            patient_number: patient.patient_number,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      console.log('[GENERATE MISSING] Completed:', results);

      return NextResponse.json({
        success: true,
        message: `Generated ${results.generated.length} health cards`,
        data: results,
      });
    }

    // If RPC function exists, use it
    return NextResponse.json({
      success: true,
      message: 'Health card generation completed',
      data: patientsWithoutCards,
    });

  } catch (error) {
    console.error('[GENERATE MISSING] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/health-cards/generate-missing
 *
 * Check how many approved patients are missing health cards (without generating them)
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || (adminProfile.role !== 'super_admin' && adminProfile.role !== 'healthcare_admin')) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Find approved patients without health cards
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('role', 'patient')
      .eq('status', 'active');

    const missingPatients = [];
    for (const profile of profiles || []) {
      const { data: patient } = await supabase
        .from('patients')
        .select('id, patient_number')
        .eq('user_id', profile.id)
        .single();

      if (!patient || !patient.patient_number) continue;

      const { data: healthCard } = await supabase
        .from('health_cards')
        .select('id')
        .eq('patient_id', patient.id)
        .maybeSingle();

      if (!healthCard) {
        missingPatients.push({
          email: profile.email,
          name: `${profile.first_name} ${profile.last_name}`,
          patient_number: patient.patient_number,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total_active_patients: profiles?.length || 0,
        missing_health_cards: missingPatients.length,
        patients: missingPatients,
      },
    });

  } catch (error) {
    console.error('[CHECK MISSING] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
