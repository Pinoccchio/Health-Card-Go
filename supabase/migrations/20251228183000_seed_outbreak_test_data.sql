-- Migration: Seed Realistic Outbreak Test Data
-- Created: 2025-12-28 18:30:00
-- Purpose: Insert realistic disease case data to trigger outbreak detection thresholds for testing

-- NOTE: This migration uses synthetic data for testing outbreak detection.
-- In production, consider removing or modifying based on actual needs.

-- Get patient IDs for linking (using existing patients)
-- We'll use the first 20 patients to distribute cases across barangays

-- ==========================================================
-- DENGUE OUTBREAK DATA (10 cases in last 7 days)
-- Threshold: 10+ cases in 7 days for outbreak
-- ==========================================================

-- Insert 10 Dengue cases spread across last 7 days
-- 3 critical, 4 severe, 3 moderate severity
-- Different barangays to simulate spread

INSERT INTO diseases (
  patient_id,
  barangay_id,
  disease_type,
  diagnosis_date,
  severity,
  status,
  created_at
)
SELECT
  p.id as patient_id,
  p.barangay_id,
  'dengue' as disease_type,
  (CURRENT_DATE - (row_number() over () % 7)::integer) as diagnosis_date,
  CASE
    WHEN row_number() over () <= 3 THEN 'critical'
    WHEN row_number() over () <= 7 THEN 'severe'
    ELSE 'moderate'
  END as severity,
  'active' as status,
  NOW() as created_at
FROM (
  SELECT DISTINCT ON (barangay_id) id, barangay_id
  FROM profiles
  WHERE role_id = 4
    AND status = 'active'
  ORDER BY barangay_id, RANDOM()
  LIMIT 10
) p;

-- ==========================================================
-- HIV/AIDS DATA (3 cases in last 30 days)
-- Threshold: 3+ cases in 30 days for outbreak
-- ==========================================================

INSERT INTO diseases (
  patient_id,
  barangay_id,
  disease_type,
  diagnosis_date,
  severity,
  status,
  created_at
)
SELECT
  p.id as patient_id,
  p.barangay_id,
  'hiv_aids' as disease_type,
  (CURRENT_DATE - (row_number() over () * 10)::integer) as diagnosis_date,
  CASE
    WHEN row_number() over () = 1 THEN 'severe'
    ELSE 'moderate'
  END as severity,
  'active' as status,
  NOW() as created_at
FROM (
  SELECT DISTINCT ON (barangay_id) id, barangay_id
  FROM profiles
  WHERE role_id = 4
    AND status = 'active'
    AND id NOT IN (
      SELECT patient_id FROM diseases WHERE disease_type = 'dengue'
    )
  ORDER BY barangay_id, RANDOM()
  LIMIT 3
) p;

-- ==========================================================
-- MEASLES DATA (2 cases in last 7 days)
-- Threshold: 2+ cases in 7 days for outbreak
-- ==========================================================

INSERT INTO diseases (
  patient_id,
  barangay_id,
  disease_type,
  diagnosis_date,
  severity,
  status,
  created_at
)
SELECT
  p.id as patient_id,
  p.barangay_id,
  'measles' as disease_type,
  (CURRENT_DATE - (row_number() over () * 3)::integer) as diagnosis_date,
  'moderate' as severity,
  'active' as status,
  NOW() as created_at
FROM (
  SELECT DISTINCT ON (barangay_id) id, barangay_id
  FROM profiles
  WHERE role_id = 4
    AND status = 'active'
    AND id NOT IN (
      SELECT patient_id FROM diseases WHERE disease_type IN ('dengue', 'hiv_aids')
    )
  ORDER BY barangay_id, RANDOM()
  LIMIT 2
) p;

-- ==========================================================
-- RABIES DATA (1 case in last 3 days)
-- Threshold: 1+ case in 7 days for immediate alert
-- ==========================================================

INSERT INTO diseases (
  patient_id,
  barangay_id,
  disease_type,
  diagnosis_date,
  severity,
  status,
  created_at
)
SELECT
  p.id as patient_id,
  p.barangay_id,
  'rabies' as disease_type,
  (CURRENT_DATE - 2) as diagnosis_date,
  'severe' as severity,
  'active' as status,
  NOW() as created_at
FROM (
  SELECT DISTINCT ON (barangay_id) id, barangay_id
  FROM profiles
  WHERE role_id = 4
    AND status = 'active'
    AND id NOT IN (
      SELECT patient_id FROM diseases WHERE disease_type IN ('dengue', 'hiv_aids', 'measles')
    )
  ORDER BY barangay_id, RANDOM()
  LIMIT 1
) p;

-- ==========================================================
-- VERIFICATION QUERY (run this to check seeded data)
-- ==========================================================

-- Count active cases by disease type and time window
DO $$
BEGIN
  RAISE NOTICE '========== OUTBREAK TEST DATA SEEDED ==========';
  RAISE NOTICE 'Dengue cases (last 7 days): %', (
    SELECT COUNT(*) FROM diseases
    WHERE disease_type = 'dengue'
    AND status = 'active'
    AND diagnosis_date >= CURRENT_DATE - 7
  );
  RAISE NOTICE 'HIV/AIDS cases (last 30 days): %', (
    SELECT COUNT(*) FROM diseases
    WHERE disease_type = 'hiv_aids'
    AND status = 'active'
    AND diagnosis_date >= CURRENT_DATE - 30
  );
  RAISE NOTICE 'Measles cases (last 7 days): %', (
    SELECT COUNT(*) FROM diseases
    WHERE disease_type = 'measles'
    AND status = 'active'
    AND diagnosis_date >= CURRENT_DATE - 7
  );
  RAISE NOTICE 'Rabies cases (last 7 days): %', (
    SELECT COUNT(*) FROM diseases
    WHERE disease_type = 'rabies'
    AND status = 'active'
    AND diagnosis_date >= CURRENT_DATE - 7
  );
  RAISE NOTICE '===============================================';
END $$;
