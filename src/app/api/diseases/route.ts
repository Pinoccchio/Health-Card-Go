import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/diseases
 * Fetch disease records with optional filtering
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const diseaseType = searchParams.get('type');
    const barangayId = searchParams.get('barangay_id');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = supabase
      .from('diseases')
      .select(`
        *,
        barangays(id, name),
        patients(id, patient_number, user_id, profiles(first_name, last_name))
      `)
      .order('diagnosis_date', { ascending: false });

    // Apply filters
    if (diseaseType) {
      query = query.eq('disease_type', diseaseType);
    }
    if (barangayId) {
      query = query.eq('barangay_id', parseInt(barangayId));
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('diagnosis_date', startDate);
    }
    if (endDate) {
      query = query.lte('diagnosis_date', endDate);
    }

    const { data: diseases, error } = await query;

    if (error) {
      console.error('Error fetching diseases:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch diseases' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: diseases,
      count: diseases?.length || 0,
    });

  } catch (error: any) {
    console.error('Error in diseases API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/diseases
 * Create a new disease record (Staff and Super Admin only)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get user profile and check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only Staff and Super Admin can create disease records
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can create disease records' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const {
      disease_type,
      custom_disease_name,
      diagnosis_date,
      severity,
      status,
      barangay_id,
      notes,
      patient_id,
      anonymous_patient_data
    } = body;

    // Validate required fields
    if (!disease_type || !diagnosis_date || !severity || !status || !barangay_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate that either patient_id OR anonymous_patient_data is provided
    if (!patient_id && !anonymous_patient_data) {
      return NextResponse.json(
        { success: false, error: 'Either patient_id or anonymous patient data is required' },
        { status: 400 }
      );
    }

    // Validate anonymous_patient_data when provided
    if (anonymous_patient_data && !patient_id) {
      const { name, age, gender } = anonymous_patient_data;
      if (!name || !age || !gender) {
        return NextResponse.json(
          { success: false, error: 'Anonymous patient data must include name, age, and gender' },
          { status: 400 }
        );
      }
      if (age < 0 || age > 150) {
        return NextResponse.json(
          { success: false, error: 'Patient age must be between 0 and 150' },
          { status: 400 }
        );
      }
    }

    // Validate custom_disease_name is provided when disease_type is 'other'
    if (disease_type === 'other') {
      if (!custom_disease_name || custom_disease_name.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Custom disease name is required when disease type is "Other"' },
          { status: 400 }
        );
      }
    } else {
      // Ensure custom_disease_name is null for non-other disease types
      if (custom_disease_name) {
        return NextResponse.json(
          { success: false, error: 'Custom disease name should only be provided when disease type is "Other"' },
          { status: 400 }
        );
      }
    }

    // Create disease record
    const { data: disease, error: createError } = await supabase
      .from('diseases')
      .insert({
        disease_type,
        custom_disease_name: disease_type === 'other' ? custom_disease_name.trim() : null,
        diagnosis_date,
        severity,
        status,
        barangay_id: parseInt(barangay_id),
        notes: notes || null,
        patient_id: patient_id || null,
        anonymous_patient_data: anonymous_patient_data ? {
          name: anonymous_patient_data.name.trim(),
          age: parseInt(anonymous_patient_data.age),
          gender: anonymous_patient_data.gender,
          barangay_id: parseInt(barangay_id),
        } : null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating disease record:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create disease record', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: disease,
      message: 'Disease record created successfully',
    });

  } catch (error: any) {
    console.error('Error in POST diseases API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
