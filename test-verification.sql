-- =============================================================================
-- AUTOMATIC NO-SHOW DETECTION - VERIFICATION QUERIES
-- =============================================================================
-- This script verifies the automatic no-show detection system worked correctly.
-- Run this AFTER executing test-setup.sql and triggering the cron job.
--
-- Test Patient: neil zxc (P00000012)
-- Patient ID: 2e81920d-e337-4f4f-a404-b32a291acaf2
-- User ID: 66ed31f6-9da5-42d8-a20f-55e012e9f13c
--
-- Created: December 21, 2025 4:25 PM PHT
-- =============================================================================

-- VERIFICATION 1: Check appointments were processed correctly
-- Expected:
--   - Dec 18 appointment: status = 'no_show'
--   - Dec 19 appointment: status = 'no_show'
--   - Dec 22 appointment: status = 'scheduled' (unchanged)
SELECT
  id,
  appointment_date,
  appointment_time,
  status,
  reason,
  (CURRENT_DATE - appointment_date) as days_overdue,
  CASE
    WHEN status = 'no_show' AND appointment_date < CURRENT_DATE - 1 THEN '✅ PASS: Marked no-show'
    WHEN status = 'scheduled' AND appointment_date >= CURRENT_DATE THEN '✅ PASS: Remains scheduled'
    WHEN status = 'scheduled' AND appointment_date < CURRENT_DATE - 1 THEN '❌ FAIL: Should be no-show'
    WHEN status = 'no_show' AND appointment_date >= CURRENT_DATE THEN '❌ FAIL: Should be scheduled'
    ELSE '⚠️ UNEXPECTED STATUS'
  END as verification_result
FROM appointments
WHERE reason LIKE 'Test -%'
ORDER BY appointment_date;

-- VERIFICATION 2: Check patient no-show count
-- Expected: no_show_count = 2
SELECT
  patient_number,
  no_show_count,
  last_no_show_at,
  suspended_until,
  CASE
    WHEN no_show_count = 2 THEN '✅ PASS: No-show count correct'
    WHEN no_show_count < 2 THEN '❌ FAIL: No-show count too low'
    WHEN no_show_count > 2 THEN '❌ FAIL: No-show count too high'
    ELSE '⚠️ UNEXPECTED COUNT'
  END as verification_result
FROM patients
WHERE id = '2e81920d-e337-4f4f-a404-b32a291acaf2';

-- VERIFICATION 3: Check patient suspension status
-- Expected:
--   - profiles.status = 'suspended'
--   - patients.suspended_until = NOW() + interval '1 month'
SELECT
  p.patient_number,
  prof.status as profile_status,
  p.no_show_count,
  p.suspended_until,
  (p.suspended_until::date - CURRENT_DATE) as days_suspended,
  CASE
    WHEN prof.status = 'suspended' AND p.suspended_until IS NOT NULL
      AND (p.suspended_until::date - CURRENT_DATE) BETWEEN 28 AND 31
      THEN '✅ PASS: Patient suspended for ~30 days'
    WHEN prof.status = 'active' THEN '❌ FAIL: Profile should be suspended'
    WHEN p.suspended_until IS NULL THEN '❌ FAIL: suspended_until not set'
    ELSE '⚠️ UNEXPECTED SUSPENSION STATE'
  END as verification_result
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.id = '2e81920d-e337-4f4f-a404-b32a291acaf2';

-- VERIFICATION 4: Check appointment status history audit trail
-- Expected: 2 audit entries (one for each no-show)
SELECT
  ash.id,
  ash.appointment_id,
  ash.old_status,
  ash.new_status,
  ash.changed_by_id,
  ash.reason,
  ash.changed_at,
  a.appointment_date,
  CASE
    WHEN ash.old_status = 'scheduled' AND ash.new_status = 'no_show'
      AND ash.reason LIKE '%Automatic%'
      THEN '✅ PASS: Audit trail correct'
    ELSE '⚠️ CHECK MANUALLY'
  END as verification_result
FROM appointment_status_history ash
JOIN appointments a ON ash.appointment_id = a.id
WHERE a.reason LIKE 'Test -%'
ORDER BY ash.changed_at DESC;

-- VERIFICATION 5: Check notifications were sent
-- Expected: 2 suspension notifications (one for each no-show)
SELECT
  n.id,
  n.user_id,
  n.type,
  n.title,
  n.message,
  n.is_read,
  n.created_at,
  CASE
    WHEN n.type = 'account_suspended' AND n.is_read = false
      THEN '✅ PASS: Suspension notification created'
    WHEN n.type = 'no_show_warning'
      THEN '✅ PASS: No-show warning created'
    ELSE '⚠️ CHECK MANUALLY'
  END as verification_result
FROM notifications n
WHERE n.user_id = '66ed31f6-9da5-42d8-a20f-55e012e9f13c'
  AND n.created_at >= CURRENT_DATE
ORDER BY n.created_at DESC;

-- =============================================================================
-- SUMMARY VERIFICATION QUERY
-- =============================================================================
-- This query provides a comprehensive overview of the test results
WITH test_summary AS (
  SELECT
    -- Count no-show appointments
    COUNT(*) FILTER (WHERE a.status = 'no_show') as no_shows_marked,

    -- Count scheduled appointments (should be 1: Dec 22)
    COUNT(*) FILTER (WHERE a.status = 'scheduled') as still_scheduled,

    -- Get patient data
    MAX(p.no_show_count) as patient_no_show_count,
    MAX(prof.status) as patient_profile_status,
    MAX(p.suspended_until) as patient_suspended_until,

    -- Count notifications
    (SELECT COUNT(*) FROM notifications WHERE user_id = '66ed31f6-9da5-42d8-a20f-55e012e9f13c'
      AND created_at >= CURRENT_DATE) as notifications_sent,

    -- Count audit entries
    (SELECT COUNT(*) FROM appointment_status_history ash
      JOIN appointments a ON ash.appointment_id = a.id
      WHERE a.reason LIKE 'Test -%' AND ash.new_status = 'no_show') as audit_entries

  FROM appointments a
  JOIN patients p ON a.patient_id = p.id
  JOIN profiles prof ON p.user_id = prof.id
  WHERE a.reason LIKE 'Test -%'
)
SELECT
  no_shows_marked,
  still_scheduled,
  patient_no_show_count,
  patient_profile_status,
  patient_suspended_until::date as suspended_until_date,
  (patient_suspended_until::date - CURRENT_DATE) as days_suspended,
  notifications_sent,
  audit_entries,
  CASE
    WHEN no_shows_marked = 2
      AND still_scheduled = 1
      AND patient_no_show_count = 2
      AND patient_profile_status = 'suspended'
      AND (patient_suspended_until::date - CURRENT_DATE) BETWEEN 28 AND 31
      AND audit_entries >= 2
      THEN '✅ ALL TESTS PASSED!'
    ELSE '❌ SOME TESTS FAILED - CHECK DETAILS ABOVE'
  END as overall_result
FROM test_summary;

-- =============================================================================
-- EXPECTED OUTPUT:
-- =============================================================================
-- no_shows_marked: 2
-- still_scheduled: 1
-- patient_no_show_count: 2
-- patient_profile_status: suspended
-- days_suspended: ~30
-- notifications_sent: >= 2
-- audit_entries: >= 2
-- overall_result: ✅ ALL TESTS PASSED!
