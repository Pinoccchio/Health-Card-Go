-- Migration: Create user_announcement_reads table for tracking which announcements users have read
-- Purpose: Enable unread badge counters on patient sidebar announcements menu item
-- Date: 2025-01-02

-- =============================================
-- Create user_announcement_reads table
-- =============================================
CREATE TABLE IF NOT EXISTS user_announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  announcement_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Ensure each user can only mark an announcement as read once
  CONSTRAINT unique_user_announcement UNIQUE(user_id, announcement_id),

  -- Foreign key constraints
  CONSTRAINT fk_user_announcement_reads_user
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user_announcement_reads_announcement
    FOREIGN KEY (announcement_id)
    REFERENCES announcements(id)
    ON DELETE CASCADE
);

-- =============================================
-- Create indexes for performance
-- =============================================

-- Index for fast user-based queries (e.g., get all reads for a user)
CREATE INDEX IF NOT EXISTS idx_user_announcement_reads_user_id
  ON user_announcement_reads(user_id);

-- Index for fast announcement-based queries (e.g., who has read this announcement)
CREATE INDEX IF NOT EXISTS idx_user_announcement_reads_announcement_id
  ON user_announcement_reads(announcement_id);

-- Composite index for unread count queries (user + announcement lookup)
CREATE INDEX IF NOT EXISTS idx_user_announcement_reads_user_announcement
  ON user_announcement_reads(user_id, announcement_id);

-- =============================================
-- Enable Row Level Security (RLS)
-- =============================================
ALTER TABLE user_announcement_reads ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- Policy: Patients can view their own announcement reads
CREATE POLICY "Patients can view own announcement reads"
  ON user_announcement_reads
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Policy: Patients can insert their own announcement reads (mark as read)
CREATE POLICY "Patients can mark announcements as read"
  ON user_announcement_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- Policy: Super Admins can view all announcement reads (for analytics)
CREATE POLICY "Super Admins can view all announcement reads"
  ON user_announcement_reads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policy: Healthcare Admins can view reads for announcements they created
CREATE POLICY "Healthcare Admins can view reads for their announcements"
  ON user_announcement_reads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM announcements
      WHERE announcements.id = user_announcement_reads.announcement_id
      AND announcements.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'healthcare_admin'
      )
    )
  );

-- =============================================
-- Add helpful comments
-- =============================================
COMMENT ON TABLE user_announcement_reads IS 'Tracks which announcements have been read by which users for badge counter functionality';
COMMENT ON COLUMN user_announcement_reads.user_id IS 'Foreign key to profiles table - the user who read the announcement';
COMMENT ON COLUMN user_announcement_reads.announcement_id IS 'Foreign key to announcements table - the announcement that was read';
COMMENT ON COLUMN user_announcement_reads.read_at IS 'Timestamp when the user first read/viewed the announcement';
COMMENT ON COLUMN user_announcement_reads.created_at IS 'Record creation timestamp';
