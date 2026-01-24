-- Migration: Create Database Function and Trigger for Automatic Severity Calculation
-- Date: 2026-01-25
-- Purpose: Auto-calculate severity for disease_statistics records using formula:
--          (case_count / barangay_population) × 100
--          High risk (critical): ≥70%
--          Medium risk (severe): 50-69%
--          Low risk (moderate): <50%

-- =============================================================================
-- STEP 1: Create PostgreSQL Function to Calculate Severity
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_disease_severity(
  p_case_count INTEGER,
  p_barangay_id INTEGER
)
RETURNS TEXT AS $$
DECLARE
  v_population INTEGER;
  v_percentage NUMERIC;
BEGIN
  -- Handle NULL case_count
  IF p_case_count IS NULL OR p_case_count <= 0 THEN
    RETURN 'moderate';
  END IF;

  -- Handle NULL barangay_id
  IF p_barangay_id IS NULL THEN
    RETURN 'moderate';
  END IF;

  -- Fetch barangay population
  SELECT population INTO v_population
  FROM barangays
  WHERE id = p_barangay_id;

  -- Handle missing barangay or NULL population
  IF v_population IS NULL OR v_population <= 0 THEN
    RETURN 'moderate';
  END IF;

  -- Calculate percentage: (case_count / population) × 100
  v_percentage := (p_case_count::NUMERIC / v_population::NUMERIC) * 100;

  -- Apply thresholds
  IF v_percentage >= 70 THEN
    RETURN 'critical';  -- High risk
  ELSIF v_percentage >= 50 THEN
    RETURN 'severe';    -- Medium risk
  ELSE
    RETURN 'moderate';  -- Low risk
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment to function
COMMENT ON FUNCTION calculate_disease_severity(INTEGER, INTEGER) IS
'Calculates disease severity based on formula: (case_count / barangay_population) × 100. Returns critical (≥70%), severe (50-69%), or moderate (<50%).';

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_disease_severity(INTEGER, INTEGER) TO authenticated;

-- =============================================================================
-- STEP 2: Create Trigger Function to Auto-Set Severity
-- =============================================================================

CREATE OR REPLACE FUNCTION set_disease_statistics_severity()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate severity before insert or update
  NEW.severity := calculate_disease_severity(NEW.case_count, NEW.barangay_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment to trigger function
COMMENT ON FUNCTION set_disease_statistics_severity() IS
'Trigger function that automatically calculates and sets severity field for disease_statistics records.';

-- =============================================================================
-- STEP 3: Create BEFORE INSERT/UPDATE Trigger
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_set_disease_statistics_severity ON disease_statistics;

CREATE TRIGGER trigger_set_disease_statistics_severity
  BEFORE INSERT OR UPDATE OF case_count, barangay_id
  ON disease_statistics
  FOR EACH ROW
  EXECUTE FUNCTION set_disease_statistics_severity();

-- Add comment to trigger
COMMENT ON TRIGGER trigger_set_disease_statistics_severity ON disease_statistics IS
'Automatically calculates severity when inserting or updating case_count or barangay_id.';

-- =============================================================================
-- STEP 4: Backfill Existing Records with Correct Severity
-- =============================================================================

-- Update all existing records to calculate their severity
UPDATE disease_statistics
SET severity = calculate_disease_severity(case_count, barangay_id);

-- =============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- =============================================================================

-- Verify function works correctly
-- SELECT
--   'Katualan (pop 611) + 450 cases' AS scenario,
--   calculate_disease_severity(450, (SELECT id FROM barangays WHERE name = 'Katualan')) AS severity,
--   'Expected: critical (73.6%)' AS expected;

-- SELECT
--   'Katualan (pop 611) + 350 cases' AS scenario,
--   calculate_disease_severity(350, (SELECT id FROM barangays WHERE name = 'Katualan')) AS severity,
--   'Expected: severe (57.3%)' AS expected;

-- SELECT
--   'Gredu (pop 17084) + 500 cases' AS scenario,
--   calculate_disease_severity(500, (SELECT id FROM barangays WHERE name = 'Gredu (Poblacion)')) AS severity,
--   'Expected: moderate (2.9%)' AS expected;

-- Check severity distribution after backfill
-- SELECT
--   severity,
--   COUNT(*) AS record_count,
--   ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER ()), 2) AS percentage
-- FROM disease_statistics
-- GROUP BY severity
-- ORDER BY
--   CASE severity
--     WHEN 'critical' THEN 1
--     WHEN 'severe' THEN 2
--     WHEN 'moderate' THEN 3
--   END;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
