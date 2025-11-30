import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { createRejectionNotification } from '@/lib/notifications/createNotification';

/**
 * POST /api/admin/patients/[id]/reject
 *
 * Rejects a pending patient account with an optional reason.
 * Sets status to 'rejected' and records rejection reason.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

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

    // Only super_admin and healthcare_admin can reject patients
    if (
      adminProfile.role !== 'super_admin' &&
      adminProfile.role !== 'healthcare_admin'
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can reject patients' },
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
        { error: 'Cannot reject non-patient account' },
        { status: 400 }
      );
    }

    if (patient.status !== 'pending') {
      return NextResponse.json(
        { error: `Patient is already ${patient.status}` },
        { status: 400 }
      );
    }

    // Update patient status to rejected
    const { data: updatedPatient, error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim(),
        approved_at: null, // Clear approval timestamp if any
        approved_by: null, // Clear approver if any
        updated_at: new Date().toISOString(),
      })
      .eq('id', patientId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Error rejecting patient:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject patient' },
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

    // Send rejection notification to patient
    const patientName = `${patient.first_name} ${patient.last_name}`;
    await createRejectionNotification(patientId, patientName, reason.trim());

    console.log(`❌ Patient rejected: ${patient.email} by ${adminProfile.first_name} ${adminProfile.last_name}`);
    console.log(`   Reason: ${reason.trim()}`);

    return NextResponse.json({
      success: true,
      message: 'Patient rejected successfully',
      data: updatedPatient,
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/patients/[id]/reject:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
