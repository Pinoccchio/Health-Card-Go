-- Migration: Add DELETE RLS policy for diseases table
-- Date: 2025-12-28
-- Purpose: Fix missing DELETE policy causing "invalid input syntax for type uuid: undefined" error
--
-- Issue: The diseases table had RLS enabled with SELECT, INSERT, and UPDATE policies,
-- but no DELETE policy. This caused all DELETE operations to fail with RLS errors.
--
-- Solution: Add DELETE policy allowing staff and super_admin roles to delete disease records

-- Add DELETE policy for diseases table
CREATE POLICY "Staff and Super Admins can delete disease records"
ON diseases
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('staff', 'super_admin')
  )
);

-- Verify the policy was created
-- This comment documents the expected result
-- Expected: One row showing the new DELETE policy
/*
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'diseases' AND cmd = 'DELETE';
*/
