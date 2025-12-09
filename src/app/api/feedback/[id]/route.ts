import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/feedback/[id]
 * Super Admin responds to patient feedback
 *
 * Business Rules:
 * - Only super_admin can respond
 * - Response text required (max 1000 chars)
 * - Creates notification for patient
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Await params to get id
    const { id } = await params;
    const feedbackId = id;

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { admin_response } = body;

    // Validate response
    if (!admin_response || admin_response.trim().length === 0) {
      return NextResponse.json(
        { error: 'Admin response is required' },
        { status: 400 }
      );
    }

    if (admin_response.length > 1000) {
      return NextResponse.json(
        { error: 'Admin response must be 1000 characters or less' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only super_admin can respond to feedback
    if (profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only Super Admins can respond to feedback' },
        { status: 403 }
      );
    }

    // Verify feedback exists
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .select(`
        id,
        patient_id,
        patients!inner(
          user_id,
          profiles!inner(
            first_name,
            last_name
          )
        )
      `)
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Update feedback with admin response
    const { data: updatedFeedback, error: updateError } = await supabase
      .from('feedback')
      .update({
        admin_response: admin_response.trim(),
        responded_by: user.id,
        responded_at: new Date().toISOString(),
      })
      .eq('id', feedbackId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating feedback:', updateError);
      return NextResponse.json(
        { error: 'Failed to submit response' },
        { status: 500 }
      );
    }

    // Create notification for patient
    const patientUserId = (feedback.patients as any).user_id;
    const patientName = `${(feedback.patients as any).profiles.first_name} ${(feedback.patients as any).profiles.last_name}`;

    await supabase.from('notifications').insert({
      user_id: patientUserId,
      type: 'general',
      title: 'Feedback Response Received',
      message: 'An administrator has responded to your feedback. Click to view the response.',
      link: '/patient/feedback',
    });

    return NextResponse.json({
      success: true,
      data: updatedFeedback,
      message: `Response sent to ${patientName}`,
    });

  } catch (error) {
    console.error('Feedback response error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
