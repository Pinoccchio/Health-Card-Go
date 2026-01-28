-- Create service_available_dates table
-- This implements a WHITELIST approach where all dates are blocked by default
-- Healthcare Admins must explicitly open dates for their assigned service
--
-- Key behavior:
-- - If a date is NOT in this table → the date is BLOCKED for that service
-- - If a date IS in this table → the date is AVAILABLE for that service
-- - Weekends and holidays cannot be opened (enforced at application level)

CREATE TABLE IF NOT EXISTS service_available_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  opened_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique constraint: one entry per service per date
  CONSTRAINT unique_service_date UNIQUE(service_id, available_date)
);

-- Create index for fast lookups by service and date
CREATE INDEX IF NOT EXISTS idx_service_available_dates_lookup
  ON service_available_dates(service_id, available_date);

-- Create index for date range queries
CREATE INDEX IF NOT EXISTS idx_service_available_dates_date_range
  ON service_available_dates(available_date);

-- Create index for opened_by lookups (to track who opened dates)
CREATE INDEX IF NOT EXISTS idx_service_available_dates_opened_by
  ON service_available_dates(opened_by);

-- Enable Row Level Security
ALTER TABLE service_available_dates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Healthcare Admins can SELECT their assigned service's available dates
CREATE POLICY "healthcare_admin_select_own_service"
  ON service_available_dates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_admin'
      AND profiles.assigned_service_id = service_available_dates.service_id
    )
  );

-- RLS Policy: Healthcare Admins can INSERT for their assigned service
CREATE POLICY "healthcare_admin_insert_own_service"
  ON service_available_dates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_admin'
      AND profiles.assigned_service_id = service_available_dates.service_id
    )
  );

-- RLS Policy: Healthcare Admins can UPDATE their assigned service's dates
CREATE POLICY "healthcare_admin_update_own_service"
  ON service_available_dates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_admin'
      AND profiles.assigned_service_id = service_available_dates.service_id
    )
  );

-- RLS Policy: Healthcare Admins can DELETE from their assigned service
CREATE POLICY "healthcare_admin_delete_own_service"
  ON service_available_dates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_admin'
      AND profiles.assigned_service_id = service_available_dates.service_id
    )
  );

-- RLS Policy: Super Admins can view all (read-only access in UI)
CREATE POLICY "super_admin_view_all"
  ON service_available_dates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policy: Patients can read to check availability when booking
CREATE POLICY "patients_can_read"
  ON service_available_dates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'patient'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_available_dates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on modification
CREATE TRIGGER set_service_available_dates_updated_at
  BEFORE UPDATE ON service_available_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_service_available_dates_updated_at();

-- Function to check if a date is available for a service
-- Returns TRUE if the date is in the service_available_dates table
-- Returns FALSE if the date is not in the table (blocked by default)
CREATE OR REPLACE FUNCTION is_service_date_available(
  p_service_id INTEGER,
  p_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM service_available_dates
    WHERE service_id = p_service_id
    AND available_date = p_date
  );
END;
$$;

-- Function to get all available dates for a service within a date range
CREATE OR REPLACE FUNCTION get_service_available_dates_in_range(
  p_service_id INTEGER,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  available_date DATE,
  opened_by_name TEXT,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sad.available_date,
    CONCAT(p.first_name, ' ', p.last_name) AS opened_by_name,
    sad.reason
  FROM service_available_dates sad
  JOIN profiles p ON p.id = sad.opened_by
  WHERE sad.service_id = p_service_id
  AND sad.available_date BETWEEN p_start_date AND p_end_date
  ORDER BY sad.available_date;
END;
$$;

-- Add comment to table for documentation
COMMENT ON TABLE service_available_dates IS 'Stores dates that are AVAILABLE for booking per service. Uses whitelist approach: dates NOT in this table are blocked by default. Healthcare Admins can only manage dates for their assigned service.';

-- Add comments to columns
COMMENT ON COLUMN service_available_dates.service_id IS 'The service this availability applies to';
COMMENT ON COLUMN service_available_dates.available_date IS 'The date that is open for booking (must be a weekday and not a holiday)';
COMMENT ON COLUMN service_available_dates.opened_by IS 'The Healthcare Admin who opened this date';
COMMENT ON COLUMN service_available_dates.reason IS 'Optional reason for opening this date';
