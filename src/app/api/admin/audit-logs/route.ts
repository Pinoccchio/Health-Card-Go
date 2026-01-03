import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/audit-logs
 * Fetch all audit logs with user information
 * Only accessible by Super Admin (role: 'super_admin')
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Verify Super Admin role
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      );
    }

    // Fetch audit logs with user information
    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        changes,
        ip_address,
        user_agent,
        created_at,
        profiles!audit_logs_user_id_fkey (
          first_name,
          last_name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (logsError) {
      return NextResponse.json(
        { error: 'Failed to fetch audit logs', details: logsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: logs || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
