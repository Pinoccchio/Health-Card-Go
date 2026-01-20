-- Create holidays table for blocking appointment booking on holidays
-- Supports both fixed dates and recurring holidays (e.g., movable holidays)
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL,
  holiday_name text NOT NULL,
  is_recurring boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Create unique index on holiday_date to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);

-- Create index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_holidays_date_lookup ON holidays(holiday_date);

-- Enable Row Level Security
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read holidays (needed for booking validation)
CREATE POLICY "Allow authenticated users to read holidays"
  ON holidays
  FOR SELECT
  TO authenticated
  USING (true);

-- Only super admins can manage holidays
CREATE POLICY "Allow super_admin to insert holidays"
  ON holidays
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Allow super_admin to update holidays"
  ON holidays
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Allow super_admin to delete holidays"
  ON holidays
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on holidays update
CREATE TRIGGER holidays_updated_at
  BEFORE UPDATE ON holidays
  FOR EACH ROW
  EXECUTE FUNCTION update_holidays_updated_at();

-- Insert common Philippine national holidays for 2026
INSERT INTO holidays (holiday_date, holiday_name, is_recurring) VALUES
  ('2026-01-01', 'New Year''s Day', false),
  ('2026-04-09', 'Araw ng Kagitingan (Day of Valor)', false),
  ('2026-04-09', 'Maundy Thursday', false),
  ('2026-04-10', 'Good Friday', false),
  ('2026-04-11', 'Black Saturday', false),
  ('2026-05-01', 'Labor Day', false),
  ('2026-06-12', 'Independence Day', false),
  ('2026-08-31', 'National Heroes Day', false),
  ('2026-11-30', 'Bonifacio Day', false),
  ('2026-12-25', 'Christmas Day', false),
  ('2026-12-30', 'Rizal Day', false),
  ('2026-12-31', 'Last Day of the Year', false)
ON CONFLICT (holiday_date) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE holidays IS 'Stores holidays for blocking appointment bookings. Weekends (Saturday/Sunday) are already blocked in the application logic.';
