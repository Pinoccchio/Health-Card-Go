import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { parseRequirements } from '@/types/service';

/**
 * GET /api/admin/services
 * Get all services (including inactive ones)
 * Super Admin only
 *
 * Query params:
 * - category: filter by category
 * - is_active: filter by active status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only Super Admin can access this endpoint
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('is_active');

    // Build query
    let query = supabase
      .from('services')
      .select('*')
      .order('id', { ascending: true });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: services, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching services:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch services' },
        { status: 500 }
      );
    }

    // Fetch all healthcare admins with their assigned services
    const { data: healthcareAdmins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, assigned_service_id, status')
      .eq('role', 'healthcare_admin')
      .order('first_name', { ascending: true });

    if (adminsError) {
      console.error('Error fetching healthcare admins:', adminsError);
    }

    // Map admins to their assigned services
    const servicesWithAdmins = services?.map(service => {
      const assignedAdmins = healthcareAdmins?.filter(
        admin => admin.assigned_service_id === service.id
      ) || [];

      return {
        ...service,
        assigned_admins: assignedAdmins.map(admin => ({
          id: admin.id,
          name: `${admin.first_name} ${admin.last_name}`,
          status: admin.status,
        })),
        admin_count: assignedAdmins.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: servicesWithAdmins || [],
    });

  } catch (error) {
    console.error('Admin services fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/services
 * Create a new service
 * Super Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Only Super Admin can create services
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, category, description, duration_minutes, requires_appointment, requires_medical_record, is_active, requirements } = body;

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Service name is required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Service category is required' },
        { status: 400 }
      );
    }

    const validCategories = ['healthcard', 'hiv', 'pregnancy', 'laboratory', 'immunization', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    if (!duration_minutes || duration_minutes < 5 || duration_minutes > 240) {
      return NextResponse.json(
        { success: false, error: 'Duration must be between 5 and 240 minutes' },
        { status: 400 }
      );
    }

    // Check for duplicate service name
    const { data: existing, error: checkError } = await supabase
      .from('services')
      .select('id')
      .ilike('name', name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A service with this name already exists' },
        { status: 409 }
      );
    }

    // Parse requirements from comma-separated string to array
    const requirementsArray = requirements ? parseRequirements(requirements) : [];

    // Create service
    const { data: newService, error: insertError } = await supabase
      .from('services')
      .insert({
        name: name.trim(),
        category,
        description: description?.trim() || '',
        duration_minutes: parseInt(duration_minutes),
        requires_appointment: requires_appointment !== false, // Default true
        requires_medical_record: requires_medical_record !== false, // Default true
        is_active: is_active !== false, // Default true
        requirements: requirementsArray, // JSONB array
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating service:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newService,
      message: 'Service created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Service creation error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
