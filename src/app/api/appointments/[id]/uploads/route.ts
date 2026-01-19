/**
 * Appointment Uploads API Route
 * Handles document uploads for health card appointments
 *
 * Endpoints:
 * - GET /api/appointments/[id]/uploads - List all uploads for an appointment
 * - POST /api/appointments/[id]/uploads - Upload a new document
 * - DELETE /api/appointments/[id]/uploads - Delete an unverified upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// GET /api/appointments/[id]/uploads
// List all uploads for an appointment
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

    // Verify access:
    // - Patient can view own appointment uploads (compare patient IDs from patients table)
    // - Healthcare Admin can view uploads for their assigned service
    // - Super Admin can view all uploads
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

    // Fetch all uploads for this appointment
    const { data: uploads, error: uploadsError } = await supabase
      .from('appointment_uploads')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('uploaded_at', { ascending: false });

    if (uploadsError) {
      console.error('[UPLOADS] Error fetching uploads:', uploadsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch uploads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      uploads: uploads || [],
    });
  } catch (error: any) {
    console.error('[UPLOADS] GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/appointments/[id]/uploads
// Upload a new document
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('file_type') as string;

    if (!file || !fileType) {
      return NextResponse.json(
        { success: false, error: 'Missing file or file_type' },
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

    // Verify patient owns this appointment (compare patient IDs from patients table)
    if (appointment.patient_id !== patientRecord.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your appointment' },
        { status: 403 }
      );
    }

    // Generate unique file path
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const storagePath = `${user.id}/${appointmentId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('appointment-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[UPLOADS] Storage upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('appointment-documents').getPublicUrl(storagePath);

    // Insert upload record into database
    const { data: uploadRecord, error: insertError } = await supabase
      .from('appointment_uploads')
      .insert({
        appointment_id: appointmentId,
        file_type: fileType,
        file_name: file.name,
        file_url: publicUrl,
        file_size_bytes: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        uploaded_by_id: user.id,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[UPLOADS] Database insert error:', insertError);

      // Clean up uploaded file
      await supabase.storage.from('appointment-documents').remove([storagePath]);

      return NextResponse.json(
        { success: false, error: 'Failed to save upload record' },
        { status: 500 }
      );
    }

    console.log(`✅ [UPLOADS] File uploaded: ${file.name} (${fileType}) for appointment ${appointmentId}`);

    return NextResponse.json({
      success: true,
      upload: uploadRecord,
    });
  } catch (error: any) {
    console.error('[UPLOADS] POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/appointments/[id]/uploads
// Delete an unverified upload
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
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

    // Get upload_id from query params
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('upload_id');

    if (!uploadId) {
      return NextResponse.json(
        { success: false, error: 'Missing upload_id' },
        { status: 400 }
      );
    }

    // Fetch upload record
    const { data: upload, error: fetchError } = await supabase
      .from('appointment_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (fetchError || !upload) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (upload.uploaded_by_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Not your upload' },
        { status: 403 }
      );
    }

    // Verify upload is still pending
    if (upload.verification_status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete verified/rejected upload' },
        { status: 400 }
      );
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('appointment-documents')
      .remove([upload.storage_path]);

    if (storageError) {
      console.error('[UPLOADS] Storage delete error:', storageError);
      // Continue anyway - database record is more critical
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('appointment_uploads')
      .delete()
      .eq('id', uploadId);

    if (deleteError) {
      console.error('[UPLOADS] Database delete error:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete upload record' },
        { status: 500 }
      );
    }

    console.log(`✅ [UPLOADS] Upload deleted: ${uploadId}`);

    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully',
    });
  } catch (error: any) {
    console.error('[UPLOADS] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
