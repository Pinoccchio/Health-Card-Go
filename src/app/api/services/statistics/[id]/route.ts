/**
 * Service Appointment Statistics Record API
 *
 * PUT /api/services/statistics/[id] - Update a record
 * DELETE /api/services/statistics/[id] - Delete a record
 *
 * Auth: healthcare_admin (hiv) or super_admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function verifyAccess(supabase: any, userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, admin_category')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return { allowed: false, status: 404, error: 'Profile not found' };
  }

  const isSuperAdmin = profile.role === 'super_admin';
  const isAllowedAdmin = profile.role === 'healthcare_admin' &&
    ['hiv', 'pregnancy'].includes(profile.admin_category);

  if (!isAllowedAdmin && !isSuperAdmin) {
    return {
      allowed: false,
      status: 403,
      error: 'Forbidden: Only authorized Healthcare Admins and Super Admins can modify statistics',
    };
  }

  return { allowed: true, profile };
}

/**
 * PUT /api/services/statistics/[id]
 * Update a service appointment statistics record
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Verify authentication
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

  try {
    const access = await verifyAccess(supabase, user.id);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();
    const {
      record_date,
      appointments_completed,
      barangay_id,
      source,
      notes,
    } = body;

    // Validate required fields
    if (!record_date || appointments_completed === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: record_date, appointments_completed',
        },
        { status: 400 }
      );
    }

    // Validate appointments_completed is positive
    if (!Number.isInteger(appointments_completed) || appointments_completed <= 0) {
      return NextResponse.json(
        { success: false, error: 'appointments_completed must be a positive integer' },
        { status: 400 }
      );
    }

    // Validate date is not in the future
    const recordDate = new Date(record_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (recordDate > today) {
      return NextResponse.json(
        { success: false, error: 'record_date cannot be in the future' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const updateData: Record<string, unknown> = {
      record_date,
      appointments_completed,
      barangay_id: barangay_id || null,
      source: source || null,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateError } = await adminClient
      .from('service_appointment_statistics')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        barangays (
          id,
          name
        ),
        profiles:created_by_id (
          first_name,
          last_name
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating service statistic:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Record updated successfully',
    });
  } catch (error: unknown) {
    console.error('Error in PUT /api/services/statistics/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/statistics/[id]
 * Delete a service appointment statistics record
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  // Verify authentication
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

  try {
    const access = await verifyAccess(supabase, user.id);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status }
      );
    }

    const adminClient = createAdminClient();

    // Check if record exists
    const { data: existingRecord, error: fetchError } = await adminClient
      .from('service_appointment_statistics')
      .select('id, record_date, appointments_completed')
      .eq('id', id)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Perform delete
    const { error: deleteError } = await adminClient
      .from('service_appointment_statistics')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting service statistic:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/services/statistics/[id]:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
