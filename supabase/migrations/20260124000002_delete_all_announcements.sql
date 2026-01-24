-- Migration: Delete all existing announcements for fresh seeding
-- Date: 2026-01-24
-- Reason: Clearing old data before seeding new test announcements

-- =============================================
-- Step 1: Log current announcement count
-- =============================================
DO $$
DECLARE
  announcement_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO announcement_count FROM announcements;
  RAISE NOTICE 'Deleting % existing announcements', announcement_count;
END $$;

-- =============================================
-- Step 2: Delete all announcements
-- =============================================
-- This will CASCADE delete related records:
-- - user_announcement_reads (FK: fk_user_announcement_reads_announcement)
-- - announcement_translations (ON DELETE CASCADE)

TRUNCATE TABLE announcements RESTART IDENTITY CASCADE;

-- =============================================
-- Step 3: Verify deletion
-- =============================================
DO $$
DECLARE
  announcement_count INTEGER;
  reads_count INTEGER;
  translations_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO announcement_count FROM announcements;
  SELECT COUNT(*) INTO reads_count FROM user_announcement_reads;
  SELECT COUNT(*) INTO translations_count FROM announcement_translations;

  RAISE NOTICE 'After deletion:';
  RAISE NOTICE '  - Announcements: %', announcement_count;
  RAISE NOTICE '  - User reads: %', reads_count;
  RAISE NOTICE '  - Translations: %', translations_count;

  IF announcement_count > 0 THEN
    RAISE EXCEPTION 'Failed to delete all announcements';
  END IF;
END $$;

-- =============================================
-- Step 4: Reset sequence (for clean ID generation)
-- =============================================
-- Announcements table uses UUID, so no sequence to reset
-- This step is included for documentation purposes

COMMENT ON TABLE announcements IS 'All announcements cleared on 2026-01-24 for fresh test data seeding';
