import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateHealthcardHistoricalRecord } from '@/lib/utils/healthcardExcelParser';
import { getBarangayId, type Barangay } from '@/lib/utils/barangayMatcher';

/**
 * POST /api/healthcards/historical/import
 * Batch import historical healthcard statistics from Excel
 * (HealthCard Admin, Pink Card Admin, and Super Admin only)
 *
 * Authorization:
 * - Super Admin: Can import any healthcard data
 * - Healthcare Admin with admin_category='healthcard' or 'pink_card': Can import healthcard data
 * - All other roles: Forbidden
 *
 * Request body: { records: Array<HealthcardHistoricalRecord> }
 * Response: { success: boolean, data: { imported_count, failed_count, errors } }
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
    // Get user profile and check role + admin_category
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, admin_category')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Authorization: Only HealthCard/Pink Card Admins and Super Admins can import healthcard statistics
    // Super Admins have unrestricted access
    // Healthcare Admins must have admin_category = 'healthcard' or 'pink_card'
    if (profile.role === 'super_admin') {
      // Super Admins can import any healthcard data
    } else if (profile.role === 'healthcare_admin') {
      if (!['healthcard', 'pink_card'].includes(profile.admin_category!)) {
        return NextResponse.json(
          {
            success: false,
            error: `Forbidden: Only HealthCard and Pink Card admins can import historical data. Your category is '${profile.admin_category}'.`
          },
          { status: 403 }
        );
      }
    } else {
      // All other roles (staff, patient, etc.) are forbidden
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only HealthCard admins and Super Admins can import HealthCard statistics' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected { records: Array }' },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No records provided' },
        { status: 400 }
      );
    }

    if (records.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Too many records. Maximum 1000 records per import.' },
        { status: 400 }
      );
    }

    // Fetch barangays for validation
    const { data: barangays, error: barangaysError } = await supabase
      .from('barangays')
      .select('id, name, code');

    if (barangaysError || !barangays) {
      console.error('Error fetching barangays:', barangaysError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch barangays for validation' },
        { status: 500 }
      );
    }

    const barangayList: Barangay[] = barangays;

    // Validate each record
    const validRecords = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 1;

      // Validate record using fuzzy matcher
      const validationErrors = validateHealthcardHistoricalRecord(record, barangayList);

      if (validationErrors.length > 0) {
        errors.push({
          row: rowNum,
          errors: validationErrors,
        });
      } else {
        // Find barangay ID using fuzzy matcher
        const barangayId = getBarangayId(record.barangay, barangayList);

        // Prepare record for insertion
        validRecords.push({
          healthcard_type: record.healthcard_type,
          barangay_id: barangayId,
          record_date: record.record_date,
          cards_issued: Number(record.cards_issued),
          source: record.source || null,
          notes: record.notes || null,
          created_by_id: profile.id,
        });
      }
    }

    // Insert valid records (batch insert for performance)
    if (validRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('healthcard_statistics')
        .insert(validRecords);

      if (insertError) {
        console.error('Insert error:', insertError);

        // Handle specific database errors
        if (insertError.code === '23505') {
          // Duplicate key violation
          return NextResponse.json(
            {
              success: false,
              error: 'Duplicate record detected. Some records may already exist in the database.',
              details: insertError.message,
            },
            { status: 409 }
          );
        } else if (insertError.code === '23503') {
          // Foreign key violation
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid reference detected (barangay or user not found)',
              details: insertError.message,
            },
            { status: 400 }
          );
        } else {
          // Generic insert error
          return NextResponse.json(
            {
              success: false,
              error: 'Database insert failed',
              details: insertError.message,
            },
            { status: 500 }
          );
        }
      }
    }

    // Return success response with summary
    return NextResponse.json({
      success: true,
      data: {
        imported_count: validRecords.length,
        failed_count: errors.length,
        errors: errors.slice(0, 20), // Return first 20 errors for display
        total_errors: errors.length, // Total error count
      },
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
