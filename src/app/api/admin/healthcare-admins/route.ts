import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/healthcare-admins
 *
 * Fetches all Healthcare Admins with their assigned services.
 * Accessible by Super Admin only.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can access this resource' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const serviceId = searchParams.get('service_id');
    const statusFilter = searchParams.get('status');

    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        contact_number,
        role,
        status,
        assigned_service_id,
        created_at,
        services:assigned_service_id (
          id,
          name,
          category
        )
      `)
      .eq('role', 'healthcare_admin')
      .order('created_at', { ascending: false });

    if (serviceId) {
      query = query.eq('assigned_service_id', parseInt(serviceId));
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    const { data: healthcareAdmins, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching Healthcare Admins:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch Healthcare Admins' }, { status: 500 });
    }

    const transformedData = (healthcareAdmins || []).map((admin: any) => ({
      id: admin.id,
      email: admin.email,
      first_name: admin.first_name,
      last_name: admin.last_name,
      contact_number: admin.contact_number,
      role: admin.role,
      status: admin.status,
      assigned_service: admin.services ? {
        id: admin.services.id,
        name: admin.services.name,
        category: admin.services.category,
      } : null,
      created_at: admin.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/healthcare-admins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
