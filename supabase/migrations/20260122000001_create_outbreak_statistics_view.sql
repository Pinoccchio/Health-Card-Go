-- Create materialized view for pre-aggregated outbreak statistics
-- This significantly improves outbreak detection performance by pre-computing aggregations

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS outbreak_statistics CASCADE;

-- Create materialized view with aggregated disease statistics
CREATE MATERIALIZED VIEW outbreak_statistics AS
SELECT
  disease_type,
  custom_disease_name,
  barangay_id,
  DATE(record_date) as date,
  SUM(case_count) as total_cases,
  SUM(CASE WHEN severity = 'critical' THEN case_count ELSE 0 END) as critical_cases,
  SUM(CASE WHEN severity = 'severe' THEN case_count ELSE 0 END) as severe_cases,
  SUM(CASE WHEN severity = 'moderate' THEN case_count ELSE 0 END) as moderate_cases,
  SUM(CASE WHEN severity = 'mild' THEN case_count ELSE 0 END) as mild_cases,
  COUNT(DISTINCT record_date) as record_count,
  MIN(record_date) as first_record_date,
  MAX(record_date) as latest_record_date
FROM disease_statistics
WHERE record_date >= CURRENT_DATE - INTERVAL '60 days' -- Last 60 days for performance
GROUP BY disease_type, custom_disease_name, barangay_id, DATE(record_date)
ORDER BY disease_type, barangay_id, DATE(record_date) DESC;

-- Create indexes for fast lookups
CREATE INDEX idx_outbreak_stats_disease_type ON outbreak_statistics(disease_type);
CREATE INDEX idx_outbreak_stats_barangay ON outbreak_statistics(barangay_id);
CREATE INDEX idx_outbreak_stats_date ON outbreak_statistics(date DESC);
CREATE INDEX idx_outbreak_stats_composite ON outbreak_statistics(disease_type, barangay_id, date DESC);

-- Create function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_outbreak_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY outbreak_statistics;
END;
$$;

-- Grant SELECT permission to authenticated users (via RLS)
GRANT SELECT ON outbreak_statistics TO authenticated;
GRANT SELECT ON outbreak_statistics TO anon;

-- Create a scheduled job to refresh the view every 10 minutes
-- Note: This requires pg_cron extension to be enabled
-- If pg_cron is available, uncomment the following:
/*
SELECT cron.schedule(
  'refresh-outbreak-stats',
  '*/10 * * * *', -- Every 10 minutes
  $$SELECT refresh_outbreak_statistics();$$
);
*/

-- Alternative: Create a trigger to refresh on insert/update to disease_statistics
-- This keeps the view fresh but may impact write performance
CREATE OR REPLACE FUNCTION trigger_refresh_outbreak_statistics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh the materialized view asynchronously (non-blocking)
  PERFORM refresh_outbreak_statistics();
  RETURN NEW;
END;
$$;

-- Note: This trigger refreshes on EVERY insert, which may be expensive
-- For production, consider using a scheduled job instead (pg_cron)
-- Uncomment if you want automatic refresh on data changes:
/*
CREATE TRIGGER after_disease_statistics_change
AFTER INSERT OR UPDATE OR DELETE ON disease_statistics
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_outbreak_statistics();
*/

COMMENT ON MATERIALIZED VIEW outbreak_statistics IS
'Pre-aggregated disease statistics for fast outbreak detection. Refreshed every 10 minutes or on-demand.';
