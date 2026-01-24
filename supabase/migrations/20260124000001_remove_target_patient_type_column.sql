-- Migration: Remove legacy target_patient_type column from announcements table
-- Date: 2026-01-24
-- Reason: Consolidating targeting to target_audience only (Option B - cleaner approach)

-- =============================================
-- Step 1: Drop check constraint (if exists)
-- =============================================
-- Note: PostgreSQL auto-generates constraint names like "announcements_target_patient_type_check"

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find constraint name dynamically
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  INNER JOIN pg_class rel ON rel.oid = con.conrelid
  INNER JOIN pg_attribute att ON att.attrelid = con.conrelid
  WHERE rel.relname = 'announcements'
    AND att.attname = 'target_patient_type'
    AND con.contype = 'c'; -- 'c' = check constraint

  -- Drop constraint if found
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE announcements DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No check constraint found on target_patient_type column';
  END IF;
END $$;

-- =============================================
-- Step 2: Drop the target_patient_type column
-- =============================================
ALTER TABLE announcements DROP COLUMN IF EXISTS target_patient_type;

-- =============================================
-- Step 3: Add comment documenting the change
-- =============================================
COMMENT ON TABLE announcements IS
  'Announcements table - stores system-wide announcements for different user roles. Uses target_audience for role-based filtering (all, patients, healthcare_admin, super_admin, staff, education_admin). Legacy target_patient_type column removed on 2026-01-24.';

-- =============================================
-- Step 4: Verify column removal
-- =============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'announcements'
      AND column_name = 'target_patient_type'
  ) THEN
    RAISE EXCEPTION 'Failed to drop target_patient_type column';
  ELSE
    RAISE NOTICE 'Successfully removed target_patient_type column from announcements table';
  END IF;
END $$;
