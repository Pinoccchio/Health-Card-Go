import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateHistoricalRecord } from '@/lib/utils/excelParser';
import { calculateSeverity } from '@/lib/utils/severityCalculator';

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

    console.log(`\n📥 Disease Data Import Request`);
    console.log(`   User: ${profile.role} (${user.email})`);
    console.log(`   Records to import: ${records?.length || 0}`);

    if (!records || !Array.isArray(records)) {
      console.error(`❌ Invalid request body - records is not an array`);
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected { records: Array }' },
        { status: 400 }
      );
    }

    if (records.length === 0) {
      console.error(`❌ No records provided in request`);
      return NextResponse.json(
        { success: false, error: 'No records provided' },
        { status: 400 }
      );
    }

    if (records.length > 1000) {
      console.error(`❌ Too many records: ${records.length} (max 1000)`);
      return NextResponse.json(
        { success: false, error: 'Too many records. Maximum 1000 records per import.' },
        { status: 400 }
      );
    }

    // Fetch barangays for validation and severity calculation
    console.log(`🔍 Fetching barangays for validation and severity calculation...`);
    const { data: barangays, error: barangaysError } = await supabase
      .from('barangays')
      .select('id, name, code, population');

    if (barangaysError || !barangays) {
      console.error('❌ Error fetching barangays:', barangaysError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch barangays for validation' },
        { status: 500 }
      );
    }

    console.log(`✅ Fetched ${barangays.length} barangays for validation`);

    // Validate each record
    console.log(`🔄 Validating ${records.length} records...`);
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
        // Find barangay population for severity calculation
        const barangay = barangays.find(b => b.id === record.barangay_id);

        // Auto-calculate severity based on case count and population
        // Formula: (Number of cases / Population) × 100
        // High risk (critical): ≥70%, Medium risk (severe): 50-69%, Low risk (moderate): <50%
        const calculatedSeverity = calculateSeverity(
          record.case_count,
          barangay?.population || null
        );

        // Prepare record for insertion
        validRecords.push({
          record_date: record.record_date,
          disease_type: record.disease_type,
          custom_disease_name: record.custom_disease_name || null,
          case_count: record.case_count,
          severity: calculatedSeverity, // Auto-calculated from case count and population
          barangay_id: record.barangay_id,
          source: record.source || 'Excel Import',
          notes: record.notes || null,
          created_by_id: user.id,
          created_at: new Date().toISOString(),
        });
      }
    }

    console.log(`\n📊 Validation Summary:`);
    console.log(`   Valid Records: ${validRecords.length}`);
    console.log(`   Invalid Records: ${errors.length}`);

    // If there are validation errors, return them
    if (errors.length > 0 && validRecords.length === 0) {
      console.error(`❌ All records failed validation`);
      errors.slice(0, 5).forEach(err => {
        console.error(`   Row ${err.row}:`, err.errors.map(e => e.message).join(', '));
      });
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
    console.log(`\n💾 Inserting ${validRecords.length} valid records into database...`);
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
      console.log(`✅ Successfully inserted ${insertedCount} records`);
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`   Total Records: ${records.length}`);
    console.log(`   Imported: ${insertedCount}`);
    console.log(`   Failed: ${errors.length}`);

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
