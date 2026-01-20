-- Test Script for Appointment Stage Tracking System
-- Execute these queries in Supabase SQL Editor to set up test data

-- ============================================
-- SETUP: Verify Database Schema
-- ============================================

-- 1. Check appointment_status enum includes 'rescheduled'
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'appointment_status'::regtype
ORDER BY enumsortorder;
-- Expected: scheduled, checked_in, in_progress, completed, cancelled, no_show, pending, draft, rescheduled

-- 2. Check appointment_stage enum
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'appointment_stage'::regtype
ORDER BY enumsortorder;
-- Expected: check_in, laboratory, results, checkup, releasing

-- ============================================
-- TEST DATA: Create Sample HealthCard Appointment
-- ============================================

-- 3. Find a test patient (or create one)
SELECT id, patient_number, profiles.first_name, profiles.last_name
FROM patients
JOIN profiles ON patients.profile_id = profiles.id
LIMIT 5;

-- 4. Find HealthCard services
SELECT id, name, category, is_active
FROM services
WHERE category = 'healthcard' AND is_active = true;
-- Expected: Service IDs for food_handler, non_food, pink

-- 5. Create a test appointment (replace <patient_id> and <service_id>)
INSERT INTO appointments (
  patient_id,
  service_id,
  appointment_date,
  appointment_time,
  time_block,
  appointment_number,
  status,
  appointment_stage,
  reason,
  lab_location,
  card_type
) VALUES (
  '<patient_id>'::uuid,  -- Replace with actual patient UUID
  1,                      -- Replace with actual HealthCard service ID
  '2026-01-27',          -- Future date
  '09:00:00',
  'AM',
  1,
  'scheduled',
  NULL,                   -- Starts with no stage
  'Annual health card renewal',
  'inside_cho',          -- or 'outside_cho'
  'food_handler'         -- or 'non_food' or 'pink'
)
RETURNING id, appointment_number, status, appointment_stage;

-- Save the returned appointment ID for next steps

-- ============================================
-- TEST SCENARIO 1: Check In Appointment
-- ============================================

-- 6. Simulate admin checking in the appointment
UPDATE appointments
SET
  status = 'checked_in',
  appointment_stage = 'check_in',
  checked_in_at = NOW(),
  updated_at = NOW()
WHERE id = '<appointment_id>'::uuid  -- Replace with appointment ID from step 5
RETURNING id, appointment_number, status, appointment_stage, checked_in_at;

-- ============================================
-- TEST SCENARIO 2: Laboratory Stage
-- ============================================

-- 7. Advance to Laboratory stage (simulates clicking "Proceed to Laboratory")
UPDATE appointments
SET
  appointment_stage = 'laboratory',
  updated_at = NOW()
WHERE id = '<appointment_id>'::uuid
RETURNING id, appointment_stage;

-- 8. Log to history (API does this automatically)
INSERT INTO appointment_status_history (
  appointment_id,
  from_status,
  to_status,
  changed_by,
  change_type,
  metadata
) VALUES (
  '<appointment_id>'::uuid,
  'checked_in',
  'checked_in',
  '<admin_user_id>'::uuid,  -- Replace with actual admin UUID
  'stage_update',
  '{"previous_stage": "check_in", "new_stage": "laboratory", "notes": "Laboratory tests in progress"}'::jsonb
);

-- 9. Advance to Results stage (simulates LaboratoryStageModal completion)
UPDATE appointments
SET
  appointment_stage = 'results',
  updated_at = NOW()
WHERE id = '<appointment_id>'::uuid
RETURNING id, appointment_stage;

-- ============================================
-- TEST SCENARIO 3: Doctor Check-up - Approval
-- ============================================

-- 10. Advance to Releasing stage (doctor approves)
UPDATE appointments
SET
  appointment_stage = 'releasing',
  status = 'in_progress',  -- Status changes to in_progress during consultation
  started_at = NOW(),
  updated_at = NOW()
WHERE id = '<appointment_id>'::uuid
RETURNING id, status, appointment_stage;

-- ============================================
-- TEST SCENARIO 4: Health Card Release (Completion)
-- ============================================

-- 11. Complete the appointment (simulates ReleasingStageModal)
UPDATE appointments
SET
  status = 'completed',
  completed_at = NOW(),
  completed_by_id = '<admin_user_id>'::uuid,
  updated_at = NOW()
WHERE id = '<appointment_id>'::uuid
RETURNING id, status, appointment_stage, completed_at;

-- 12. Verify health card was created (trigger should fire automatically)
SELECT id, patient_id, card_type, qr_code_data, issued_at
FROM health_cards
WHERE patient_id = '<patient_id>'::uuid
ORDER BY issued_at DESC
LIMIT 1;

