import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { parseRequirements } from '@/types/service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/services/[id]
 * Get a single service by ID
 * Super Admin only
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
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

    // Only Super Admin can access
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Fetch service
    const { data: service, error: fetchError } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: service,
    });

  } catch (error) {
    console.error('Service fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/services/[id]
 * Update a service
 * Super Admin only
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
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

    // Only Super Admin can update services
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Check if service exists
    const { data: existingService, error: checkError } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingService) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, category, description, duration_minutes, requires_appointment, is_active, requirements } = body;

    // Validation
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return NextResponse.json(
          { success: false, error: 'Service name cannot be empty' },
          { status: 400 }
        );
      }

      // Check for duplicate name (excluding current service)
      const { data: duplicate, error: dupError } = await supabase
        .from('services')
        .select('id')
        .ilike('name', name.trim())
        .neq('id', id)
        .single();

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: 'A service with this name already exists' },
          { status: 409 }
        );
      }
    }

    if (category !== undefined) {
      const validCategories = ['healthcard', 'hiv', 'pregnancy', 'laboratory', 'immunization', 'general'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    if (duration_minutes !== undefined) {
      if (duration_minutes < 5 || duration_minutes > 240) {
        return NextResponse.json(
          { success: false, error: 'Duration must be between 5 and 240 minutes' },
          { status: 400 }
        );
      }
    }

    // Build update object (only include provided fields)
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description?.trim() || '';
    if (duration_minutes !== undefined) updates.duration_minutes = parseInt(duration_minutes);
    if (requires_appointment !== undefined) updates.requires_appointment = requires_appointment;
    if (is_active !== undefined) updates.is_active = is_active;
    if (requirements !== undefined) {
      // Parse requirements from comma-separated string to array
      updates.requirements = requirements ? parseRequirements(requirements) : [];
    }

    // Update service
    const { data: updatedService, error: updateError } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating service:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update service' },
        { status: 500 }
      );
    }

    // Revalidate the services page cache
    revalidatePath('/admin/services');

    return NextResponse.json({
      success: true,
      data: updatedService,
      message: 'Service updated successfully',
    });

  } catch (error) {
    console.error('Service update error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/services/[id]
 * Delete a service
 * Super Admin only
 *
 * Prevents deletion if:
 * - Healthcare admins are assigned to this service
 * - Appointments exist for this service
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
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

    // Only Super Admin can delete services
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    // Check if service exists
    const { data: service, error: checkError } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !service) {
      return NextResponse.json(
        { success: false, error: 'Service not found' },
        { status: 404 }
      );
    }

    // Check if any healthcare admins are assigned to this service
    const { data: assignedAdmins, error: adminsError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('assigned_service_id', id)
      .eq('role', 'healthcare_admin');

    if (adminsError) {
      console.error('Error checking assigned admins:', adminsError);
      return NextResponse.json(
        { success: false, error: 'Failed to check service dependencies' },
        { status: 500 }
      );
    }

    if (assignedAdmins && assignedAdmins.length > 0) {
      const adminNames = assignedAdmins.map(a => `${a.first_name} ${a.last_name} (${a.email})`).join(', ');
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete service. ${assignedAdmins.length} healthcare admin(s) are assigned to this service: ${adminNames}`,
          assigned_admins: assignedAdmins,
        },
        { status: 409 }
      );
    }

    // Check if any appointments exist for this service
    const { count: appointmentCount, error: appointmentError } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', id);

    if (appointmentError) {
      console.error('Error checking appointments:', appointmentError);
      return NextResponse.json(
        { success: false, error: 'Failed to check service dependencies' },
        { status: 500 }
      );
    }

    if (appointmentCount && appointmentCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete service. ${appointmentCount} appointment(s) exist for this service. Consider deactivating instead.`,
          appointment_count: appointmentCount,
        },
        { status: 409 }
      );
    }

    // Safe to delete - no dependencies
    const { error: deleteError } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting service:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete service' },
        { status: 500 }
      );
    }

    // Revalidate the services page cache
    revalidatePath('/admin/services');

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully',
    });

  } catch (error) {
    console.error('Service deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
