import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/services
 * Get all available services with localization support
 *
 * Query params:
 * - requires_appointment: filter by appointment requirement (true/false)
 * - category: filter by category
 * - is_active: filter by active status (default: true)
 * - locale: language code (en, fil, ceb) - default: en
 */
export async function GET(request: NextRequest) {
  try {
    // Use admin client to bypass RLS for public healthcare admin data
    const supabase = await createAdminClient();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const requiresAppointment = searchParams.get('requires_appointment');
    const category = searchParams.get('category');
    const isActive = searchParams.get('is_active') !== 'false'; // Default to true
    const locale = searchParams.get('locale') || 'en'; // Default to English

    // Use the database function to get localized services
    let query = supabase
      .rpc('get_all_localized_services', { p_locale: locale });

    const { data: services, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching services:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      );
    }

    // Apply client-side filters (function returns all active services)
    let filteredServices = services || [];

    if (requiresAppointment !== null) {
      filteredServices = filteredServices.filter(s =>
        s.requires_appointment === (requiresAppointment === 'true')
      );
    }

    if (category) {
      filteredServices = filteredServices.filter(s => s.category === category);
    }

    // Fetch assigned healthcare admins for all services
    const { data: healthcareAdmins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, assigned_service_id, status')
      .eq('role', 'healthcare_admin')
      .eq('status', 'active')
      .order('first_name', { ascending: true });

    if (adminsError) {
      console.error('Error fetching healthcare admins:', adminsError);
    }

    // Map admins to their assigned services
    const servicesWithAdmins = filteredServices.map(service => {
      const assignedAdmins = healthcareAdmins?.filter(
        admin => admin.assigned_service_id === service.id
      ) || [];

      return {
        ...service,
        assigned_admins: assignedAdmins.map(admin => ({
          id: admin.id,
          first_name: admin.first_name,
          last_name: admin.last_name,
        })),
        admin_count: assignedAdmins.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: servicesWithAdmins,
    });

  } catch (error) {
    console.error('Services fetch error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
