-- =============================================================================
-- Migration: Block unassigned healthcare admins from accessing appointments
-- Date: 2026-01-18
-- Purpose: Database-level enforcement to prevent unassigned healthcare admins
--          from accessing appointments and medical records via direct API calls
--
-- SECURITY RATIONALE:
-- Healthcare admins must be assigned to a service (assigned_service_id NOT NULL)
-- to meaningfully access appointments or create medical records. This migration
-- adds RLS policies as a defense-in-depth layer to prevent API-level bypass.
--
-- AFFECTED ROLES:
-- - super_admin: Unaffected (no service assignment needed)
-- - staff: Unaffected (no service assignment needed)
-- - patient: Unaffected (no service assignment needed)
-- - healthcare_admin: MUST have assigned_service_id to access appointments/records
-- =============================================================================

-- Policy 1: Block unassigned healthcare admins from selecting appointments
-- This policy restricts SELECT queries on appointments table
CREATE POLICY "healthcare_admin_service_assignment_appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  -- Allow access if user is:
  -- 1. NOT a healthcare admin (super_admin, staff, patient can access via other policies)
  -- 2. Healthcare admin WITH assigned_service_id set

  (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'healthcare_admin'::user_role
  OR
  (SELECT assigned_service_id FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
);

-- Policy 2: Block unassigned healthcare admins from selecting medical records
-- This policy restricts SELECT queries on medical_records table
CREATE POLICY "healthcare_admin_service_assignment_medical_records"
ON public.medical_records
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'healthcare_admin'::user_role
  OR
  (SELECT assigned_service_id FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
);

-- Policy 3: Block unassigned healthcare admins from updating appointments
-- This policy restricts UPDATE operations on appointments table
CREATE POLICY "healthcare_admin_service_assignment_appointments_update"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'healthcare_admin'::user_role
  OR
  (SELECT assigned_service_id FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'healthcare_admin'::user_role
  OR
  (SELECT assigned_service_id FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
);

-- Policy 4: Block unassigned healthcare admins from creating medical records
-- This policy restricts INSERT operations on medical_records table
CREATE POLICY "healthcare_admin_service_assignment_medical_records_insert"
ON public.medical_records
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'healthcare_admin'::user_role
  OR
  (SELECT assigned_service_id FROM public.profiles WHERE id = auth.uid()) IS NOT NULL
);

-- Add comments for documentation
COMMENT ON POLICY "healthcare_admin_service_assignment_appointments" ON public.appointments IS
  'Blocks unassigned healthcare admins (assigned_service_id IS NULL) from selecting appointments. Part of 3-layer security system.';

COMMENT ON POLICY "healthcare_admin_service_assignment_medical_records" ON public.medical_records IS
  'Blocks unassigned healthcare admins (assigned_service_id IS NULL) from selecting medical records. Part of 3-layer security system.';

COMMENT ON POLICY "healthcare_admin_service_assignment_appointments_update" ON public.appointments IS
  'Blocks unassigned healthcare admins (assigned_service_id IS NULL) from updating appointments. Part of 3-layer security system.';

COMMENT ON POLICY "healthcare_admin_service_assignment_medical_records_insert" ON public.medical_records IS
  'Blocks unassigned healthcare admins (assigned_service_id IS NULL) from creating medical records. Part of 3-layer security system.';

-- Verification query (for logging)
-- This will show the count of unassigned healthcare admins
DO $$
DECLARE
  v_unassigned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_unassigned_count
  FROM profiles
  WHERE role = 'healthcare_admin'
    AND assigned_service_id IS NULL
    AND status = 'active';

  RAISE NOTICE 'Migration applied: % active unassigned healthcare admin(s) found', v_unassigned_count;

  IF v_unassigned_count > 0 THEN
    RAISE NOTICE 'These admins will be blocked at login until assigned to a service';
  END IF;
END $$;
