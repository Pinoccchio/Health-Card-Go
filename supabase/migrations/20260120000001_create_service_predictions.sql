-- Migration: Create service_predictions table for caching SARIMA predictions
-- Purpose: Store pre-generated appointment forecasts for HIV, Pregnancy, and other services
-- Date: 2026-01-20

-- ============================================================================
-- CREATE TABLE: service_predictions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_predictions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  service_id INTEGER NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  barangay_id INTEGER REFERENCES public.barangays(id) ON DELETE CASCADE,

  -- Prediction data
  prediction_date DATE NOT NULL,
  predicted_appointments INTEGER NOT NULL CHECK (predicted_appointments >= 0),
  confidence_level NUMERIC CHECK (confidence_level >= 0 AND confidence_level <= 1),

  -- Model metadata
  model_version TEXT,
  prediction_data JSONB, -- Stores: upper_bound, lower_bound, accuracy_metrics

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Unique constraint: One prediction per service per date per barangay
  UNIQUE(service_id, prediction_date, barangay_id)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Primary lookup index (service + date + barangay)
CREATE INDEX IF NOT EXISTS idx_service_predictions_lookup
  ON public.service_predictions(service_id, prediction_date, barangay_id);

-- Service-only lookup (for system-wide predictions)
CREATE INDEX IF NOT EXISTS idx_service_predictions_service
  ON public.service_predictions(service_id, prediction_date)
  WHERE barangay_id IS NULL;

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_service_predictions_date_range
  ON public.service_predictions(service_id, prediction_date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.service_predictions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Super Admins can view all predictions
CREATE POLICY "super_admins_view_all_service_predictions"
  ON public.service_predictions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policy 2: Healthcare Admins can view predictions for their assigned service
CREATE POLICY "healthcare_admins_view_assigned_service_predictions"
  ON public.service_predictions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_admin'
      AND profiles.assigned_service_id = service_predictions.service_id
    )
  );

-- Policy 3: Super Admins can insert predictions for any service
CREATE POLICY "super_admins_insert_all_service_predictions"
  ON public.service_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policy 4: Healthcare Admins can insert predictions for their assigned service
CREATE POLICY "healthcare_admins_insert_assigned_service_predictions"
  ON public.service_predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_admin'
      AND profiles.assigned_service_id = service_predictions.service_id
    )
  );

-- Policy 5: Super Admins can delete predictions for any service
CREATE POLICY "super_admins_delete_all_service_predictions"
  ON public.service_predictions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policy 6: Healthcare Admins can delete predictions for their assigned service
CREATE POLICY "healthcare_admins_delete_assigned_service_predictions"
  ON public.service_predictions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_admin'
      AND profiles.assigned_service_id = service_predictions.service_id
    )
  );

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON TABLE public.service_predictions IS
  'Stores pre-generated SARIMA predictions for service appointment demand. Used by HIV (16), Pregnancy (17), and other services to cache forecasts for faster chart loading.';

COMMENT ON COLUMN public.service_predictions.service_id IS
  'Foreign key to services table. Identifies which service these predictions are for (e.g., 16 for HIV, 17 for Pregnancy).';

COMMENT ON COLUMN public.service_predictions.barangay_id IS
  'Optional barangay filter. NULL means system-wide predictions across all barangays.';

COMMENT ON COLUMN public.service_predictions.predicted_appointments IS
  'Predicted number of appointments for this service on this date.';

COMMENT ON COLUMN public.service_predictions.prediction_data IS
  'JSONB field storing: upper_bound, lower_bound (95% confidence interval), accuracy metrics (R², RMSE, MAE, MAPE), trend, seasonality_detected, data_quality.';

COMMENT ON COLUMN public.service_predictions.generated_by_id IS
  'User ID who generated these predictions (Super Admin or Healthcare Admin).';
