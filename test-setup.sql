-- =============================================================================
-- AUTOMATIC NO-SHOW DETECTION - TEST SETUP
-- =============================================================================
-- This script creates test appointments to verify the automatic no-show
-- detection system works correctly.
--
-- Test Patient: neil zxc (P00000012)
-- Patient ID: 2e81920d-e337-4f4f-a404-b32a291acaf2
-- User ID: 66ed31f6-9da5-42d8-a20f-55e012e9f13c
-- Email: inuehzxc@gmail.com
--
-- Created: December 21, 2025 4:25 PM PHT
-- =============================================================================

-- TEST APPOINTMENT 1: Past Date (Dec 19, 2025) - SHOULD TRIGGER NO-SHOW
-- This appointment is 2 days overdue (24+ hours past)
-- Expected: Will be marked as 'no_show', no_show_count = 1
INSERT INTO appointments (
  patient_id,
  service_id,
  appointment_date,
  appointment_time,
  time_block,
  appointment_number,
  status,
  reason,
  created_at,
  updated_at
) VALUES (
  '2e81920d-e337-4f4f-a404-b32a291acaf2',  -- neil zxc
  1,                                          -- Service ID 1
  '2025-12-19',                              -- 2 days ago
  '08:00:00',                                -- 8 AM
  'AM',
  1,
  'scheduled',                                -- Will be marked no_show
  'Test - First no-show (Strike 1/2)',
  NOW(),
  NOW()
);

-- TEST APPOINTMENT 2: Past Date (Dec 18, 2025) - SHOULD TRIGGER SUSPENSION
-- This appointment is 3 days overdue (24+ hours past)
-- Expected: Will be marked as 'no_show', no_show_count = 2, account SUSPENDED
INSERT INTO appointments (
  patient_id,
  service_id,
  appointment_date,
  appointment_time,
  time_block,
  appointment_number,
  status,
  reason,
  created_at,
  updated_at
) VALUES (
  '2e81920d-e337-4f4f-a404-b32a291acaf2',  -- SAME patient (neil zxc)
  1,                                          -- Service ID 1
  '2025-12-18',                              -- 3 days ago
  '09:00:00',                                -- 9 AM
  'AM',
  2,
  'scheduled',                                -- Will be marked no_show
  'Test - Second no-show (triggers SUSPENSION)',
  NOW(),
  NOW()
);

-- TEST APPOINTMENT 3: Future Date (Dec 22, 2025) - Should NOT TRIGGER
-- This appointment is tomorrow (not yet overdue)
-- Expected: Will remain 'scheduled', no processing
INSERT INTO appointments (
  patient_id,
  service_id,
  appointment_date,
  appointment_time,
  time_block,
  appointment_number,
  status,
  reason,
  created_at,
  updated_at
) VALUES (
  '2e81920d-e337-4f4f-a404-b32a291acaf2',  -- SAME patient (neil zxc)
  1,                                          -- Service ID 1
  '2025-12-22',                              -- Tomorrow
  '10:00:00',                                -- 10 AM
  'AM',
  3,
  'scheduled',                                -- Should remain scheduled
  'Test - Future appointment (should NOT process)',
  NOW(),
  NOW()
);

-- =============================================================================
-- VERIFICATION: Check appointments were created
-- =============================================================================
SELECT
  id,
  appointment_date,
  appointment_time,
  status,
  reason,
  (CURRENT_DATE - appointment_date) as days_overdue,
  CASE
    WHEN appointment_date < CURRENT_DATE - 1 THEN '✅ Should be marked no-show'
    WHEN appointment_date >= CURRENT_DATE THEN '⏳ Should remain scheduled'
    ELSE '⚠️ Edge case'
  END as expected_result
FROM appointments
WHERE reason LIKE 'Test -%'
ORDER BY appointment_date;

-- Expected output:
-- Dec 18: days_overdue=3, "✅ Should be marked no-show"
-- Dec 19: days_overdue=2, "✅ Should be marked no-show"
-- Dec 22: days_overdue=-1, "⏳ Should remain scheduled"
