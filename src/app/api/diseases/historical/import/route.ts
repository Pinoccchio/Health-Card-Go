import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateHistoricalRecord } from '@/lib/utils/excelParser';

/**
 * POST /api/diseases/historical/import
 * Batch import historical disease statistics from Excel
 * (Staff and Super Admin only)
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

    // Only Staff and Super Admin can import historical disease statistics
    if (profile.role !== 'staff' && profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Staff and Super Admins can import historical disease statistics' },
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
      const validationErrors = validateHistoricalRecord(record, barangays);

      if (validationErrors.length > 0) {
        errors.push({
          row: rowNum,
          errors: validationErrors,
        });
      } else {
        // Prepare record for insertion
        validRecords.push({
          record_date: record.record_date,
          disease_type: record.disease_type,
          custom_disease_name: record.custom_disease_name || null,
          case_count: record.case_count,
          barangay_id: record.barangay_id,
          source: record.source || 'Excel Import',
          notes: record.notes || null,
          created_by_id: user.id,
          created_at: new Date().toISOString(),
        });
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0 && validRecords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'All records have validation errors',
          imported_count: 0,
          failed_count: records.length,
          errors,
        },
        { status: 400 }
      );
    }

    // Insert valid records in batch
    let insertedCount = 0;
    const insertErrors = [];

    if (validRecords.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('disease_statistics')
        .insert(validRecords)
        .select();

      if (insertError) {
        console.error('Error inserting disease statistics:', insertError);

        // Try to provide more specific error information
        if (insertError.code === '23505') {
          // Duplicate key violation
          insertErrors.push({
            row: 0,
            errors: [{
              row: 0,
              field: 'duplicate',
              message: 'One or more records already exist with the same date, disease type, and barangay',
            }],
          });
        } else if (insertError.code === '23503') {
          // Foreign key violation
          insertErrors.push({
            row: 0,
            errors: [{
              row: 0,
              field: 'foreign_key',
              message: 'Invalid foreign key reference (barangay_id or created_by_id)',
            }],
          });
        } else {
          insertErrors.push({
            row: 0,
            errors: [{
              row: 0,
              field: 'database',
              message: insertError.message || 'Database insertion failed',
            }],
          });
        }

        return NextResponse.json(
          {
            success: false,
            error: 'Failed to insert records',
            imported_count: 0,
            failed_count: validRecords.length,
            errors: insertErrors,
          },
          { status: 500 }
        );
      }

      insertedCount = inserted?.length || 0;
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedCount} record(s)`,
      imported_count: insertedCount,
      failed_count: errors.length,
      total_records: records.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred during import',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
