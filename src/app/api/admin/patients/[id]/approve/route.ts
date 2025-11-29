import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

    // Verify patient exists and is pending
    const { data: patient, error: patientCheckError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, status, role')
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
      .single();

    if (updateError) {
      console.error('Error approving patient:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve patient' },
        { status: 500 }
      );
    }

    // TODO: Send approval notification/email to patient
    // This will be implemented when notification system is built

    console.log(`✅ Patient approved: ${patient.email} by ${adminProfile.first_name} ${adminProfile.last_name}`);

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
