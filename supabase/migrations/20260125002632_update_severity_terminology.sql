-- Migration: Update Severity Terminology from Critical/Severe/Moderate to High Risk/Medium Risk/Low Risk
-- Date: 2026-01-25
-- Purpose: Align database terminology with user's risk indicators:
--          High Risk: ≥70%
--          Medium Risk: 50-69%
--          Low Risk: <50%

-- =============================================================================
-- STEP 1: Update Database Function to Return New Terminology
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
    RETURN 'low_risk';
  END IF;

  -- Handle NULL barangay_id
  IF p_barangay_id IS NULL THEN
    RETURN 'low_risk';
  END IF;

  -- Fetch barangay population
  SELECT population INTO v_population
  FROM barangays
  WHERE id = p_barangay_id;

  -- Handle missing barangay or NULL population
  IF v_population IS NULL OR v_population <= 0 THEN
    RETURN 'low_risk';
  END IF;

  -- Calculate percentage: (case_count / population) × 100
  v_percentage := (p_case_count::NUMERIC / v_population::NUMERIC) * 100;

  -- Apply thresholds
  IF v_percentage >= 70 THEN
    RETURN 'high_risk';    -- High risk (≥70%)
  ELSIF v_percentage >= 50 THEN
    RETURN 'medium_risk';  -- Medium risk (50-69%)
  ELSE
    RETURN 'low_risk';     -- Low risk (<50%)
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Update function comment
COMMENT ON FUNCTION calculate_disease_severity(INTEGER, INTEGER) IS
'Calculates disease severity based on formula: (case_count / barangay_population) × 100. Returns high_risk (≥70%), medium_risk (50-69%), or low_risk (<50%).';

-- =============================================================================
-- STEP 2: Update Existing Records with New Terminology
-- =============================================================================

-- Update disease_statistics table records
UPDATE disease_statistics
SET severity = CASE severity
  WHEN 'critical' THEN 'high_risk'
  WHEN 'severe' THEN 'medium_risk'
  WHEN 'moderate' THEN 'low_risk'
  ELSE severity  -- Keep as-is if already using new terminology
END
WHERE severity IN ('critical', 'severe', 'moderate');

-- Update diseases table records (if severity column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'diseases'
    AND column_name = 'severity'
  ) THEN
    EXECUTE '
      UPDATE diseases
      SET severity = CASE severity
        WHEN ''critical'' THEN ''high_risk''
        WHEN ''severe'' THEN ''medium_risk''
        WHEN ''moderate'' THEN ''low_risk''
        ELSE severity
      END
      WHERE severity IN (''critical'', ''severe'', ''moderate'')
    ';
  END IF;
END $$;

-- =============================================================================
-- VERIFICATION QUERIES (commented out - for manual testing)
-- =============================================================================

-- Verify function returns correct values
-- SELECT
--   'Test 1: Katualan 450 cases' AS test,
--   calculate_disease_severity(450, (SELECT id FROM barangays WHERE name = 'Katualan')) AS result,
--   'Expected: high_risk' AS expected;

-- SELECT
--   'Test 2: Katualan 350 cases' AS test,
--   calculate_disease_severity(350, (SELECT id FROM barangays WHERE name = 'Katualan')) AS result,
--   'Expected: medium_risk' AS expected;

-- SELECT
--   'Test 3: Gredu 500 cases' AS test,
--   calculate_disease_severity(500, (SELECT id FROM barangays WHERE name = 'Gredu (Poblacion)')) AS result,
--   'Expected: low_risk' AS expected;

-- Check updated severity distribution
-- SELECT
--   severity,
--   COUNT(*) AS record_count
-- FROM disease_statistics
-- GROUP BY severity
-- ORDER BY
--   CASE severity
--     WHEN 'high_risk' THEN 1
--     WHEN 'medium_risk' THEN 2
--     WHEN 'low_risk' THEN 3
--   END;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
