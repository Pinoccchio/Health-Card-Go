-- Migration: Drop Outbreak System
-- Date: 2026-01-25
-- Description: Complete removal of outbreak detection system including tables, views, and functions

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS outbreak_statistics CASCADE;

-- Drop outbreak_alerts table
DROP TABLE IF EXISTS outbreak_alerts CASCADE;

-- Drop functions related to outbreak detection
DROP FUNCTION IF EXISTS refresh_outbreak_statistics() CASCADE;
DROP FUNCTION IF EXISTS trigger_refresh_outbreak_statistics() CASCADE;
DROP FUNCTION IF EXISTS get_outbreak_alerts(text, text, text, int) CASCADE;
DROP FUNCTION IF EXISTS compute_outbreak_risk_level(int, int, int, int) CASCADE;

-- Drop any triggers related to outbreak detection
DROP TRIGGER IF EXISTS trigger_refresh_outbreak_statistics_on_insert ON disease_statistics CASCADE;
DROP TRIGGER IF EXISTS trigger_refresh_outbreak_statistics_on_update ON disease_statistics CASCADE;
DROP TRIGGER IF EXISTS trigger_refresh_outbreak_statistics_on_delete ON disease_statistics CASCADE;

-- Clean up any scheduled jobs (if using pg_cron extension)
-- Note: Uncomment if you have pg_cron enabled and have scheduled outbreak jobs
-- SELECT cron.unschedule('compute-outbreak-alerts');

-- Drop any indexes related to outbreak tables
DROP INDEX IF EXISTS idx_outbreak_alerts_disease_type CASCADE;
DROP INDEX IF EXISTS idx_outbreak_alerts_barangay_id CASCADE;
DROP INDEX IF EXISTS idx_outbreak_alerts_risk_level CASCADE;
DROP INDEX IF EXISTS idx_outbreak_alerts_expires_at CASCADE;

-- Verify cleanup
DO $$
BEGIN
  RAISE NOTICE 'Outbreak system successfully removed from database';
END $$;
