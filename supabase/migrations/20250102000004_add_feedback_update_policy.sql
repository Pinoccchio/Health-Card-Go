-- Add UPDATE policy for feedback table to allow Super Admins to respond to feedback
-- This is a security hardening measure - currently the API route checks auth,
-- but this adds RLS enforcement at the database level

-- Allow Super Admins to update feedback (add admin_response)
CREATE POLICY "Super admins can update feedback"
ON feedback
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Add comment for documentation
COMMENT ON POLICY "Super admins can update feedback" ON feedback IS
'Allows Super Admins to update feedback records (primarily to add admin_response).
This enforces authorization at the database level via RLS.';
