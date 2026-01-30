/**
 * Service Historical Import API Route
 * POST /api/services/historical/import
 *
 * Imports historical appointment data for services (HIV, Prenatal, Immunization)
 * Used for SARIMA prediction training data
 *
 * SIMPLIFIED (Jan 2025):
 * - Removed Status field (was misleading - all statuses were aggregated anyway)
 * - Now uses "appointments_completed" directly
 * - Matches healthcard import pattern
 *
 * Authorization:
 * - Super Admin: Can import any service data
 * - Healthcare Admin with admin_category='hiv': Can import service 16 (HIV) data only
 * - Healthcare Admin with admin_category='pregnancy': Can import service 17 (Pregnancy) data only
 * - Healthcare Admin with admin_category='child_immunization': Can import service 19 (Child Immunization) data only
 * - Healthcare Admin with admin_category='adult_vaccination': Can import service 20 (Adult Vaccination) data only
 * - All other roles: Forbidden
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ServiceAppointmentRecord {
  appointment_month: string; // YYYY-MM
  appointments_completed: number;
  barangay?: string;
  source?: string;
  notes?: string;
}

interface ImportRequest {
  records: ServiceAppointmentRecord[];
  service_id: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, admin_category, assigned_service_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse request body first to get service_id
    const body: ImportRequest = await request.json();
    const { records, service_id } = body;

    // Validate service_id
    if (!service_id || ![16, 17, 19, 20].includes(service_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid service_id. Must be 16 (HIV), 17 (Pregnancy), 19 (Child Immunization), or 20 (Adult Vaccination)' },
        { status: 400 }
      );
    }

    // Authorization based on admin_category
    // Super Admins can import any service data
    // Healthcare Admins must have matching admin_category
    const isSuperAdmin = profile.role === 'super_admin';
    const isHealthcareAdmin = profile.role === 'healthcare_admin';

    if (!isSuperAdmin && !isHealthcareAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only Healthcare Admins and Super Admins can import data.' },
        { status: 403 }
      );
    }

    // For Healthcare Admin, verify admin_category matches service
    if (isHealthcareAdmin && !isSuperAdmin) {
      const categoryMap: Record<number, string> = {
        16: 'hiv',
        17: 'pregnancy',
        19: 'child_immunization',
        20: 'adult_vaccination',
      };
      const serviceNameMap: Record<number, string> = {
        16: 'HIV',
        17: 'Pregnancy',
        19: 'Child Immunization',
        20: 'Adult Vaccination',
      };
      const requiredCategory = categoryMap[service_id];
      const serviceDisplayName = serviceNameMap[service_id];

      if (profile.admin_category !== requiredCategory) {
        return NextResponse.json(
          {
            success: false,
            error: `Forbidden: Only ${requiredCategory.toUpperCase()} admins can import ${serviceDisplayName} historical data. Your category is '${profile.admin_category}'.`
          },
          { status: 403 }
        );
      }
    }

    // Validate records array
    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Records array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (records.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Maximum 1000 records per import' },
        { status: 400 }
      );
    }

    // Fetch barangays for name-to-ID mapping
    const { data: barangays, error: barangaysError } = await supabase
      .from('barangays')
      .select('id, name');

    if (barangaysError) {
      console.error('Error fetching barangays:', barangaysError);
      return NextResponse.json(
        { success: false, error: 'Failed to load barangays for validation' },
        { status: 500 }
      );
    }

    // Map barangay names to IDs
    const barangayMap = new Map(
      barangays.map(b => [b.name.toLowerCase(), b.id])
    );

    // Process records: Convert monthly appointment data to database records
    // Group by month-barangay combination to aggregate multiple rows for same period
    const monthlyAggregates = new Map<string, {
      service_id: number;
      record_date: string;
      appointments_completed: number;
      barangay_id: number | null;
      source: string;
      notes: string | null;
    }>();

    records.forEach(record => {
      const barangayId = record.barangay
        ? barangayMap.get(record.barangay.toLowerCase()) || null
        : null;

      // Convert YYYY-MM to first day of month (YYYY-MM-01)
      const recordDate = `${record.appointment_month}-01`;

      // Create unique key for each month-barangay combination
      const key = `${recordDate}|${barangayId || 'null'}`;

      if (!monthlyAggregates.has(key)) {
        monthlyAggregates.set(key, {
          service_id,
          record_date: recordDate,
          appointments_completed: 0,
          barangay_id: barangayId,
          source: record.source || 'Excel Import',
          notes: record.notes || null,
        });
      }

      // Add completed appointment count
      monthlyAggregates.get(key)!.appointments_completed += record.appointments_completed;
    });

    // Convert to array for insertion
    const insertRecords = Array.from(monthlyAggregates.values()).map(record => ({
      ...record,
      created_by_id: user.id,
    }));

    console.log(`📊 [SERVICE IMPORT] Inserting ${insertRecords.length} aggregated monthly records for service ${service_id}`);

    // Insert into service_appointment_statistics table
    const { data: insertedData, error: insertError } = await supabase
      .from('service_appointment_statistics')
      .insert(insertRecords)
      .select();

    if (insertError) {
      console.error('❌ [SERVICE IMPORT] Insert error:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save appointment statistics',
          details: insertError.message
        },
        { status: 500 }
      );
    }

    console.log(`✅ [SERVICE IMPORT] Successfully inserted ${insertedData?.length || 0} records`);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${records.length} appointment records (${insertedData?.length} monthly aggregates saved)`,
      data: {
        imported_count: records.length,
        saved_aggregates: insertedData?.length || 0,
        service_id,
      },
    });

  } catch (error) {
    console.error('Service historical import error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import service appointment data'
      },
      { status: 500 }
    );
  }
}
