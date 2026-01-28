/**
 * Appointment Requirements API Route
 * Handles checkbox-based requirements verification for health card appointments
 * Replaces document uploads with simple checkbox confirmation
 *
 * Endpoints:
 * - GET /api/appointments/[id]/requirements - List all requirements for an appointment
 * - POST /api/appointments/[id]/requirements - Confirm requirements via checkbox
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================================================
// GET /api/appointments/[id]/requirements
// List all requirements for an appointment
// ============================================================================

export async function GET(
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

    // Fetch appointment to verify access
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('patient_id, service_id')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Fetch user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, assigned_service_id')
      .eq('id', user.id)
      .single();

    // Get patient record for current user (if patient role)
    let patientRecord = null;
    if (profile?.role === 'patient') {
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();
      patientRecord = patient;
    }

    // Verify access
    const isPatient = profile?.role === 'patient' && patientRecord && appointment.patient_id === patientRecord.id;
    const isHealthcareAdmin =
      profile?.role === 'healthcare_admin' &&
      profile.assigned_service_id === appointment.service_id;
    const isSuperAdmin = profile?.role === 'super_admin';

    if (!isPatient && !isHealthcareAdmin && !isSuperAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Fetch all requirements (from appointment_uploads table with is_checkbox_verified = true)
    const { data: requirements, error: requirementsError } = await supabase
      .from('appointment_uploads')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('is_checkbox_verified', true)
      .order('created_at', { ascending: true });

    if (requirementsError) {
      console.error('[REQUIREMENTS] Error fetching requirements:', requirementsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch requirements' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requirements: requirements || [],
    });
  } catch (error: any) {
    console.error('[REQUIREMENTS] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/appointments/[id]/requirements
// Confirm requirements via checkbox (no file upload)
// ============================================================================

export async function POST(
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

    // Parse request body
    const body = await request.json();
    const { requirements } = body;

    if (!requirements || !Array.isArray(requirements)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid requirements array' },
        { status: 400 }
      );
    }

    // Fetch appointment to verify access
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('patient_id')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { success: false, error: 'Appointment not found' },
        { status: 404 }
      );
    }

    // Get patient record for current user
    const { data: patientRecord, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (patientError || !patientRecord) {
      return NextResponse.json(
        { success: false, error: 'Patient record not found' },
        { status: 404 }
      );
    }

    // Verify patient owns this appointment
    if (appointment.patient_id !== patientRecord.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your appointment' },
        { status: 403 }
      );
    }

    // Delete existing requirements for this appointment (to handle re-submission)
    await supabase
      .from('appointment_uploads')
      .delete()
      .eq('appointment_id', appointmentId)
      .eq('is_checkbox_verified', true);

    // Insert new requirements
    const insertData = requirements
      .filter((req: any) => req.isConfirmed)
      .map((req: any) => ({
        appointment_id: appointmentId,
        file_type: req.type,
        requirement_label: req.label,
        is_checkbox_verified: true,
        checkbox_verified_at: req.confirmedAt || new Date().toISOString(),
        uploaded_by_id: user.id,
        verification_status: 'pending',
        // File fields are null for checkbox verification
        file_name: null,
        file_url: null,
        file_size_bytes: null,
        mime_type: null,
        storage_path: null,
      }));

    if (insertData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No requirements confirmed' },
        { status: 400 }
      );
    }

    const { data: insertedRequirements, error: insertError } = await supabase
      .from('appointment_uploads')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('[REQUIREMENTS] Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save requirements' },
        { status: 500 }
      );
    }

    console.log(`[REQUIREMENTS] Confirmed ${insertData.length} requirements for appointment ${appointmentId}`);

    return NextResponse.json({
      success: true,
      requirements: insertedRequirements,
    });
  } catch (error: any) {
    console.error('[REQUIREMENTS] POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
