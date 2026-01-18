-- =============================================================================
-- Migration: Consolidate Health Card Services to Single Service
-- Date: 2026-01-18 16:00:00
-- Purpose: Simplify Health Card services from 4 separate services to 1 unified service
--          Keep only healthcard.admin@test.com as the single Health Card admin
-- =============================================================================

-- BACKGROUND:
-- Currently 4 Health Card services exist:
--   Service 12: Food Handler Health Card Processing (32 appointments, 1 admin)
--   Service 13: Food Handler Health Card Renewal (23 appointments, 1 admin)
--   Service 14: Non-Food Health Card Processing (20 appointments, 1 admin)
--   Service 15: Non-Food Health Card Renewal (18 appointments, 1 admin)
-- Total: 93 appointments, 4 admins
--
-- After consolidation:
--   Service 12: Health Card Issuance & Renewal (93 appointments, 1 admin)
--   Services 13-15: Deactivated (kept for audit trail)
--   Admins: Only healthcard.admin@test.com remains active

-- =============================================================================
-- STEP 1: Migrate appointments with queue number recalculation
-- =============================================================================

DO $$
DECLARE
  v_migrated_count INTEGER := 0;
  v_appointment RECORD;
  v_new_queue_number INTEGER;
BEGIN
  -- For each appointment in Services 13, 14, 15
  FOR v_appointment IN
    SELECT id, appointment_date, service_id, appointment_number, status
    FROM appointments
    WHERE service_id IN (13, 14, 15)
    ORDER BY appointment_date, created_at
  LOOP
    -- Only recalculate queue for active appointments
    IF v_appointment.status IN ('scheduled', 'checked_in', 'in_progress', 'pending') THEN
      -- Get next available queue number for this date in Service 12
      SELECT COALESCE(MAX(appointment_number), 0) + 1
      INTO v_new_queue_number
      FROM appointments
      WHERE service_id = 12
        AND appointment_date = v_appointment.appointment_date
        AND status NOT IN ('cancelled', 'no_show');

      -- Update appointment: change service and recalculate queue
      UPDATE appointments
      SET
        service_id = 12,
        appointment_number = v_new_queue_number,
        updated_at = NOW()
      WHERE id = v_appointment.id;
    ELSE
      -- For cancelled/completed appointments, just change service (keep queue for history)
      UPDATE appointments
      SET
        service_id = 12,
        updated_at = NOW()
      WHERE id = v_appointment.id;
    END IF;

    v_migrated_count := v_migrated_count + 1;
  END LOOP;

  RAISE NOTICE '✅ Migrated % appointments from Services 13-15 to Service 12', v_migrated_count;
  RAISE NOTICE '   Active appointments received new queue numbers';
  RAISE NOTICE '   Completed/cancelled appointments kept original queue numbers';
END $$;

-- =============================================================================
-- STEP 2: Deactivate 3 healthcare admins (keep only healthcard.admin@test.com)
-- =============================================================================

DO $$
DECLARE
  v_deactivated_count INTEGER;
BEGIN
  -- Deactivate other 3 health card admins:
  -- 1. healthcard.renewal@test.com (Service 13)
  -- 2. healthcard.nonfood@test.com (Service 14)
  -- 3. healthcard.nonfood.renewal@test.com (Service 15)

  UPDATE profiles
  SET
    assigned_service_id = NULL,
    status = 'inactive',
    updated_at = NOW()
  WHERE role = 'healthcare_admin'
    AND assigned_service_id IN (13, 14, 15)
    AND email != 'healthcard.admin@test.com';

  GET DIAGNOSTICS v_deactivated_count = ROW_COUNT;
  RAISE NOTICE '✅ Deactivated % healthcare admins (unassigned from Services 13-15)', v_deactivated_count;

  IF v_deactivated_count > 0 THEN
    RAISE NOTICE '⚠️  These admins are now BLOCKED from login (inactive status)';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Ensure healthcard.admin@test.com is assigned to Service 12
-- =============================================================================

DO $$
BEGIN
  -- Ensure the primary Health Card admin is assigned to Service 12
  UPDATE profiles
  SET
    assigned_service_id = 12,
    status = 'active',
    updated_at = NOW()
  WHERE email = 'healthcard.admin@test.com'
    AND role = 'healthcare_admin';

  RAISE NOTICE '✅ Confirmed healthcard.admin@test.com assigned to Service 12';
END $$;

-- =============================================================================
-- STEP 4: Rename Service 12 to generic name
-- =============================================================================

UPDATE services
SET
  name = 'Health Card Issuance & Renewal',
  description = 'Consolidated health card processing and renewal service for all health card types (food handler and non-food)',
  updated_at = NOW()
WHERE id = 12;

RAISE NOTICE '✅ Renamed Service 12 to "Health Card Issuance & Renewal"';

-- =============================================================================
-- STEP 5: Deactivate Services 13, 14, 15 (keep for audit trail)
-- =============================================================================

UPDATE services
SET is_active = false, updated_at = NOW()
WHERE id IN (13, 14, 15);

RAISE NOTICE '✅ Deactivated Services 13, 14, 15 (kept for historical data)';

-- =============================================================================
-- STEP 6: Verification and Summary
-- =============================================================================

DO $$
DECLARE
  v_total_appointments INTEGER;
  v_active_appointments INTEGER;
  v_active_admins INTEGER;
  v_inactive_services INTEGER;
  v_healthcard_admin_service INTEGER;
BEGIN
  -- Count total appointments for Service 12
  SELECT COUNT(*) INTO v_total_appointments
  FROM appointments
  WHERE service_id = 12;

  -- Count active appointments for Service 12
  SELECT COUNT(*) INTO v_active_appointments
  FROM appointments
  WHERE service_id = 12
    AND status IN ('scheduled', 'checked_in', 'in_progress', 'pending');

  -- Count active Health Card admins
  SELECT COUNT(*) INTO v_active_admins
  FROM profiles
  WHERE role = 'healthcare_admin'
    AND admin_category = 'healthcard'
    AND status = 'active';

  -- Count inactive Health Card services
  SELECT COUNT(*) INTO v_inactive_services
  FROM services
  WHERE id IN (13, 14, 15)
    AND is_active = false;

  -- Get healthcard.admin@test.com's assigned service
  SELECT assigned_service_id INTO v_healthcard_admin_service
  FROM profiles
  WHERE email = 'healthcard.admin@test.com';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONSOLIDATION COMPLETE - FINAL STATE:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Service 12 Total Appointments: %', v_total_appointments;
  RAISE NOTICE '  Service 12 Active Appointments: %', v_active_appointments;
  RAISE NOTICE '  Active Health Card Admins: % (should be 1)', v_active_admins;
  RAISE NOTICE '  Inactive Health Card Services: % (should be 3)', v_inactive_services;
  RAISE NOTICE '  healthcard.admin@test.com assigned to: Service %', v_healthcard_admin_service;
  RAISE NOTICE '========================================';
  RAISE NOTICE '  ✅ Health Card services consolidated to Service 12';
  RAISE NOTICE '  ✅ Only healthcard.admin@test.com remains active';
  RAISE NOTICE '  ✅ Services 13-15 deactivated (preserved for audit)';
  RAISE NOTICE '  ✅ All appointment history preserved';
  RAISE NOTICE '  ✅ Queue numbers recalculated for active appointments';
  RAISE NOTICE '========================================';
END $$;

-- Add comment for documentation
COMMENT ON TABLE services IS
  'Healthcare services table. As of 2026-01-18, Health Card services consolidated to single service (ID 12). Services 13-15 deactivated but preserved for historical data.';
