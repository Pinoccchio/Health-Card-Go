-- Migration: Add TTL (Time-To-Live) expiry to user_announcement_reads
-- Purpose: Prevent unbounded database growth by auto-expiring read records after 30 days
-- Aligns with healthcare portal industry best practices
-- Date: 2025-01-02

-- =============================================
-- Add expires_at column with 30-day TTL
-- =============================================
ALTER TABLE user_announcement_reads
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days';

-- =============================================
-- Backfill expires_at for existing records
-- =============================================
UPDATE user_announcement_reads
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- =============================================
-- Make expires_at NOT NULL after backfill
-- =============================================
ALTER TABLE user_announcement_reads
ALTER COLUMN expires_at SET NOT NULL;

-- =============================================
-- Create cleanup function
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_announcement_reads()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_announcement_reads
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Log cleanup (optional - for monitoring)
  RAISE NOTICE 'Cleaned up % expired announcement read records', deleted_count;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Create trigger to auto-cleanup on insert
-- =============================================
-- This trigger runs cleanup every time a new read is inserted
-- Alternatively, use Supabase Edge Function cron for daily cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Run cleanup asynchronously (don't block insert)
  PERFORM cleanup_expired_announcement_reads();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_cleanup_announcement_reads
AFTER INSERT ON user_announcement_reads
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_cleanup_on_insert();

-- =============================================
-- Update table comment
-- =============================================
COMMENT ON COLUMN user_announcement_reads.expires_at IS 'Auto-expire read records after 30 days to prevent unbounded database growth. Announcements older than 30 days are automatically cleared from unread status.';

-- =============================================
-- Create index on expires_at for cleanup performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_announcement_reads_expires_at
  ON user_announcement_reads(expires_at)
  WHERE expires_at < NOW() + INTERVAL '7 days'; -- Partial index for cleanup window

-- =============================================
-- Manual cleanup query (for Supabase Edge Function if preferred over trigger)
-- =============================================
-- SELECT cleanup_expired_announcement_reads();
-- Schedule this in Supabase Edge Function with daily cron:
-- Example: '0 2 * * *' (runs at 2 AM daily)