-- ============================================
-- TEST SCENARIO 5: Doctor Check-up - Retest (Reschedule)
-- ============================================

-- 13. Create another test appointment to test reschedule flow
-- (Use same INSERT query from step 5, but with different appointment_number)

-- 14. Check in and advance to checkup stage
UPDATE appointments
SET
  status = 'in_progress',
  appointment_stage = 'checkup',
  checked_in_at = NOW(),
  started_at = NOW(),
  updated_at = NOW()
WHERE id = '<second_appointment_id>'::uuid
RETURNING id, status, appointment_stage;

-- 15. Reschedule for retest (simulates CheckupStageModal "Require Additional Testing")
UPDATE appointments
SET
  status = 'rescheduled',
  appointment_stage = NULL,  -- Reset stage progression
  cancellation_reason = 'Laboratory results require additional testing. Patient needs to reschedule in approximately 1 week.',
  updated_at = NOW()
WHERE id = '<second_appointment_id>'::uuid
RETURNING id, status, appointment_stage, cancellation_reason;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- 16. View appointment with all details
SELECT
  a.id,
  a.appointment_number,
  a.appointment_date,
  a.time_block,
  a.status,
  a.appointment_stage,
  a.checked_in_at,
  a.started_at,
  a.completed_at,
  a.cancellation_reason,
  s.name AS service_name,
  s.category AS service_category,
  p.patient_number,
  pr.first_name,
  pr.last_name
FROM appointments a
JOIN services s ON a.service_id = s.id
JOIN patients p ON a.patient_id = p.id
JOIN profiles pr ON p.profile_id = pr.id
WHERE a.id = '<appointment_id>'::uuid;

-- 17. View status history for appointment
SELECT
  ash.id,
  ash.from_status,
  ash.to_status,
  ash.change_type,
  ash.metadata,
  ash.changed_at,
  p.first_name || ' ' || p.last_name AS changed_by_name
FROM appointment_status_history ash
LEFT JOIN profiles p ON ash.changed_by = p.id
WHERE ash.appointment_id = '<appointment_id>'::uuid
ORDER BY ash.changed_at DESC;

-- 18. View all HealthCard appointments with stages
SELECT
  a.appointment_number,
  a.appointment_date,
  a.status,
  a.appointment_stage,
  a.card_type,
  a.lab_location,
  pr.first_name || ' ' || pr.last_name AS patient_name,
  s.name AS service_name
FROM appointments a
JOIN services s ON a.service_id = s.id
JOIN patients p ON a.patient_id = p.id
JOIN profiles pr ON p.profile_id = pr.id
WHERE s.category = 'healthcard'
  AND a.appointment_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.appointment_date DESC, a.appointment_number;

-- ============================================
-- VALIDATION TESTS (Should Fail)
-- ============================================

-- 19. Test sequential validation (should fail - can't skip stages)
-- Try to jump from 'laboratory' to 'releasing' (skipping results and checkup)
UPDATE appointments
SET appointment_stage = 'releasing'
WHERE id = '<appointment_id>'::uuid
  AND appointment_stage = 'laboratory';
-- This will succeed in SQL but the API will reject it with validation error

-- 20. Test service type validation
-- Try to set appointment_stage for non-HealthCard service (should not work via API)
SELECT
  a.id,
  a.appointment_stage,
  s.category
FROM appointments a
JOIN services s ON a.service_id = s.id
WHERE s.category != 'healthcard'
  AND a.appointment_stage IS NOT NULL;
-- Should return 0 rows (no non-HealthCard appointments should have stages)

-- ============================================
-- CLEANUP (Optional)
-- ============================================

-- 21. Delete test appointments (if needed)
-- DELETE FROM appointments WHERE id IN ('<appointment_id_1>'::uuid, '<appointment_id_2>'::uuid);

-- 22. Delete test status history (cascades automatically with appointment deletion)
-- No manual cleanup needed due to foreign key constraints

-- ============================================
-- NOTES
-- ============================================

/*
This script provides SQL-level testing for the stage tracking system.
For full end-to-end testing, use the UI test cases in APPOINTMENT_STAGE_TRACKING_COMPLETE.md

Key Points:
1. Replace all <placeholders> with actual UUIDs from your database
2. Execute queries in order (they build on each other)
3. The API endpoints provide additional validation that SQL doesn't (e.g., sequential stage checking)
4. Health card creation is handled by database trigger on appointment completion
5. Use verification queries (#16-18) to confirm changes

For API testing, see the curl examples in APPOINTMENT_STAGE_TRACKING_COMPLETE.md
*/
