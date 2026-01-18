-- Create healthcard_statistics table for historical health card issuance data
-- This table stores aggregate counts of health cards issued by date and barangay
-- Used for training SARIMA prediction models

CREATE TABLE healthcard_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  healthcard_type TEXT NOT NULL CHECK (healthcard_type IN ('food_handler', 'non_food')),
  barangay_id INTEGER REFERENCES barangays(id),
  record_date DATE NOT NULL,
  cards_issued INTEGER NOT NULL CHECK (cards_issued > 0),
  source TEXT,
  notes TEXT,
  created_by_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add helpful comment
COMMENT ON TABLE healthcard_statistics IS 'Aggregate historical health card issuance data for bulk imports and SARIMA model training';
COMMENT ON COLUMN healthcard_statistics.healthcard_type IS 'Type of health card: food_handler (food industry workers) or non_food (non-food industry workers)';
COMMENT ON COLUMN healthcard_statistics.barangay_id IS 'Location reference (optional). NULL indicates system-wide data.';
COMMENT ON COLUMN healthcard_statistics.record_date IS 'Date when health cards were issued';
COMMENT ON COLUMN healthcard_statistics.cards_issued IS 'Number of health cards issued on this date';
COMMENT ON COLUMN healthcard_statistics.source IS 'Data source (e.g., DOH bulletin, CHO records, manual count)';
COMMENT ON COLUMN healthcard_statistics.created_by_id IS 'Staff or Super Admin who imported this record';

-- Indexes for query performance
CREATE INDEX idx_healthcard_statistics_type_date ON healthcard_statistics(healthcard_type, record_date DESC);
CREATE INDEX idx_healthcard_statistics_barangay ON healthcard_statistics(barangay_id);
CREATE INDEX idx_healthcard_statistics_created_by ON healthcard_statistics(created_by_id);
CREATE INDEX idx_healthcard_statistics_record_date ON healthcard_statistics(record_date DESC);

-- Enable Row Level Security
ALTER TABLE healthcard_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff and Super Admin can view all healthcard statistics
CREATE POLICY "Staff and Super Admin can view healthcard statistics"
  ON healthcard_statistics FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('staff', 'super_admin')
    )
  );

-- RLS Policy: Staff and Super Admin can insert healthcard statistics
CREATE POLICY "Staff and Super Admin can insert healthcard statistics"
  ON healthcard_statistics FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('staff', 'super_admin')
    )
  );

-- RLS Policy: Creator or Super Admin can update their own healthcard statistics
CREATE POLICY "Creator or Super Admin can update healthcard statistics"
  ON healthcard_statistics FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND (
      created_by_id = auth.uid() OR
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    )
  );

-- RLS Policy: Creator or Super Admin can delete their own healthcard statistics
CREATE POLICY "Creator or Super Admin can delete healthcard statistics"
  ON healthcard_statistics FOR DELETE
  USING (
    auth.role() = 'authenticated' AND (
      created_by_id = auth.uid() OR
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
    )
  );
