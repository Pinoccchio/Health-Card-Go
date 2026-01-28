import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Validation schemas
const populationHistoryCreateSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  population: z.number().int().min(0),
  source: z.enum(['PSA Census', 'Local Survey', 'Estimate', 'Other']).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

const populationHistoryUpdateSchema = z.object({
  year: z.number().int().min(1900).max(2100).optional(),
  population: z.number().int().min(0).optional(),
  source: z.enum(['PSA Census', 'Local Survey', 'Estimate', 'Other']).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

/**
 * Helper function to verify Super Admin access
 */
async function verifySuperAdmin(supabase: any, userId: string) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return !error && profile?.role === 'super_admin';
}

/**
 * GET /api/admin/barangays/[id]/population
 *
 * Fetches all population history records for a specific barangay.
 * Accessible by Super Admin, Healthcare Admin, and Staff.
 */
export async function GET(
  request: NextRequest,
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

    // Parse barangay ID
    const barangayId = parseInt(id);
    if (isNaN(barangayId)) {
      return NextResponse.json(
        { error: 'Invalid barangay ID' },
        { status: 400 }
      );
    }

    // Check if barangay exists
    const { data: barangay, error: barangayError } = await supabase
      .from('barangays')
      .select('id, name')
      .eq('id', barangayId)
      .single();

    if (barangayError || !barangay) {
      return NextResponse.json(
        { error: 'Barangay not found' },
        { status: 404 }
      );
    }

    // Fetch population history ordered by year descending
    const { data: history, error: historyError } = await supabase
      .from('barangay_population_history')
      .select(`
        id,
        barangay_id,
        year,
        population,
        source,
        notes,
        created_by_id,
        created_at,
        updated_at
      `)
      .eq('barangay_id', barangayId)
      .order('year', { ascending: false });

    if (historyError) {
      console.error('Error fetching population history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch population history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        barangay,
        history: history || [],
      },
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/barangays/[id]/population:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/barangays/[id]/population
 *
 * Creates a new population history record for a barangay.
 * Accessible by Super Admin only.
 */
export async function POST(
  request: NextRequest,
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

    // Verify Super Admin role
    const isSuperAdmin = await verifySuperAdmin(supabase, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can add population records' },
        { status: 403 }
      );
    }

    // Await params to get id
    const { id } = await params;

    // Parse barangay ID
    const barangayId = parseInt(id);
    if (isNaN(barangayId)) {
      return NextResponse.json(
        { error: 'Invalid barangay ID' },
        { status: 400 }
      );
    }

    // Check if barangay exists
    const { data: barangay, error: barangayError } = await supabase
      .from('barangays')
      .select('id, name')
      .eq('id', barangayId)
      .single();

    if (barangayError || !barangay) {
      return NextResponse.json(
        { error: 'Barangay not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = populationHistoryCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { year, population, source, notes } = validationResult.data;

    // Check for duplicate year
    const { data: existingRecord, error: checkError } = await supabase
      .from('barangay_population_history')
      .select('id')
      .eq('barangay_id', barangayId)
      .eq('year', year)
      .single();

    if (existingRecord) {
      return NextResponse.json(
        { error: `A population record for year ${year} already exists for this barangay` },
        { status: 409 }
      );
    }

    // Create population record
    const { data: newRecord, error: insertError } = await supabase
      .from('barangay_population_history')
      .insert([{
        barangay_id: barangayId,
        year,
        population,
        source: source || null,
        notes: notes || null,
        created_by_id: user.id,
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating population record:', insertError);
      return NextResponse.json(
        { error: 'Failed to create population record' },
        { status: 500 }
      );
    }

    // Optionally update the barangays.population field if this is the most recent year
    // Get the most recent year in history
    const { data: latestRecord } = await supabase
      .from('barangay_population_history')
      .select('year, population')
      .eq('barangay_id', barangayId)
      .order('year', { ascending: false })
      .limit(1)
      .single();

    if (latestRecord && latestRecord.year === year) {
      // Update the main barangays table with latest population
      await supabase
        .from('barangays')
        .update({ population })
        .eq('id', barangayId);
    }

    revalidatePath('/admin/barangays');

    return NextResponse.json(
      {
        success: true,
        message: `Population record for ${year} created successfully`,
        data: newRecord,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/barangays/[id]/population:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/barangays/[id]/population
 *
 * Updates an existing population history record.
 * Requires record_id in query params.
 * Accessible by Super Admin only.
 */
export async function PUT(
  request: NextRequest,
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

    // Verify Super Admin role
    const isSuperAdmin = await verifySuperAdmin(supabase, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can update population records' },
        { status: 403 }
      );
    }

    // Await params to get id
    const { id } = await params;

    // Parse barangay ID
    const barangayId = parseInt(id);
    if (isNaN(barangayId)) {
      return NextResponse.json(
        { error: 'Invalid barangay ID' },
        { status: 400 }
      );
    }

    // Get record_id from query params
    const recordId = request.nextUrl.searchParams.get('record_id');
    if (!recordId) {
      return NextResponse.json(
        { error: 'record_id query parameter is required' },
        { status: 400 }
      );
    }

    // Check if record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('barangay_population_history')
      .select('*')
      .eq('id', recordId)
      .eq('barangay_id', barangayId)
      .single();

    if (checkError || !existingRecord) {
      return NextResponse.json(
        { error: 'Population record not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = populationHistoryUpdateSchema.safeParse(body);

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

    // If year is being changed, check for duplicates
    if (updateData.year && updateData.year !== existingRecord.year) {
      const { data: duplicateRecord } = await supabase
        .from('barangay_population_history')
        .select('id')
        .eq('barangay_id', barangayId)
        .eq('year', updateData.year)
        .neq('id', recordId)
        .single();

      if (duplicateRecord) {
        return NextResponse.json(
          { error: `A population record for year ${updateData.year} already exists` },
          { status: 409 }
        );
      }
    }

    // Update record
    const { data: updatedRecord, error: updateError } = await supabase
      .from('barangay_population_history')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating population record:', updateError);
      return NextResponse.json(
        { error: 'Failed to update population record' },
        { status: 500 }
      );
    }

    // Update barangays.population if this is now the most recent record
    const { data: latestRecord } = await supabase
      .from('barangay_population_history')
      .select('year, population')
      .eq('barangay_id', barangayId)
      .order('year', { ascending: false })
      .limit(1)
      .single();

    if (latestRecord && latestRecord.year === updatedRecord.year) {
      await supabase
        .from('barangays')
        .update({ population: updatedRecord.population })
        .eq('id', barangayId);
    }

    revalidatePath('/admin/barangays');

    return NextResponse.json({
      success: true,
      message: 'Population record updated successfully',
      data: updatedRecord,
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/barangays/[id]/population:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/barangays/[id]/population
 *
 * Deletes a population history record.
 * Requires record_id in query params.
 * Accessible by Super Admin only.
 */
export async function DELETE(
  request: NextRequest,
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

    // Verify Super Admin role
    const isSuperAdmin = await verifySuperAdmin(supabase, user.id);
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can delete population records' },
        { status: 403 }
      );
    }

    // Await params to get id
    const { id } = await params;

    // Parse barangay ID
    const barangayId = parseInt(id);
    if (isNaN(barangayId)) {
      return NextResponse.json(
        { error: 'Invalid barangay ID' },
        { status: 400 }
      );
    }

    // Get record_id from query params
    const recordId = request.nextUrl.searchParams.get('record_id');
    if (!recordId) {
      return NextResponse.json(
        { error: 'record_id query parameter is required' },
        { status: 400 }
      );
    }

    // Check if record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('barangay_population_history')
      .select('id, year')
      .eq('id', recordId)
      .eq('barangay_id', barangayId)
      .single();

    if (checkError || !existingRecord) {
      return NextResponse.json(
        { error: 'Population record not found' },
        { status: 404 }
      );
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('barangay_population_history')
      .delete()
      .eq('id', recordId);

    if (deleteError) {
      console.error('Error deleting population record:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete population record' },
        { status: 500 }
      );
    }

    // Update barangays.population to the next most recent year if available
    const { data: latestRecord } = await supabase
      .from('barangay_population_history')
      .select('population')
      .eq('barangay_id', barangayId)
      .order('year', { ascending: false })
      .limit(1)
      .single();

    if (latestRecord) {
      await supabase
        .from('barangays')
        .update({ population: latestRecord.population })
        .eq('id', barangayId);
    }

    revalidatePath('/admin/barangays');

    return NextResponse.json({
      success: true,
      message: `Population record for year ${existingRecord.year} deleted successfully`,
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/barangays/[id]/population:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
