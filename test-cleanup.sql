-- =============================================================================
-- AUTOMATIC NO-SHOW DETECTION - CLEANUP SCRIPT
-- =============================================================================
-- This script removes all test data and resets the test patient to original state.
-- Run this AFTER verifying the test results.
--
-- Test Patient: neil zxc (P00000012)
-- Patient ID: 2e81920d-e337-4f4f-a404-b32a291acaf2
-- User ID: 66ed31f6-9da5-42d8-a20f-55e012e9f13c
--
-- Created: December 21, 2025 4:25 PM PHT
-- =============================================================================

-- CLEANUP STEP 1: Delete test notifications
DELETE FROM notifications
WHERE user_id = '66ed31f6-9da5-42d8-a20f-55e012e9f13c'
  AND created_at >= CURRENT_DATE
  AND (type = 'account_suspended' OR type = 'no_show_warning');

-- CLEANUP STEP 2: Delete audit trail entries for test appointments
DELETE FROM appointment_status_history
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE reason LIKE 'Test -%'
);

-- CLEANUP STEP 3: Delete test appointments
DELETE FROM appointments
WHERE reason LIKE 'Test -%';

-- CLEANUP STEP 4: Reset patient no-show tracking fields
UPDATE patients
SET
  no_show_count = 0,
  suspended_until = NULL,
  last_no_show_at = NULL
WHERE id = '2e81920d-e337-4f4f-a404-b32a291acaf2';

-- CLEANUP STEP 5: Reactivate patient profile
UPDATE profiles
SET status = 'active'
WHERE id = '66ed31f6-9da5-42d8-a20f-55e012e9f13c'
  AND status = 'suspended';

-- =============================================================================
-- VERIFICATION: Confirm cleanup was successful
-- =============================================================================

-- Verify no test appointments remain
SELECT
  COUNT(*) as remaining_test_appointments,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All test appointments deleted'
    ELSE '❌ Test appointments still exist'
  END as cleanup_result
FROM appointments
WHERE reason LIKE 'Test -%';

-- Verify patient was reset correctly
SELECT
  patient_number,
  no_show_count,
  suspended_until,
  last_no_show_at,
  CASE
    WHEN no_show_count = 0
      AND suspended_until IS NULL
      AND last_no_show_at IS NULL
      THEN '✅ Patient reset successfully'
    ELSE '❌ Patient not fully reset'
  END as cleanup_result
FROM patients
WHERE id = '2e81920d-e337-4f4f-a404-b32a291acaf2';

-- Verify profile was reactivated
SELECT
  id,
  status,
  CASE
    WHEN status = 'active' THEN '✅ Profile reactivated'
    ELSE '❌ Profile still suspended'
  END as cleanup_result
FROM profiles
WHERE id = '66ed31f6-9da5-42d8-a20f-55e012e9f13c';

-- Verify no test notifications remain
SELECT
  COUNT(*) as remaining_test_notifications,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All test notifications deleted'
    ELSE '❌ Test notifications still exist'
  END as cleanup_result
FROM notifications
WHERE user_id = '66ed31f6-9da5-42d8-a20f-55e012e9f13c'
  AND created_at >= CURRENT_DATE
  AND (type = 'account_suspended' OR type = 'no_show_warning');

-- Verify no audit trail entries remain for test appointments
SELECT
  COUNT(*) as remaining_audit_entries,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ All audit entries deleted'
    ELSE '❌ Audit entries still exist'
  END as cleanup_result
FROM appointment_status_history
WHERE appointment_id IN (
  SELECT id FROM appointments WHERE reason LIKE 'Test -%'
);

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================
SELECT
  '✅ CLEANUP COMPLETE!' as status,
  'Patient "neil zxc" (P00000012) has been reset to original state.' as message,
  'All test data has been removed from the database.' as confirmation;

-- =============================================================================
-- EXPECTED OUTPUT:
-- =============================================================================
-- All verification queries should return ✅ success messages
-- Patient should have:
--   - no_show_count = 0
--   - suspended_until = NULL
--   - last_no_show_at = NULL
--   - profile.status = 'active'
-- All test appointments, notifications, and audit entries should be deleted
