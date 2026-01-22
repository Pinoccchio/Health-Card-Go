-- COMPLETE DATA RESET - Clears EVERYTHING including users
-- WARNING: This is DESTRUCTIVE and will delete ALL data from the database
-- Only use this if you want to start completely fresh

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Clear all transactional data
TRUNCATE TABLE disease_predictions CASCADE;
TRUNCATE TABLE disease_statistics CASCADE;
TRUNCATE TABLE diseases CASCADE;
TRUNCATE TABLE outbreak_alerts CASCADE;
TRUNCATE TABLE appointment_status_history CASCADE;
TRUNCATE TABLE appointment_uploads CASCADE;
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE medical_records CASCADE;
TRUNCATE TABLE health_cards CASCADE;
TRUNCATE TABLE service_predictions CASCADE;
TRUNCATE TABLE healthcard_statistics CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE feedbacks CASCADE;
TRUNCATE TABLE user_announcement_reads CASCADE;
TRUNCATE TABLE announcements CASCADE;
TRUNCATE TABLE lab_fees CASCADE;

-- Clear configuration data
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE barangays CASCADE;
TRUNCATE TABLE services CASCADE;
TRUNCATE TABLE holidays CASCADE;
TRUNCATE TABLE translations CASCADE;
TRUNCATE TABLE translation_categories CASCADE;

-- Delete auth.users (requires special handling)
-- NOTE: This requires service_role permissions
DELETE FROM auth.users;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset ALL sequences
DO $$
DECLARE
  seq_record RECORD;
BEGIN
  FOR seq_record IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE 'ALTER SEQUENCE ' || seq_record.sequence_name || ' RESTART WITH 1';
  END LOOP;
END $$;

-- Refresh materialized view (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'outbreak_statistics'
  ) THEN
    REFRESH MATERIALIZED VIEW outbreak_statistics;
  END IF;
END $$;

-- Vacuum to reclaim space
VACUUM FULL ANALYZE;

-- Show final state
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND n_live_tup > 0
ORDER BY n_live_tup DESC;

SELECT 'Database completely cleared. All tables are now empty.' AS status;
