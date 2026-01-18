import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateHealthcardHistoricalRecord } from '@/lib/utils/healthcardExcelParser';

/**
 * POST /api/healthcards/historical/import
 * Batch import historical healthcard statistics from Excel
 * (Staff and Super Admin only)
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

    // Only Staff and Super Admin can import historical healthcard statistics
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can import healthcard statistics' },
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

    // Validate each record
    const validRecords = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 1;

      // Validate record
      const validationErrors = validateHealthcardHistoricalRecord(record, barangays);

      if (validationErrors.length > 0) {
        errors.push({
          row: rowNum,
          errors: validationErrors,
        });
      } else {
        // Find barangay ID if barangay name provided
        let barangayId = null;
        if (record.barangay && record.barangay.trim() !== '') {
          const barangay = barangays.find(
            (b) => b.name.toLowerCase() === record.barangay.toLowerCase().trim()
          );
          barangayId = barangay?.id || null;
        }

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
