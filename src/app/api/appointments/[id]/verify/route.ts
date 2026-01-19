/**
 * Appointment Verification API Route
 * Allows Healthcare Admins to verify/reject uploaded documents
 *
 * Endpoints:
 * - PATCH /api/appointments/[id]/verify - Verify or reject appointment documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// PATCH /api/appointments/[id]/verify
// Verify or reject appointment documents and update appointment status
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body (from DocumentReviewPanel)
    const body = await request.json();
    const {
      action,
      notes,
    }: {
      action: 'approve' | 'reject';
      notes?: string;
    } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Map action to verification_status
    const verification_status = action === 'approve' ? 'approved' : 'rejected';

    // Fetch appointment to verify service access
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('service_id, patient_id, lab_location')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Fetch user profile to check role and service access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, assigned_service_id')
      .eq('id', user.id)
      .single();

    // Only Healthcare Admin assigned to this service can verify
    const isAuthorizedAdmin =
      profile?.role === 'healthcare_admin' &&
      profile.assigned_service_id === appointment.service_id;

    if (!isAuthorizedAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only assigned Healthcare Admin can verify documents' },
        { status: 403 }
      );
    }

    // Update ALL uploads for this appointment with verification status
    const { data: updatedUploads, error: updateError } = await supabase
      .from('appointment_uploads')
      .update({
        verification_status,
        verified_by_id: user.id,
        verified_at: new Date().toISOString(),
        verification_notes: notes,
      })
      .eq('appointment_id', appointmentId)
      .select();

    if (updateError) {
      console.error('[VERIFY] Update uploads error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update upload verification' },
        { status: 500 }
      );
    }

    // Check if all uploads for this appointment are now verified
    const { data: allUploads, error: fetchError } = await supabase
      .from('appointment_uploads')
      .select('verification_status')
      .eq('appointment_id', appointmentId);

    if (fetchError) {
      console.error('[VERIFY] Fetch all uploads error:', fetchError);
      // Don't fail the request - verification was successful
    }

    // Determine overall appointment verification status
    let appointmentVerificationStatus: 'pending' | 'approved' | 'rejected' = 'pending';
    let appointmentStatus = null; // Will update status if all approved

    if (allUploads && allUploads.length > 0) {
      const allApproved = allUploads.every((u) => u.verification_status === 'approved');
      const anyRejected = allUploads.some((u) => u.verification_status === 'rejected');

      if (anyRejected) {
        appointmentVerificationStatus = 'rejected';
      } else if (allApproved) {
        appointmentVerificationStatus = 'approved';
        appointmentStatus = 'scheduled'; // Transition from 'pending' to 'scheduled'
      }
    }

    // Update appointment verification status and status (if approved)
    const updateData: any = {
      verification_status: appointmentVerificationStatus,
      updated_at: new Date().toISOString(),
    };

    if (appointmentStatus) {
      updateData.status = appointmentStatus;
    }

    const { error: appointmentUpdateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId);

    if (appointmentUpdateError) {
      console.error('[VERIFY] Update appointment error:', appointmentUpdateError);
      // Don't fail the request - upload verification was successful
    }

    // Create notification for patient
    const notificationTitle =
      verification_status === 'approved'
        ? 'notifications.documents_approved.title'
        : 'notifications.documents_rejected.title';

    const notificationMessage =
      verification_status === 'approved'
        ? 'notifications.documents_approved.message'
        : 'notifications.documents_rejected.message';

    const { error: notificationError } = await supabase.from('notifications').insert({
      user_id: appointment.patient_id,
      type: verification_status === 'approved' ? 'info' : 'warning',
      title: notificationTitle,
      message: notificationMessage,
      link: '/patient/appointments',
      data: `appointment_id=${appointmentId}|verification_status=${verification_status}|notes=${verification_notes || ''}`,
    });

    if (notificationError) {
      console.error('[VERIFY] Notification error:', notificationError);
      // Don't fail the request - verification was successful
    }

    console.log(
      `✅ [VERIFY] Documents ${verification_status} for appointment ${appointmentId} by ${user.id}`
    );
    console.log(`📋 [VERIFY] Appointment overall status: ${appointmentVerificationStatus}`);

    return NextResponse.json({
      success: true,
      verification_status: appointmentVerificationStatus,
      updated_uploads: updatedUploads,
      message: `Documents ${verification_status} successfully`,
    });
  } catch (error: any) {
    console.error('[VERIFY] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
