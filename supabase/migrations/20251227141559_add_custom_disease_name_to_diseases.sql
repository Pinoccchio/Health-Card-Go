-- Add custom_disease_name column to diseases table for "Other" disease type tracking
-- This allows Staff to enter custom disease names when selecting "Other" disease type

-- Add custom_disease_name column (nullable, only used when disease_type = 'other')
ALTER TABLE diseases
ADD COLUMN custom_disease_name TEXT;

-- Add comment explaining usage
COMMENT ON COLUMN diseases.custom_disease_name IS 'Custom disease name when disease_type is "other". Required if disease_type = other, null otherwise.';

-- Add check constraint to ensure custom_disease_name is provided when disease_type = 'other'
ALTER TABLE diseases
ADD CONSTRAINT check_custom_disease_name
CHECK (
  (disease_type = 'other' AND custom_disease_name IS NOT NULL AND TRIM(custom_disease_name) != '')
  OR
  (disease_type != 'other' AND custom_disease_name IS NULL)
);
