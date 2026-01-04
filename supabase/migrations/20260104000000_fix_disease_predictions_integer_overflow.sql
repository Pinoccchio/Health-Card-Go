-- Migration: Fix disease_predictions integer overflow
-- Changes INTEGER columns to NUMERIC to prevent prediction explosion errors
-- Adds constraints to prevent unrealistic values

-- Step 1: Add temporary NUMERIC columns
ALTER TABLE disease_predictions
  ADD COLUMN predicted_cases_new NUMERIC,
  ADD COLUMN confidence_upper_new NUMERIC,
  ADD COLUMN confidence_lower_new NUMERIC;

-- Step 2: Copy existing data with type conversion
-- Fill NULL confidence bounds with reasonable defaults
UPDATE disease_predictions
  SET predicted_cases_new = predicted_cases::NUMERIC,
      confidence_upper_new = COALESCE(confidence_upper::NUMERIC, predicted_cases::NUMERIC * 1.5),
      confidence_lower_new = COALESCE(confidence_lower::NUMERIC, predicted_cases::NUMERIC * 0.5);

-- Step 3: Drop old INTEGER columns
ALTER TABLE disease_predictions
  DROP COLUMN predicted_cases,
  DROP COLUMN confidence_upper,
  DROP COLUMN confidence_lower;

-- Step 4: Rename new columns to original names
ALTER TABLE disease_predictions
  RENAME COLUMN predicted_cases_new TO predicted_cases;
ALTER TABLE disease_predictions
  RENAME COLUMN confidence_upper_new TO confidence_upper;
ALTER TABLE disease_predictions
  RENAME COLUMN confidence_lower_new TO confidence_lower;

-- Step 5: Add NOT NULL constraints
ALTER TABLE disease_predictions
  ALTER COLUMN predicted_cases SET NOT NULL,
  ALTER COLUMN confidence_upper SET NOT NULL,
  ALTER COLUMN confidence_lower SET NOT NULL;

-- Step 6: Add validation constraints to prevent future explosions
ALTER TABLE disease_predictions
  ADD CONSTRAINT predicted_cases_reasonable
    CHECK (predicted_cases >= 0 AND predicted_cases < 1000000),
  ADD CONSTRAINT confidence_bounds_reasonable
    CHECK (confidence_upper >= confidence_lower AND confidence_upper < 1000000),
  ADD CONSTRAINT confidence_lower_non_negative
    CHECK (confidence_lower >= 0);

-- Step 7: Add helpful comments
COMMENT ON COLUMN disease_predictions.predicted_cases IS
  'Predicted disease cases (NUMERIC to handle SARIMA validation clamping and prevent overflow)';
COMMENT ON COLUMN disease_predictions.confidence_upper IS
  'Upper bound of 95% confidence interval (NUMERIC to prevent overflow)';
COMMENT ON COLUMN disease_predictions.confidence_lower IS
  'Lower bound of 95% confidence interval (NUMERIC to prevent overflow)';
