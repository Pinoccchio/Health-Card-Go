import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createApprovalNotification } from '@/lib/notifications/createNotification';
import { generateHealthCard } from '@/lib/health-cards/generateHealthCard';

/**
 * POST /api/admin/patients/[id]/approve
 *
 * Approves a pending patient account.
 * Sets status to 'active', records approval timestamp and approver.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get admin's profile to check role
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only super_admin and healthcare_admin can approve patients
    if (
      adminProfile.role !== 'super_admin' &&
      adminProfile.role !== 'healthcare_admin'
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can approve patients' },
        { status: 403 }
      );
    }

    // Verify patient exists and is pending (join with patients table for patient_number)
    const { data: patient, error: patientCheckError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        status,
        role,
        barangay_id,
        emergency_contact
      `)
      .eq('id', patientId)
      .single();

    if (patientCheckError || !patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    if (patient.role !== 'patient') {
      return NextResponse.json(
        { error: 'Cannot approve non-patient account' },
        { status: 400 }
      );
    }

    if (patient.status !== 'pending') {
      return NextResponse.json(
        { error: `Patient is already ${patient.status}` },
        { status: 400 }
      );
    }

    // Update patient status to active
    const { data: updatedPatient, error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'active',
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        rejection_reason: null, // Clear any previous rejection reason
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Error approving patient:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve patient' },
        { status: 500 }
      );
    }

    if (!updatedPatient) {
      console.error('Patient update returned no rows - possible RLS policy issue');
      return NextResponse.json(
        { error: 'Failed to update patient status. Please check permissions.' },
        { status: 500 }
      );
    }

    // Get patient record to retrieve patient_number
    const { data: patientRecord, error: patientRecordError } = await supabase
      .from('patients')
      .select('patient_number')
      .eq('user_id', patientId)
      .single();

    if (patientRecordError || !patientRecord) {
      console.error('Error fetching patient record:', patientRecordError);
      // Continue with approval even if we can't get patient record
    }

    // Generate health card for the approved patient
    if (patientRecord?.patient_number) {
      const emergencyPhone = patient.emergency_contact?.phone;
      const healthCardResult = await generateHealthCard({
        patientId,
        patientNumber: patientRecord.patient_number,
        firstName: patient.first_name,
        lastName: patient.last_name,
        barangayId: patient.barangay_id,
        emergencyContactPhone: emergencyPhone,
      });

      if (!healthCardResult.success) {
        console.error('Failed to generate health card:', healthCardResult.error);
        // Don't fail the approval if health card generation fails
      } else {
        console.log(`✅ Health card generated: ${healthCardResult.cardNumber}`);
      }
    }

    // Send approval notification to patient
    const approverName = `${adminProfile.first_name} ${adminProfile.last_name}`;
    const patientName = `${patient.first_name} ${patient.last_name}`;

    await createApprovalNotification(patientId, patientName, approverName);

    console.log(`✅ Patient approved: ${patient.email} by ${approverName}`);

    return NextResponse.json({
      success: true,
      message: 'Patient approved successfully',
      data: updatedPatient,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/patients/[id]/approve:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
