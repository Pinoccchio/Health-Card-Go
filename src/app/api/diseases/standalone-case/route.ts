import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/diseases/standalone-case
 * Create a disease case for someone without a patient account (Staff and Super Admin only)
 * Stores basic patient info in anonymous_patient_data JSONB field
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

    // Only Staff and Super Admin can create disease cases
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can create disease cases' },
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
      anonymous_patient_data,
    } = body;

    // Validate required fields
    if (!disease_type || !diagnosis_date || !severity || !status || !barangay_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: disease_type, diagnosis_date, severity, status, barangay_id' },
        { status: 400 }
      );
    }

    // Validate anonymous_patient_data is provided
    if (!anonymous_patient_data) {
      return NextResponse.json(
        { success: false, error: 'Anonymous patient data is required for standalone cases' },
        { status: 400 }
      );
    }

    // Validate anonymous_patient_data has required fields
    const { name, age, gender } = anonymous_patient_data;
    if (!name || !age || !gender) {
      return NextResponse.json(
        { success: false, error: 'Patient name, age, and gender are required' },
        { status: 400 }
      );
    }

    // Validate age is reasonable
    if (age < 0 || age > 150) {
      return NextResponse.json(
        { success: false, error: 'Patient age must be between 0 and 150' },
        { status: 400 }
      );
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

    // Create disease case with anonymous patient data
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
        patient_id: null, // No patient account
        anonymous_patient_data: {
          name: name.trim(),
          age: parseInt(age),
          gender,
          contact: anonymous_patient_data.contact?.trim() || null,
          address: anonymous_patient_data.address?.trim() || null,
          barangay_id: parseInt(barangay_id),
        },
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating standalone disease case:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create disease case', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: disease,
      message: 'Disease case recorded successfully',
    });

  } catch (error: any) {
    console.error('Error in POST standalone disease case API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
