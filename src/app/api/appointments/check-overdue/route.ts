import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/appointments/check-overdue
 * Automatically detect and mark overdue appointments as no-show
 *
 * Triggered by: Healthcare Admin visiting dashboard (visitor-triggered)
 * ⚡ REAL-TIME MODE: No rate limiting - runs every page visit
 *
 * Business Rules:
 * - Finds appointments scheduled > 24 hours ago
 * - Status must be: 'scheduled', 'verified', or 'in_progress'
 * - Marks each as 'no_show'
 * - Increments patient no_show_count
 * - Suspends account after 2 strikes
 * - Sends notifications to patients
 *
 * Only Healthcare Admins can trigger this endpoint.
 */

export async function POST(request: NextRequest) {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 [AUTO NO-SHOW] Automatic no-show detection triggered');
  console.log('='.repeat(80));

  try {
    const supabase = await createClient();

    // 1. Check authentication
    console.log('🔐 [AUTO NO-SHOW] Step 1: Authenticating user...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [AUTO NO-SHOW] Authentication failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`✅ [AUTO NO-SHOW] User authenticated: ${user.id}`);

    // 2. Get user profile
    console.log('👤 [AUTO NO-SHOW] Step 2: Fetching user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [AUTO NO-SHOW] Profile not found:', profileError?.message);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    console.log(`✅ [AUTO NO-SHOW] Profile loaded - Role: ${profile.role}`);

    // 3. Only Healthcare Admins can trigger automatic check
    if (profile.role !== 'healthcare_admin') {
      console.warn(`⚠️ [AUTO NO-SHOW] Access denied - User role is '${profile.role}' (requires 'healthcare_admin')`);
      return NextResponse.json(
        { error: 'Only Healthcare Admins can trigger automatic no-show detection' },
        { status: 403 }
      );
    }
    console.log('✅ [AUTO NO-SHOW] Authorization passed - Healthcare Admin confirmed');

    // 4. Calculate cutoff time (24 hours ago)
    console.log('📅 [AUTO NO-SHOW] Step 3: Calculating cutoff time (24 hours ago)...');
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`🔍 [AUTO NO-SHOW] Cutoff: ${cutoffDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PHT)`);
    console.log(`🔍 [AUTO NO-SHOW] Searching for appointments before ${cutoffISO.split('T')[0]} with status: scheduled/verified/in_progress`);

    // 5. Find overdue appointments
    console.log('🔎 [AUTO NO-SHOW] Step 4: Querying database for overdue appointments...');
    const adminClient = createAdminClient();
    const { data: overdueAppointments, error: fetchError } = await adminClient
      .from('appointments')
      .select(`
        id,
        appointment_number,
        appointment_date,
        appointment_time,
        status,
        patient_id,
        service_id,
        patients!inner(
          id,
          user_id,
          no_show_count
        )
      `)
      .in('status', ['scheduled', 'verified', 'in_progress'])
      .lt('appointment_date', cutoffISO.split('T')[0]) // Date only comparison
      .order('appointment_date', { ascending: true });

    if (fetchError) {
      console.error('❌ [AUTO NO-SHOW] Database query failed:', fetchError);
      console.log('='.repeat(80) + '\n');
      return NextResponse.json(
        { error: 'Failed to fetch overdue appointments', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!overdueAppointments || overdueAppointments.length === 0) {
      console.log('✅ [AUTO NO-SHOW] No overdue appointments found - database is clean!');
      console.log('='.repeat(80) + '\n');
      return NextResponse.json({
        success: true,
        message: 'No overdue appointments found',
        processed_count: 0,
        checked_at: new Date().toISOString(),
      });
    }

    console.log(`📋 [AUTO NO-SHOW] Found ${overdueAppointments.length} overdue appointment(s) to process`);
    console.log('-'.repeat(80));

    // 6. Process each overdue appointment
    console.log('⚙️ [AUTO NO-SHOW] Step 5: Processing each appointment...\n');
    const results = [];
    const nowISO = new Date().toISOString();
    let processedCount = 0;

    for (const appointment of overdueAppointments) {
      processedCount++;
      console.log(`\n📌 [AUTO NO-SHOW] Processing ${processedCount}/${overdueAppointments.length}:`);
      console.log(`   Appointment ID: ${appointment.id}`);
      console.log(`   Queue #${appointment.appointment_number} | Date: ${appointment.appointment_date} | Time: ${appointment.appointment_time}`);
      console.log(`   Current Status: ${appointment.status} | Patient ID: ${appointment.patient_id}`);

      try {
        // 6a. Mark appointment as no-show
        console.log(`   → Step 5a: Updating appointment status to 'no_show'...`);

        // Use _reversion_metadata to pass changed_by to the trigger
        const { error: updateError } = await adminClient
          .from('appointments')
          .update({
            status: 'no_show',
            updated_at: nowISO,
            _reversion_metadata: {
              changed_by_id: user.id,
              reason: `Automatically marked as no-show - appointment was ${Math.floor((Date.now() - new Date(appointment.appointment_date).getTime()) / (1000 * 60 * 60))} hours overdue`,
              automatic: true,
              triggered_by_role: 'healthcare_admin',
            },
          })
          .eq('id', appointment.id);

        if (updateError) {
          console.error(`   ❌ Failed to update appointment:`, updateError.message);
          results.push({ appointment_id: appointment.id, success: false, error: updateError.message });
          continue;
        }
        console.log(`   ✅ Appointment status updated to 'no_show'`);
        console.log(`   ✅ Audit log auto-created by database trigger`);

        // 6b. Increment patient no_show_count
        console.log(`   → Step 5b: Incrementing patient no_show_count...`);
        const { data: updatedPatient, error: patientUpdateError } = await adminClient
          .rpc('increment_patient_no_show_count', {
            p_patient_id: appointment.patient_id,
            p_last_no_show_at: nowISO,
          })
          .single();

        const newNoShowCount = (updatedPatient as any)?.no_show_count || (appointment.patients.no_show_count || 0) + 1;

        if (patientUpdateError) {
          console.error(`   ⚠️ Failed to increment no_show_count:`, patientUpdateError.message);
        } else {
          console.log(`   ✅ Patient no_show_count incremented to ${newNoShowCount}`);
        }

        // 6c. Send notification to patient
        console.log(`   → Step 5c: Sending notification to patient...`);
        const notificationMessage = newNoShowCount >= 2
          ? `Your appointment #${appointment.appointment_number} on ${appointment.appointment_date} was marked as no-show. This is strike ${newNoShowCount}/2. Your account has been suspended for 1 month.`
          : `Your appointment #${appointment.appointment_number} on ${appointment.appointment_date} was marked as no-show. This is strike ${newNoShowCount}/2.`;

        await adminClient
          .from('notifications')
          .insert({
            user_id: appointment.patients.user_id,
            type: 'cancellation',
            title: 'Appointment Marked as No Show',
            message: notificationMessage,
            link: '/patient/appointments',
          });
        console.log(`   ✅ Patient notification sent`);

        // 6d. Check if patient should be suspended (2+ no-shows)
        let suspensionApplied = false;
        if (newNoShowCount >= 2) {
          console.log(`   ⚠️ Step 5d: Patient has ${newNoShowCount} no-shows - applying suspension...`);
          const suspendedUntil = new Date(nowISO);
          suspendedUntil.setMonth(suspendedUntil.getMonth() + 1);

          // Update profile status
          await adminClient
            .from('profiles')
            .update({ status: 'suspended' })
            .eq('id', appointment.patients.user_id);
          console.log(`   ✅ Profile status set to 'suspended'`);

          // Update patient suspended_until
          const { error: suspensionError } = await adminClient
            .from('patients')
            .update({ suspended_until: suspendedUntil.toISOString() })
            .eq('id', appointment.patient_id);

          if (!suspensionError) {
            suspensionApplied = true;
            console.log(`   ✅ Suspension expiry set to ${suspendedUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);

            // Send suspension notification
            await adminClient
              .from('notifications')
              .insert({
                user_id: appointment.patients.user_id,
                type: 'general',
                title: 'Account Suspended Due to No-Shows',
                message: `Your account has been suspended for 1 month due to ${newNoShowCount} no-shows. The latest missed appointment was #${appointment.appointment_number} on ${appointment.appointment_date}. You can book appointments again on ${suspendedUntil.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. If you believe this is an error, please contact the City Health Office.`,
                link: '/patient/dashboard',
                data: `appointment_number=${appointment.appointment_number}|no_show_count=${newNoShowCount}|suspended_until=${suspendedUntil.toISOString()}`
              });
            console.log(`   ✅ Suspension notification sent`);

            console.log(`   🚫 PATIENT SUSPENDED until ${suspendedUntil.toISOString()}`);
          } else {
            console.error(`   ❌ Failed to set suspension expiry:`, suspensionError.message);
          }
        } else {
          console.log(`   ℹ️ Patient has ${newNoShowCount}/2 no-shows - no suspension applied`);
        }

        console.log(`\n   ✅ SUCCESS: Appointment #${appointment.appointment_number} processed (No-show count: ${newNoShowCount}${suspensionApplied ? ', SUSPENDED' : ''})`);

        results.push({
          appointment_id: appointment.id,
          appointment_number: appointment.appointment_number,
          appointment_date: appointment.appointment_date,
          success: true,
          no_show_count: newNoShowCount,
          suspension_applied: suspensionApplied,
        });

      } catch (error) {
        console.error(`\n   ❌ ERROR processing appointment ${appointment.id}:`, error);
        results.push({
          appointment_id: appointment.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 7. Summary
    console.log('\n' + '-'.repeat(80));
    console.log('📊 [AUTO NO-SHOW] FINAL SUMMARY:');
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const suspendedCount = results.filter(r => r.success && r.suspension_applied).length;

    console.log(`   ✅ Successfully processed: ${successCount}/${overdueAppointments.length}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   🚫 Accounts suspended: ${suspendedCount}`);
    console.log(`   ⏱️ Completed at: ${new Date(nowISO).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PHT)`);
    console.log('='.repeat(80) + '\n');

    return NextResponse.json({
      success: true,
      message: `Automatic no-show check completed`,
      processed_count: successCount,
      failed_count: failedCount,
      total_found: overdueAppointments.length,
      suspensions_applied: suspendedCount,
      results,
      checked_at: nowISO,
    });

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ [AUTO NO-SHOW] UNEXPECTED ERROR:');
    console.error(error);
    console.error('='.repeat(80) + '\n');
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
