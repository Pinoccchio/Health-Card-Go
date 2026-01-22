-- Clear all data from Supabase database for fresh import
-- WARNING: This will delete ALL data from tables (except system tables)
-- Use this when you want to start fresh with new data imports

-- Disable triggers temporarily to avoid cascade issues
SET session_replication_role = 'replica';

-- Clear disease-related tables
TRUNCATE TABLE disease_predictions CASCADE;
TRUNCATE TABLE disease_statistics CASCADE;
TRUNCATE TABLE diseases CASCADE;

-- Clear outbreak alerts (if exists)
TRUNCATE TABLE outbreak_alerts CASCADE;

-- Clear appointment-related tables
TRUNCATE TABLE appointment_status_history CASCADE;
TRUNCATE TABLE appointment_uploads CASCADE;
TRUNCATE TABLE appointments CASCADE;

-- Clear medical records
TRUNCATE TABLE medical_records CASCADE;

-- Clear health cards
TRUNCATE TABLE health_cards CASCADE;

-- Clear service predictions
TRUNCATE TABLE service_predictions CASCADE;

-- Clear healthcard statistics
TRUNCATE TABLE healthcard_statistics CASCADE;

-- Clear notifications
TRUNCATE TABLE notifications CASCADE;

-- Clear feedbacks
TRUNCATE TABLE feedbacks CASCADE;

-- Clear user announcement reads
TRUNCATE TABLE user_announcement_reads CASCADE;

-- Clear announcements
TRUNCATE TABLE announcements CASCADE;

-- Clear lab fees
TRUNCATE TABLE lab_fees CASCADE;

-- Clear translations (optional - keep if you want to preserve translations)
-- TRUNCATE TABLE translations CASCADE;
-- TRUNCATE TABLE translation_categories CASCADE;

-- DO NOT clear these tables (keep system configuration):
-- - profiles (user accounts)
-- - barangays (barangay list with population data)
-- - services (health services configuration)
-- - holidays (holiday calendar)

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset sequences (auto-increment IDs)
-- For tables that use SERIAL or BIGSERIAL

-- Refresh materialized view (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'outbreak_statistics'
  ) THEN
    REFRESH MATERIALIZED VIEW outbreak_statistics;
  END IF;
END $$;

-- Vacuum tables to reclaim space
VACUUM ANALYZE;

-- Show table row counts after cleanup
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON MIGRATION IS 'Clear all transactional data while preserving system configuration (users, barangays, services, holidays)';
