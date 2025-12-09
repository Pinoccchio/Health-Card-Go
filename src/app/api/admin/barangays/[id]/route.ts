import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { updateBarangaySchema, type CreateBarangayData } from '@/types/barangay';

/**
 * PUT /api/admin/barangays/[id]
 *
 * Updates an existing barangay.
 * Accessible by Super Admin only.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params to get id
    const { id } = await params;

    // Verify Super Admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can update barangays' },
        { status: 403 }
      );
    }

    // Parse barangay ID
    const barangayId = parseInt(id);
    if (isNaN(barangayId)) {
      return NextResponse.json(
        { error: 'Invalid barangay ID' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = updateBarangaySchema.safeParse({
      ...body,
      id: barangayId,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const updateData = validationResult.data;

    // Check if barangay exists
    const { data: existingBarangay, error: checkError } = await supabase
      .from('barangays')
      .select('id, name, code')
      .eq('id', barangayId)
      .single();

    if (checkError || !existingBarangay) {
      return NextResponse.json(
        { error: 'Barangay not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being updated
    if (updateData.name && updateData.name !== existingBarangay.name) {
      const { data: duplicateName } = await supabase
        .from('barangays')
        .select('id')
        .ilike('name', updateData.name)
        .neq('id', barangayId)
        .single();

      if (duplicateName) {
        return NextResponse.json(
          { error: 'A barangay with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Check for duplicate code if code is being updated
    if (updateData.code && updateData.code !== existingBarangay.code) {
      const { data: duplicateCode } = await supabase
        .from('barangays')
        .select('id')
        .ilike('code', updateData.code)
        .neq('id', barangayId)
        .single();

      if (duplicateCode) {
        return NextResponse.json(
          { error: 'A barangay with this code already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data - remove undefined fields
    const cleanUpdateData: Partial<CreateBarangayData> = {};
    if (updateData.name !== undefined) cleanUpdateData.name = updateData.name;
    if (updateData.code !== undefined) cleanUpdateData.code = updateData.code;
    if (updateData.coordinates !== undefined) cleanUpdateData.coordinates = updateData.coordinates;

    // Update barangay
    const { data: updatedBarangay, error: updateError } = await supabase
      .from('barangays')
      .update(cleanUpdateData)
      .eq('id', barangayId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating barangay:', updateError);
      return NextResponse.json(
        { error: 'Failed to update barangay' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Barangay updated successfully',
      data: updatedBarangay,
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/barangays/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/barangays/[id]
 *
 * Deletes a barangay. Prevents deletion if barangay has associated patients or disease records.
 * Accessible by Super Admin only.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params to get id
    const { id } = await params;

    // Verify Super Admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can delete barangays' },
        { status: 403 }
      );
    }

    // Parse barangay ID
    const barangayId = parseInt(id);
    if (isNaN(barangayId)) {
      return NextResponse.json(
        { error: 'Invalid barangay ID' },
        { status: 400 }
      );
    }

    // Check if barangay exists
    const { data: existingBarangay, error: checkError } = await supabase
      .from('barangays')
      .select('id, name')
      .eq('id', barangayId)
      .single();

    if (checkError || !existingBarangay) {
      return NextResponse.json(
        { error: 'Barangay not found' },
        { status: 404 }
      );
    }

    // Check for associated patients
    const { data: patients, error: patientCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('barangay_id', barangayId)
      .limit(1);

    if (patientCheckError) {
      console.error('Error checking patients:', patientCheckError);
      return NextResponse.json(
        { error: 'Failed to verify barangay references' },
        { status: 500 }
      );
    }

    if (patients && patients.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete barangay',
          message: 'This barangay has associated patient records. Please reassign or remove all patients before deleting.',
        },
        { status: 409 }
      );
    }

    // Check for associated disease records
    const { data: diseases, error: diseaseCheckError } = await supabase
      .from('diseases')
      .select('id')
      .eq('barangay_id', barangayId)
      .limit(1);

    if (diseaseCheckError) {
      console.error('Error checking diseases:', diseaseCheckError);
      return NextResponse.json(
        { error: 'Failed to verify barangay references' },
        { status: 500 }
      );
    }

    if (diseases && diseases.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete barangay',
          message: 'This barangay has associated disease records. Please remove all disease records before deleting.',
        },
        { status: 409 }
      );
    }

    // Delete barangay
    const { error: deleteError } = await supabase
      .from('barangays')
      .delete()
      .eq('id', barangayId);

    if (deleteError) {
      console.error('Error deleting barangay:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete barangay' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Barangay "${existingBarangay.name}" deleted successfully`,
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/barangays/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
