import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createBarangaySchema, type CreateBarangayData } from '@/types/barangay';

/**
 * GET /api/admin/barangays
 *
 * Fetches all barangays with full details and optional statistics.
 * Accessible by Super Admin only.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Super Admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can access this resource' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const includeStats = searchParams.get('include_stats') === 'true';

    // Fetch all barangays with full details
    let query = supabase
      .from('barangays')
      .select('*')
      .order('name', { ascending: true });

    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data: barangays, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching barangays:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch barangays' },
        { status: 500 }
      );
    }

    // If stats requested, fetch patient counts per barangay
    let barangaysWithStats = barangays;
    if (includeStats && barangays) {
      // Use admin client to bypass RLS policies for counting patients
      const supabaseAdmin = createAdminClient();
      const { data: patientCounts, error: statsError } = await supabaseAdmin
        .from('profiles')
        .select('barangay_id')
        .eq('role', 'patient');

      if (!statsError && patientCounts) {
        const countMap = patientCounts.reduce((acc: Record<number, number>, { barangay_id }) => {
          if (barangay_id) {
            acc[barangay_id] = (acc[barangay_id] || 0) + 1;
          }
          return acc;
        }, {});

        barangaysWithStats = barangays.map(barangay => ({
          ...barangay,
          patient_count: countMap[barangay.id] || 0,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data: barangaysWithStats || [],
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/barangays:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/barangays
 *
 * Creates a new barangay.
 * Accessible by Super Admin only.
 */
export async function POST(request: Request) {
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can create barangays' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createBarangaySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const data: CreateBarangayData = validationResult.data;

    // Check for duplicate name
    const { data: existingName, error: nameCheckError } = await supabase
      .from('barangays')
      .select('id')
      .ilike('name', data.name)
      .single();

    if (existingName) {
      return NextResponse.json(
        { error: 'A barangay with this name already exists' },
        { status: 409 }
      );
    }

    // Check for duplicate code
    const { data: existingCode, error: codeCheckError } = await supabase
      .from('barangays')
      .select('id')
      .ilike('code', data.code)
      .single();

    if (existingCode) {
      return NextResponse.json(
        { error: 'A barangay with this code already exists' },
        { status: 409 }
      );
    }

    // Insert new barangay
    const { data: newBarangay, error: insertError } = await supabase
      .from('barangays')
      .insert([data])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating barangay:', insertError);
      return NextResponse.json(
        { error: 'Failed to create barangay' },
        { status: 500 }
      );
    }

    // Revalidate the barangays page cache
    revalidatePath('/admin/barangays');

    return NextResponse.json(
      {
        success: true,
        message: 'Barangay created successfully',
        data: newBarangay,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Unexpected error in POST /api/admin/barangays:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
