import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/feedback
 * Submit patient feedback for a completed appointment
 *
 * Business Rules:
 * - Only for completed appointments
 * - Must be submitted within 7 days of completion
 * - One feedback per appointment (enforced by UNIQUE constraint)
 * - All ratings required (1-5)
 * - Comments required (max 500 chars)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const {
      appointment_id,
      rating,
      facility_rating,
      wait_time_rating,
      would_recommend,
      comments,
    } = body;

    // Validate required fields
    if (!appointment_id) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Validate all ratings are provided and in range
    const ratings = {
      'Overall rating': rating,
      'Facility rating': facility_rating,
      'Wait time rating': wait_time_rating,
    };

    for (const [name, value] of Object.entries(ratings)) {
      if (!value || value < 1 || value > 5) {
        return NextResponse.json(
          { error: `${name} must be between 1 and 5` },
          { status: 400 }
        );
      }
    }

    // Validate would_recommend is boolean
    if (typeof would_recommend !== 'boolean') {
      return NextResponse.json(
        { error: 'Would recommend must be true or false' },
        { status: 400 }
      );
    }

    // Validate comments
    if (!comments || comments.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comments are required' },
        { status: 400 }
      );
    }

    if (comments.length > 500) {
      return NextResponse.json(
        { error: 'Comments must be 500 characters or less' },
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

    // Only patients can submit feedback
    if (profile.role !== 'patient') {
      return NextResponse.json(
        { error: 'Only patients can submit feedback' },
        { status: 403 }
      );
    }

    // Get patient record
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
    }

    // Verify appointment exists and belongs to patient
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, patient_id, status, completed_at')
      .eq('id', appointment_id)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    // Verify appointment belongs to this patient
    if (appointment.patient_id !== patient.id) {
      return NextResponse.json(
        { error: 'You can only submit feedback for your own appointments' },
        { status: 403 }
      );
    }

    // Verify appointment is completed
    if (appointment.status !== 'completed') {
      return NextResponse.json(
        { error: 'Feedback can only be submitted for completed appointments' },
        { status: 400 }
      );
    }

    // Verify appointment was completed (has completed_at timestamp)
    if (!appointment.completed_at) {
      return NextResponse.json(
        { error: 'This appointment does not have a completion timestamp' },
        { status: 400 }
      );
    }

    // Verify within 7-day window
    const completedAt = new Date(appointment.completed_at);
    const now = new Date();
    const daysSinceCompletion = Math.floor(
      (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCompletion > 7) {
      return NextResponse.json(
        {
          error: 'Feedback must be submitted within 7 days of appointment completion',
          days_since_completion: daysSinceCompletion,
        },
        { status: 400 }
      );
    }

    // Check if feedback already exists (will be caught by UNIQUE constraint, but provide better error)
    const { data: existingFeedback } = await supabase
      .from('feedback')
      .select('id')
      .eq('appointment_id', appointment_id)
      .limit(1);

    if (existingFeedback && existingFeedback.length > 0) {
      return NextResponse.json(
        { error: 'Feedback has already been submitted for this appointment' },
        { status: 400 }
      );
    }

    // Create feedback record
    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({
        patient_id: patient.id,
        appointment_id,
        rating,
        facility_rating,
        wait_time_rating,
        would_recommend,
        comments: comments.trim(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    // Fetch appointment data for notification context
    const { data: appointmentData } = await supabase
      .from('appointments')
      .select('appointment_number, services(name)')
      .eq('id', appointment_id)
      .single();

    // Create notification for super admin
    // Get all super admins
    const { data: superAdmins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin');

    if (superAdmins && superAdmins.length > 0) {
      // Create notifications for all super admins with appointment context
      const notifications = superAdmins.map(admin => ({
        user_id: admin.id,
        type: 'feedback_request',
        title: 'New Patient Feedback',
        message: `Patient submitted feedback for appointment #${appointmentData?.appointment_number || 'N/A'} (${appointmentData?.services?.name || 'Unknown Service'}) with an overall rating of ${rating}/5 stars.`,
        link: '/admin/feedback',
        data: `appointment_number=${appointmentData?.appointment_number}|service_name=${appointmentData?.services?.name}|rating=${rating}`
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return NextResponse.json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully. Thank you for your input!',
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 * Get feedback based on user role
 *
 * Query params:
 * - patient_id: filter by patient (super_admin only)
 * - responded: filter by response status (true/false)
 *
 * Returns:
 * - Patients: Their own feedback only
 * - Super Admin: All feedback with filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const patientIdFilter = searchParams.get('patient_id');
    const respondedFilter = searchParams.get('responded');

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Use admin client to bypass RLS for nested joins
    const adminClient = createAdminClient();

    // Build query based on role
    let query = adminClient
      .from('feedback')
      .select(`
        *,
        patients!inner(
          id,
          user_id,
          patient_number,
          profiles!inner(
            first_name,
            last_name,
            email,
            contact_number
          )
        ),
        appointments!inner(
          id,
          appointment_date,
          appointment_time,
          time_block,
          appointment_number,
          services(
            id,
            name,
            category
          )
        ),
        responded_by_profile:profiles!responded_by(
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    // Role-based filtering
    if (profile.role === 'patient') {
      // Patients see only their own feedback
      const { data: patientRecord } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!patientRecord) {
        return NextResponse.json({ error: 'Patient record not found' }, { status: 404 });
      }

      query = query.eq('patient_id', patientRecord.id);

    } else if (profile.role === 'super_admin') {
      // Super admins see all feedback with optional filters
      if (patientIdFilter) {
        query = query.eq('patient_id', patientIdFilter);
      }

      if (respondedFilter === 'true') {
        query = query.not('admin_response', 'is', null);
      } else if (respondedFilter === 'false') {
        query = query.is('admin_response', null);
      }

    } else {
      // Other roles cannot access feedback
      return NextResponse.json(
        { error: 'You do not have permission to view feedback' },
        { status: 403 }
      );
    }

    const { data: feedbackList, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: feedbackList || [],
      count: feedbackList?.length || 0,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
