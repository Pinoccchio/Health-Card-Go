-- Create outbreak_alerts table for pre-computed outbreak detection
-- This allows background jobs to compute outbreaks every 5-10 minutes,
-- making the API endpoint near-instant (<100ms)

-- Drop existing table if it exists
DROP TABLE IF EXISTS outbreak_alerts CASCADE;

-- Create outbreak_alerts table
CREATE TABLE outbreak_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_type TEXT NOT NULL,
  custom_disease_name TEXT,
  barangay_id INTEGER REFERENCES barangays(id) ON DELETE CASCADE,
  barangay_name TEXT NOT NULL,
  case_count INTEGER NOT NULL,
  critical_cases INTEGER DEFAULT 0,
  severe_cases INTEGER DEFAULT 0,
  moderate_cases INTEGER DEFAULT 0,
  days_window INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  threshold_description TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  first_case_date DATE NOT NULL,
  latest_case_date DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '15 minutes') NOT NULL,
  metadata JSONB, -- Additional data (threshold details, multiple thresholds exceeded, etc.)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create indexes for fast queries
CREATE INDEX idx_outbreak_alerts_disease_type ON outbreak_alerts(disease_type);
CREATE INDEX idx_outbreak_alerts_barangay ON outbreak_alerts(barangay_id);
CREATE INDEX idx_outbreak_alerts_risk_level ON outbreak_alerts(risk_level);
CREATE INDEX idx_outbreak_alerts_generated_at ON outbreak_alerts(generated_at DESC);
CREATE INDEX idx_outbreak_alerts_expires_at ON outbreak_alerts(expires_at);
CREATE INDEX idx_outbreak_alerts_composite ON outbreak_alerts(disease_type, barangay_id, risk_level, generated_at DESC);

-- Create composite index for filtering
CREATE INDEX idx_outbreak_alerts_filter ON outbreak_alerts(disease_type, risk_level, expires_at)
WHERE expires_at > now();

-- Enable Row Level Security
ALTER TABLE outbreak_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super Admin: Full access
CREATE POLICY "Super admins can view all outbreak alerts"
ON outbreak_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
    AND profiles.status = 'active'
  )
);

-- Staff: View all outbreak alerts (for disease surveillance)
CREATE POLICY "Staff can view all outbreak alerts"
ON outbreak_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'staff'
    AND profiles.status = 'active'
  )
);

-- Healthcare Admin: View alerts for their assigned barangay/service (optional)
CREATE POLICY "Healthcare admins can view relevant outbreak alerts"
ON outbreak_alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'healthcare_admin'
    AND profiles.status = 'active'
  )
);

-- Service role (background jobs): Full access
CREATE POLICY "Service role can manage outbreak alerts"
ON outbreak_alerts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to clean up expired alerts
CREATE OR REPLACE FUNCTION cleanup_expired_outbreak_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM outbreak_alerts
  WHERE expires_at < now() - INTERVAL '1 hour'; -- Keep for 1 hour after expiry for audit

  RAISE NOTICE 'Cleaned up expired outbreak alerts';
END;
$$;

-- Create function to get active outbreak alerts
CREATE OR REPLACE FUNCTION get_active_outbreak_alerts(
  p_disease_type TEXT DEFAULT NULL,
  p_barangay_id INTEGER DEFAULT NULL,
  p_risk_level TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  disease_type TEXT,
  custom_disease_name TEXT,
  barangay_id INTEGER,
  barangay_name TEXT,
  case_count INTEGER,
  critical_cases INTEGER,
  severe_cases INTEGER,
  moderate_cases INTEGER,
  days_window INTEGER,
  threshold INTEGER,
  threshold_description TEXT,
  risk_level TEXT,
  first_case_date DATE,
  latest_case_date DATE,
  generated_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oa.id,
    oa.disease_type,
    oa.custom_disease_name,
    oa.barangay_id,
    oa.barangay_name,
    oa.case_count,
    oa.critical_cases,
    oa.severe_cases,
    oa.moderate_cases,
    oa.days_window,
    oa.threshold,
    oa.threshold_description,
    oa.risk_level,
    oa.first_case_date,
    oa.latest_case_date,
    oa.generated_at,
    oa.metadata
  FROM outbreak_alerts oa
  WHERE oa.expires_at > now() -- Only active alerts
    AND (p_disease_type IS NULL OR oa.disease_type = p_disease_type)
    AND (p_barangay_id IS NULL OR oa.barangay_id = p_barangay_id)
    AND (p_risk_level IS NULL OR oa.risk_level = p_risk_level)
  ORDER BY
    CASE oa.risk_level
      WHEN 'critical' THEN 0
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END,
    oa.case_count DESC,
    oa.generated_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_outbreak_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_outbreak_alerts TO service_role;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_outbreak_alerts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER outbreak_alerts_updated_at
BEFORE UPDATE ON outbreak_alerts
FOR EACH ROW
EXECUTE FUNCTION update_outbreak_alerts_updated_at();

-- Optional: Schedule cleanup job (requires pg_cron extension)
/*
SELECT cron.schedule(
  'cleanup-expired-outbreak-alerts',
  '0 * * * *', -- Every hour
  $$SELECT cleanup_expired_outbreak_alerts();$$
);
*/

COMMENT ON TABLE outbreak_alerts IS
'Pre-computed outbreak alerts generated by background jobs. Refreshed every 5-10 minutes for near-instant API responses.';

COMMENT ON FUNCTION get_active_outbreak_alerts IS
'Retrieve active (non-expired) outbreak alerts with optional filtering by disease_type, barangay_id, and risk_level.';
