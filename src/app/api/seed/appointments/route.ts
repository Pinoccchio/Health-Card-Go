import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { seedAppointments } from '@/scripts/seed-appointments';

/**
 * POST /api/seed/appointments
 *
 * Seeds 24 months of realistic appointment data (Jan 2023 - Dec 2024)
 *
 * Authorization: Super Admin only
 *
 * Generates:
 * - ~1,200 HealthCard appointments (services 12-15)
 * - ~480 HIV appointments (service 16)
 * - ~600 Pregnancy appointments (service 17)
 * - Total: ~2,300 appointments with realistic status distribution
 *
 * Status Distribution:
 * - HealthCard: 90% completed, 5% cancelled, 5% no_show
 * - HIV: 85% completed, 8% cancelled, 7% no_show
 * - Pregnancy: 88% completed, 7% cancelled, 5% no_show
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is Super Admin
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

    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Super Admins can seed appointment data' },
        { status: 403 }
      );
    }

    // Check if appointments already exist
    const { count, error: countError } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json(
        { success: false, error: 'Failed to check existing appointments' },
        { status: 500 }
      );
    }

    if (count && count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Database already contains ${count} appointments. Delete existing data first or use force=true parameter.`,
        },
        { status: 400 }
      );
    }

    // Execute seeding
    console.log('🌱 Starting appointment seeding via API...');
    await seedAppointments();

    // Get final count
    const { count: finalCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: 'Appointment seeding completed successfully',
      data: {
        total_appointments: finalCount,
        date_range: 'Jan 2023 - Dec 2024 (24 months)',
        categories: {
          healthcard: '~1,200 appointments (services 12-15)',
          hiv: '~480 appointments (service 16)',
          pregnancy: '~600 appointments (service 17)',
        },
      },
    });
  } catch (error: any) {
    console.error('❌ Seed appointments API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed appointments',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/seed/appointments
 *
 * Deletes ALL appointments from the database
 * Authorization: Super Admin only
 * Use with caution!
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is Super Admin
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

    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only Super Admins can delete appointment data' },
        { status: 403 }
      );
    }

    // Count before deletion
    const { count: beforeCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true });

    // Delete all appointments
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete appointments', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All appointments deleted successfully',
      data: {
        deleted_count: beforeCount || 0,
      },
    });
  } catch (error: any) {
    console.error('❌ Delete appointments API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete appointments',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
