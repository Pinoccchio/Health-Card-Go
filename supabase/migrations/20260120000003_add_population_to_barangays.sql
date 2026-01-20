-- Add population column to barangays table for percentage-based heatmap risk calculation
-- Formula: (cases / population) * 100
-- Risk Levels: High >=70%, Medium 50-69%, Low <=49%

ALTER TABLE barangays
ADD COLUMN IF NOT EXISTS population integer DEFAULT 0;

-- Add comment to column
COMMENT ON COLUMN barangays.population IS 'Total population of the barangay for disease risk percentage calculation';

-- Add some reasonable default population estimates for Panabo City barangays
-- These should be updated by Super Admin with actual census data
-- Average population per barangay in Panabo City (approx 230,000 total / 41 barangays = ~5,610 per barangay)
UPDATE barangays
SET population = 5610
WHERE population = 0 OR population IS NULL;
