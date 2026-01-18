-- =============================================================================
-- Migration: Remove 4 Service Categories - Keep Only 3 Core Categories
-- Date: 2026-01-18 15:00:00
-- Purpose: Simplify services to only Health Card, HIV, and Pregnancy categories
--          Remove: Laboratory, Immunization, Education, General Services
-- =============================================================================

-- STEP 1: Cancel active appointments for services being removed
-- Services to remove: 18, 19, 20, 21, 22, 23
-- Categories: laboratory, immunization, education, general

DO $$
DECLARE
  v_cancelled_count INTEGER;
BEGIN
  -- Cancel appointments for services being deleted
  UPDATE appointments
  SET
    status = 'cancelled',
    cancellation_reason = 'Service discontinued - category removed from system',
    updated_at = NOW()
  WHERE service_id IN (18, 19, 20, 21, 22, 23)
    AND status IN ('scheduled', 'checked_in', 'in_progress', 'pending');

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
  RAISE NOTICE 'Cancelled % appointments for discontinued services', v_cancelled_count;
END $$;

-- STEP 2: Unassign healthcare admins from services being removed
DO $$
DECLARE
  v_unassigned_count INTEGER;
BEGIN
  -- Unassign healthcare admins from services being deleted
  UPDATE profiles
  SET
    assigned_service_id = NULL,
    updated_at = NOW()
  WHERE assigned_service_id IN (18, 19, 20, 21, 22, 23)
    AND role = 'healthcare_admin';

  GET DIAGNOSTICS v_unassigned_count = ROW_COUNT;
  RAISE NOTICE 'Unassigned % healthcare admins from discontinued services', v_unassigned_count;

  IF v_unassigned_count > 0 THEN
    RAISE NOTICE 'These admins are now BLOCKED from login until reassigned to Health Card/HIV/Pregnancy services';
  END IF;
END $$;

-- STEP 3: Deactivate services in removed categories
-- We deactivate instead of delete to preserve referential integrity for historical data
UPDATE services
SET
  is_active = false,
  updated_at = NOW()
WHERE id IN (18, 19, 20, 21, 22, 23);

RAISE NOTICE 'Deactivated 6 services in categories: laboratory, immunization, education, general';

-- STEP 4: Verify final state
DO $$
DECLARE
  v_active_services INTEGER;
  v_unassigned_admins INTEGER;
  v_cancelled_appointments INTEGER;
BEGIN
  -- Count remaining active services
  SELECT COUNT(*) INTO v_active_services
  FROM services
  WHERE is_active = true;

  -- Count unassigned healthcare admins
  SELECT COUNT(*) INTO v_unassigned_admins
  FROM profiles
  WHERE role = 'healthcare_admin'
    AND assigned_service_id IS NULL
    AND status = 'active';

  -- Count cancelled appointments from this migration
  SELECT COUNT(*) INTO v_cancelled_appointments
  FROM appointments
  WHERE service_id IN (18, 19, 20, 21, 22, 23)
    AND status = 'cancelled'
    AND cancellation_reason = 'Service discontinued - category removed from system';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'FINAL STATE SUMMARY:';
  RAISE NOTICE '  Active services: % (should be 6)', v_active_services;
  RAISE NOTICE '  Unassigned healthcare admins: % (need reassignment)', v_unassigned_admins;
  RAISE NOTICE '  Cancelled appointments: %', v_cancelled_appointments;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'REMAINING CATEGORIES: Health Card, HIV Services, Pregnancy Services';
  RAISE NOTICE 'REMOVED CATEGORIES: Laboratory, Immunization, Education, General Services';
  RAISE NOTICE '========================================';
END $$;

-- Add migration comment
COMMENT ON TABLE services IS
  'Healthcare services table. As of 2026-01-18, only 3 categories are active: healthcard, hiv, pregnancy. Other categories (laboratory, immunization, education, general) have been discontinued.';
