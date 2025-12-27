-- Create disease_statistics table for aggregate historical disease data
-- This table stores bulk historical data (e.g., "150 dengue cases in Jan 2020")
-- Different from individual disease records in the 'diseases' table

-- Create disease_statistics table
CREATE TABLE disease_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disease_type disease_type NOT NULL,
  custom_disease_name TEXT,
  barangay_id INTEGER REFERENCES barangays(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  case_count INTEGER NOT NULL CHECK (case_count > 0),
  source TEXT,
  notes TEXT,
  created_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add check constraint for custom_disease_name (same as diseases table)
ALTER TABLE disease_statistics
ADD CONSTRAINT check_custom_disease_name_stats
CHECK (
  (disease_type = 'other' AND custom_disease_name IS NOT NULL AND TRIM(custom_disease_name) != '')
  OR
  (disease_type != 'other' AND custom_disease_name IS NULL)
);

-- Create indexes for efficient querying
CREATE INDEX idx_disease_statistics_disease_type ON disease_statistics(disease_type);
CREATE INDEX idx_disease_statistics_barangay_id ON disease_statistics(barangay_id);
CREATE INDEX idx_disease_statistics_record_date ON disease_statistics(record_date);
CREATE INDEX idx_disease_statistics_created_by ON disease_statistics(created_by_id);

-- Add comments
COMMENT ON TABLE disease_statistics IS 'Aggregate historical disease data for bulk imports and statistical analysis';
COMMENT ON COLUMN disease_statistics.case_count IS 'Number of disease cases for this date/location';
COMMENT ON COLUMN disease_statistics.source IS 'Data source (e.g., DOH bulletin, CHO records)';
COMMENT ON COLUMN disease_statistics.custom_disease_name IS 'Custom disease name when disease_type is "other"';

-- Enable Row Level Security
ALTER TABLE disease_statistics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Staff and Super Admin can read all statistics
CREATE POLICY "Staff and Super Admin can view all disease statistics"
ON disease_statistics
FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('staff', 'super_admin')
  )
);

-- RLS Policy: Only Staff and Super Admin can insert statistics
CREATE POLICY "Staff and Super Admin can create disease statistics"
ON disease_statistics
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role IN ('staff', 'super_admin')
  )
);

-- RLS Policy: Only creator or Super Admin can update their statistics
CREATE POLICY "Creator or Super Admin can update disease statistics"
ON disease_statistics
FOR UPDATE
USING (
  created_by_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);

-- RLS Policy: Only creator or Super Admin can delete their statistics
CREATE POLICY "Creator or Super Admin can delete disease statistics"
ON disease_statistics
FOR DELETE
USING (
  created_by_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);
