-- ============================================================================
-- Add Pink Card Support to HealthCard Analytics System
-- ============================================================================
-- Purpose: Extend healthcard_statistics and healthcard_predictions tables
--          to support Pink Card (Service/Clinical) in addition to Yellow and Green
--
-- Changes:
--   - Update healthcard_statistics CHECK constraint to include 'pink'
--   - Update healthcard_predictions CHECK constraint to include 'pink'
--   - Update RLS policies for Pink Card access
--   - Update table comments to reflect 3 card types
--
-- Card Types:
--   - food_handler: Yellow Card - General Health Card (Services 12, 13)
--   - non_food: Green Card - General Health Card (Services 14, 15)
--   - pink: Pink Card - Service/Clinical (Service 12 with card_type='pink')
--
-- Date: January 20, 2026
-- ============================================================================

-- ============================================================================
-- Step 1: Update healthcard_statistics table
-- ============================================================================

-- Drop existing CHECK constraint on healthcard_type
ALTER TABLE healthcard_statistics
DROP CONSTRAINT IF EXISTS healthcard_statistics_healthcard_type_check;

-- Re-create constraint with 'pink' included
ALTER TABLE healthcard_statistics
ADD CONSTRAINT healthcard_statistics_healthcard_type_check
CHECK (healthcard_type IN ('food_handler', 'non_food', 'pink'));

-- Update table comment
COMMENT ON TABLE healthcard_statistics IS
'Aggregate historical health card issuance data for bulk imports and SARIMA model training. Supports Yellow Card (food_handler), Green Card (non_food), and Pink Card (pink).';

-- Update column comment
COMMENT ON COLUMN healthcard_statistics.healthcard_type IS
'Type of health card: food_handler (Yellow - General), non_food (Green - General), or pink (Pink - Service/Clinical)';

-- ============================================================================
-- Step 2: Update healthcard_predictions table
-- ============================================================================

-- Drop existing CHECK constraint on healthcard_type
ALTER TABLE healthcard_predictions
DROP CONSTRAINT IF EXISTS healthcard_predictions_healthcard_type_check;

-- Re-create constraint with 'pink' included
ALTER TABLE healthcard_predictions
ADD CONSTRAINT healthcard_predictions_healthcard_type_check
CHECK (healthcard_type IN ('food_handler', 'non_food', 'pink'));

-- Update table comment
COMMENT ON TABLE healthcard_predictions IS
'SARIMA predictions for health card issuance forecasting. Supports Yellow Card (food_handler), Green Card (non_food), and Pink Card (pink) with barangay-level granularity.';

-- Update column comment
COMMENT ON COLUMN healthcard_predictions.healthcard_type IS
'Type of health card: food_handler (Yellow - Services 12, 13), non_food (Green - Services 14, 15), or pink (Pink - Service 12 with card_type=pink)';

-- ============================================================================
-- Step 3: Update RLS Policies for Pink Card
-- ============================================================================

-- Drop existing Healthcare Admin policy that hardcodes services 12-15
DROP POLICY IF EXISTS "Healthcare admins view service-specific predictions" ON healthcard_predictions;

-- Re-create policy with Pink Card support
-- Pink Card uses Service 12 with card_type='pink' differentiation at appointment level
CREATE POLICY "Healthcare admins view service-specific predictions"
ON healthcard_predictions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM profiles p
        JOIN services s ON p.assigned_service_id = s.id
        WHERE p.id = auth.uid()
          AND p.role = 'healthcare_admin'
          AND s.category = 'healthcard'
          AND (
              -- Food Handler Yellow Card services (12, 13) → food_handler predictions
              (s.id IN (12, 13) AND healthcard_type = 'food_handler')
              OR
              -- Non-Food Green Card services (14, 15) → non_food predictions
              (s.id IN (14, 15) AND healthcard_type = 'non_food')
              OR
              -- Pink Card Service (12 with card_type='pink') → pink predictions
              (s.id = 12 AND healthcard_type = 'pink')
          )
    )
);

-- ============================================================================
-- Step 4: Add indexes for Pink Card queries (optional optimization)
-- ============================================================================

-- Indexes already exist from previous migrations:
-- - idx_healthcard_statistics_type_date (covers all 3 types)
-- - idx_healthcard_predictions_type_date (covers all 3 types)

-- ============================================================================
-- Verification Queries (for testing)
-- ============================================================================

-- Uncomment to verify constraints:
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'healthcard_statistics'::regclass AND conname LIKE '%healthcard_type%';

-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'healthcard_predictions'::regclass AND conname LIKE '%healthcard_type%';

-- ============================================================================
-- End of Migration
-- ============================================================================
