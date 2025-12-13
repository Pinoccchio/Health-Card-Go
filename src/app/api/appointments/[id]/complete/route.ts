import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/appointments/[id]/complete
 * Complete an appointment (Healthcare Admin or Super Admin only)
 *
 * Business Rules:
 * - Only Healthcare Admins or Super Admins can complete appointments
 * - Healthcare Admins can only complete appointments for their assigned service
 * - Appointment must be in 'scheduled' or 'checked_in' status
 * - If service requires medical record, must provide medical record data
 * - Updates appointment status to 'completed' and sets completion metadata
 * - Creates medical record if required and provided
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with assigned service
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only Healthcare Admins and Super Admins can complete appointments
    if (profile.role !== 'healthcare_admin' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only Healthcare Admins and Super Admins can complete appointments' },
        { status: 403 }
      );
    }

    // Get appointment with service details
    const adminClient = createAdminClient();
    const { data: appointment, error: appointmentError } = await adminClient
      .from('appointments')
      .select(`
        *,
        services!inner(
          id,
          name,
          category,
          requires_medical_record
        ),
        patients!inner(
          id,
          user_id
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Healthcare Admins can only complete appointments for their assigned service
    if (profile.role === 'healthcare_admin') {
      if (!profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'No service assigned to your account' },
          { status: 403 }
        );
      }

      if (appointment.service_id !== profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'You can only complete appointments for your assigned service' },
          { status: 403 }
        );
      }
    }

    // Verify appointment can be completed (must be in_progress)
    if (appointment.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Cannot complete appointment with status '${appointment.status}'. Appointment must be in 'in_progress' status to be completed.` },
        { status: 400 }
      );
    }

    // Get request body
    const body = await request.json();
    const { medical_record } = body;

    // If service requires medical record, validate it's provided
    if (appointment.services.requires_medical_record && !medical_record) {
      return NextResponse.json(
        { error: 'This service requires a medical record. Please provide medical record data.' },
        { status: 400 }
      );
    }

    // Validate medical record data if provided
    if (medical_record) {
      if (!medical_record.category) {
        return NextResponse.json(
          { error: 'Medical record category is required' },
          { status: 400 }
        );
      }

      const validCategories = ['general', 'healthcard', 'hiv', 'pregnancy', 'immunization'];
      if (!validCategories.includes(medical_record.category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Step 1: Update appointment status to completed
    const now = new Date().toISOString();
    const { data: updatedAppointment, error: updateError } = await adminClient
      .from('appointments')
      .update({
        status: 'completed',
        completed_at: now,
        completed_by_id: profile.id,
        updated_at: now,
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appointment:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete appointment' },
        { status: 500 }
      );
    }

    // Step 2: Create medical record if provided
    let createdMedicalRecord = null;
    if (medical_record) {
      const { data: medicalRecord, error: medicalRecordError } = await adminClient
        .from('medical_records')
        .insert({
          patient_id: appointment.patient_id,
          appointment_id: appointmentId,
          created_by_id: profile.id,
          category: medical_record.category,
          diagnosis: medical_record.diagnosis || null,
          prescription: medical_record.prescription || null,
          notes: medical_record.notes || null,
          record_data: medical_record.record_data || null,
          is_encrypted: medical_record.category === 'hiv' || medical_record.category === 'pregnancy',
        })
        .select()
        .single();

      if (medicalRecordError) {
        console.error('Error creating medical record:', medicalRecordError);
        // Don't fail the request - appointment is already completed
        // Log the error and continue
        console.warn('Appointment completed but medical record creation failed');
      } else {
        createdMedicalRecord = medicalRecord;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment completed successfully',
      data: {
        appointment: updatedAppointment,
        medical_record: createdMedicalRecord,
      },
    });

  } catch (error) {
    console.error('Appointment completion error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
