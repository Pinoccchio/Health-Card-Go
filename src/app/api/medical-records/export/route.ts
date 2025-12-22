import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptData } from '@/lib/utils/encryption';

export async function GET(request: NextRequest) {
  try {
    console.log('📤 [EXPORT] Medical records export requested');

    // Get search params
    const searchParams = request.nextUrl.searchParams;
    const categoryFilter = searchParams.get('category');

    console.log('🔍 [EXPORT] Filters:', { category: categoryFilter || 'all' });

    // Create Supabase client
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ [EXPORT] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 [EXPORT] User authenticated:', user.id);

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, admin_category, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.log('❌ [EXPORT] Failed to get user profile');
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    console.log('👤 [EXPORT] User profile:', { role: profile.role, assigned_service_id: profile.assigned_service_id });

    // Create admin client for service-role operations
    const adminClient = await createClient(true);

    // Build query based on user role
    let query = adminClient
      .from('medical_records')
      .select(`
        id,
        patient_id,
        appointment_id,
        created_by_id,
        category,
        template_type,
        diagnosis,
        prescription,
        notes,
        record_data,
        is_encrypted,
        created_at,
        updated_at,
        patients (
          patient_number,
          profiles (
            first_name,
            last_name
          )
        ),
        created_by:profiles!medical_records_created_by_id_fkey (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    // Apply role-based filtering
    if (profile.role === 'super_admin') {
      console.log('👑 [EXPORT] Super admin - access to all records');
      // Super admin sees all records
    } else if (profile.role === 'healthcare_admin') {
      console.log('🏥 [EXPORT] Healthcare admin - filtering by service');

      if (!profile.assigned_service_id) {
        return NextResponse.json(
          { error: 'No service assigned to your account' },
          { status: 403 }
        );
      }

      // Get appointments for the admin's assigned service
      const { data: serviceAppointments } = await adminClient
        .from('appointments')
        .select('id')
        .eq('service_id', profile.assigned_service_id);

      console.log('📅 [EXPORT] Found appointments:', serviceAppointments?.length || 0);

      if (serviceAppointments && serviceAppointments.length > 0) {
        const appointmentIds = serviceAppointments.map((a) => a.id);
        query = query.in('appointment_id', appointmentIds);
      } else {
        // No appointments found - return empty export
        console.log('⚠️ [EXPORT] No appointments found for service - empty export');
        const csvContent = 'Patient Name,Patient Number,Category,Diagnosis,Prescription,Notes,Created Date,Created By\n';
        return new Response(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=medical-records-${new Date().toISOString().split('T')[0]}.csv`,
          },
        });
      }
    } else {
      console.log('❌ [EXPORT] Invalid role for export');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Apply category filter if provided
    if (categoryFilter && categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
      console.log('🏷️ [EXPORT] Filtering by category:', categoryFilter);
    }

    // Fetch records
    const { data: records, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ [EXPORT] Failed to fetch records:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch medical records' }, { status: 500 });
    }

    console.log('📊 [EXPORT] Fetched records:', records?.length || 0);

    // Decrypt encrypted records
    const processedRecords = await Promise.all(
      (records || []).map(async (record) => {
        if (record.is_encrypted && (record.category === 'hiv' || record.category === 'pregnancy')) {
          try {
            return {
              ...record,
              diagnosis: record.diagnosis ? await decryptData(record.diagnosis) : null,
              prescription: record.prescription ? await decryptData(record.prescription) : null,
              notes: record.notes ? await decryptData(record.notes) : null,
            };
          } catch (error) {
            console.error('❌ [EXPORT] Failed to decrypt record:', record.id, error);
            return record;
          }
        }
        return record;
      })
    );

    console.log('🔓 [EXPORT] Decrypted sensitive records');

    // Generate CSV content
    const csvRows: string[] = [];

    // CSV Header
    csvRows.push('Patient Name,Patient Number,Category,Diagnosis,Prescription,Notes,Created Date,Created By');

    // CSV Data Rows
    processedRecords.forEach((record) => {
      const patientName = record.patients?.profiles
        ? `${record.patients.profiles.first_name} ${record.patients.profiles.last_name}`
        : 'Unknown';
      const patientNumber = record.patients?.patient_number || 'N/A';
      const category = record.category || 'N/A';
      const diagnosis = escapeCsvField(record.diagnosis || '');
      const prescription = escapeCsvField(record.prescription || '');
      const notes = escapeCsvField(record.notes || '');
      const createdDate = new Date(record.created_at).toLocaleDateString('en-US');
      const createdBy = record.created_by
        ? `${record.created_by.first_name} ${record.created_by.last_name}`
        : 'Unknown';

      csvRows.push(
        `${escapeCsvField(patientName)},${escapeCsvField(patientNumber)},${escapeCsvField(category)},${diagnosis},${prescription},${notes},${escapeCsvField(createdDate)},${escapeCsvField(createdBy)}`
      );
    });

    const csvContent = csvRows.join('\n');

    console.log('✅ [EXPORT] CSV generated successfully - rows:', csvRows.length - 1);

    // Return CSV file
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=medical-records-${new Date().toISOString().split('T')[0]}.csv`,
      },
    });
  } catch (error) {
    console.error('❌ [EXPORT] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Escape CSV field to handle special characters
 */
function escapeCsvField(field: string): string {
  if (!field) return '';

  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }

  return field;
}
