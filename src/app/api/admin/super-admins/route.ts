import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/admin/super-admins
 *
 * Fetches all Super Admins.
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
        created_at,
        updated_at
      `)
      .eq('role', 'super_admin')
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
      );
    }

    const { data: superAdmins, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching Super Admins:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch Super Admins' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: superAdmins || [],
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admin/super-admins:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
