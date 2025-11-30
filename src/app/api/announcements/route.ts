import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/announcements
 * Fetch active announcements for a specific audience
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const targetAudience = searchParams.get('target_audience') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch announcements
    let query = supabase
      .from('announcements')
      .select(`
        *,
        profiles!announcements_created_by_fkey(first_name, last_name)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by target audience (all, patients, healthcare_admin, doctor)
    // Show announcements for 'all' OR the specific target audience
    if (targetAudience === 'patients') {
      query = query.or('target_audience.eq.all,target_audience.eq.patients');
    } else if (targetAudience === 'healthcare_admin') {
      query = query.or('target_audience.eq.all,target_audience.eq.healthcare_admin');
    } else if (targetAudience === 'doctor') {
      query = query.or('target_audience.eq.all,target_audience.eq.doctor');
    }
    // If targetAudience is 'all', don't add any filter (show everything)

    const { data: announcements, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: announcements || [],
      count: announcements?.length || 0,
    });

  } catch (error: any) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/announcements
 * Create a new announcement (Super Admin and Healthcare Admin)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Check if user is Super Admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'super_admin' && profile?.role !== 'healthcare_admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Super Admins and Healthcare Admins can create announcements' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, target_audience = 'all' } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'title and content are required' },
        { status: 400 }
      );
    }

    // Validate target_audience
    const validAudiences = ['all', 'patients', 'healthcare_admin', 'doctor'];
    if (!validAudiences.includes(target_audience)) {
      return NextResponse.json(
        { success: false, error: 'Invalid target_audience' },
        { status: 400 }
      );
    }

    // Create announcement
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        target_audience,
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully',
    });

  } catch (error: any) {
    console.error('Error creating announcement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
