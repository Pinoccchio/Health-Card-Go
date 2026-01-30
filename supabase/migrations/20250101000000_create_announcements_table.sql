-- Migration: Create announcements table
-- Purpose: Store system-wide announcements for different user audiences
-- Note: This table was originally created via Supabase Dashboard.
--       This migration ensures reproducibility for fresh database setups.

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'patients',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT fk_announcements_created_by
    FOREIGN KEY (created_by)
    REFERENCES profiles(id)
    ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone authenticated can read active announcements
CREATE POLICY "Authenticated users can view active announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Super Admins can view all announcements (including inactive)
CREATE POLICY "Super Admins can view all announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Education Admins can view all announcements (including inactive)
CREATE POLICY "Education Admins can view all announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'education_admin'
    )
  );

-- Education Admins can create announcements
CREATE POLICY "Education Admins can create announcements"
  ON announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'education_admin'
    )
    AND created_by = auth.uid()
  );

-- Education Admins can update their own announcements
CREATE POLICY "Education Admins can update own announcements"
  ON announcements
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'education_admin'
    )
  );

-- Super Admins can update any announcement
CREATE POLICY "Super Admins can update any announcement"
  ON announcements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Super Admins can delete announcements
CREATE POLICY "Super Admins can delete announcements"
  ON announcements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- Comments
COMMENT ON TABLE announcements IS 'System-wide announcements targeted to specific user audiences';
COMMENT ON COLUMN announcements.target_audience IS 'Target audience: all, patients, healthcare_admin, super_admin, staff, education_admin';
COMMENT ON COLUMN announcements.created_by IS 'UUID of the Education Admin who created the announcement';
