-- ============================================================================
-- HealthCard Predictions Table Migration
-- ============================================================================
-- Purpose: Store SARIMA predictions for health card issuance forecasting
-- Features:
--   - Separate predictions for Food Handler vs Non-Food health cards
--   - Location-based forecasting (per barangay)
--   - Model accuracy metrics (MSE, RMSE, confidence intervals)
--   - Row-level security for service-based access control
--
-- Related Tables:
--   - services (12-15): Health card services
--   - barangays: Location reference
--   - appointments: Source of historical data
--
-- Author: HealthCardGo System
-- Date: December 30, 2025
-- ============================================================================

-- Create healthcard_predictions table
CREATE TABLE IF NOT EXISTS public.healthcard_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Classification
    healthcard_type TEXT NOT NULL CHECK (healthcard_type IN ('food_handler', 'non_food')),

    -- Location (nullable for system-wide predictions)
    barangay_id INTEGER REFERENCES public.barangays(id) ON DELETE SET NULL,

    -- Prediction data
    prediction_date DATE NOT NULL,
    predicted_cards INTEGER NOT NULL CHECK (predicted_cards >= 0),

    -- Model metrics
    confidence_level NUMERIC CHECK (confidence_level >= 0 AND confidence_level <= 1),
    model_version TEXT,

    -- Additional metadata (upper/lower bounds, RMSE, MAE, R², etc.)
    prediction_data JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Prevent duplicate predictions for same date/type/location
    UNIQUE (healthcard_type, barangay_id, prediction_date)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Index for date range queries (most common)
CREATE INDEX idx_healthcard_predictions_date
ON public.healthcard_predictions(prediction_date DESC);

-- Index for filtering by type
CREATE INDEX idx_healthcard_predictions_type
ON public.healthcard_predictions(healthcard_type);

-- Index for location-based queries
CREATE INDEX idx_healthcard_predictions_barangay
ON public.healthcard_predictions(barangay_id)
WHERE barangay_id IS NOT NULL;

-- Composite index for common query pattern (type + date)
CREATE INDEX idx_healthcard_predictions_type_date
ON public.healthcard_predictions(healthcard_type, prediction_date DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.healthcard_predictions ENABLE ROW LEVEL SECURITY;

-- Policy: Super Admins can view all predictions
CREATE POLICY "Super admins view all healthcard predictions"
ON public.healthcard_predictions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Policy: Healthcare Admins view predictions for their assigned service type
CREATE POLICY "Healthcare admins view service-specific predictions"
ON public.healthcard_predictions
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.services s ON p.assigned_service_id = s.id
        WHERE p.id = auth.uid()
          AND p.role = 'healthcare_admin'
          AND s.category = 'healthcard'
          AND (
              -- Food Handler services (12, 13) ’ food_handler predictions
              (s.id IN (12, 13) AND healthcard_type = 'food_handler')
              OR
              -- Non-Food services (14, 15) ’ non_food predictions
              (s.id IN (14, 15) AND healthcard_type = 'non_food')
          )
    )
);

-- Policy: Staff can view all predictions (for disease surveillance correlation)
CREATE POLICY "Staff view all healthcard predictions"
ON public.healthcard_predictions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'staff'
    )
);

-- ============================================================================
-- Insert/Update Policies (Admin-only operations)
-- ============================================================================

-- Policy: Super Admins can insert predictions
CREATE POLICY "Super admins insert healthcard predictions"
ON public.healthcard_predictions
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Policy: Super Admins can update predictions
CREATE POLICY "Super admins update healthcard predictions"
ON public.healthcard_predictions
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Policy: Super Admins can delete predictions
CREATE POLICY "Super admins delete healthcard predictions"
ON public.healthcard_predictions
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.healthcard_predictions IS
'SARIMA predictions for health card issuance forecasting. Supports Food Handler and Non-Food health card types with barangay-level granularity.';

COMMENT ON COLUMN public.healthcard_predictions.healthcard_type IS
'Type of health card: food_handler (Services 12, 13) or non_food (Services 14, 15)';

COMMENT ON COLUMN public.healthcard_predictions.barangay_id IS
'Location reference. NULL indicates system-wide prediction (all barangays combined).';

COMMENT ON COLUMN public.healthcard_predictions.prediction_date IS
'Date for which cards issued are predicted. Typically 1-30 days in the future.';

COMMENT ON COLUMN public.healthcard_predictions.predicted_cards IS
'Predicted number of health cards to be issued on this date.';

COMMENT ON COLUMN public.healthcard_predictions.confidence_level IS
'Model confidence (0-1 scale). Higher values indicate more reliable predictions. Typically 0.8-0.95 for good models.';

COMMENT ON COLUMN public.healthcard_predictions.model_version IS
'SARIMA model version identifier (e.g., "SARIMA(1,1,1)(1,1,1,7)", "v1.0.0"). Useful for tracking model improvements.';

COMMENT ON COLUMN public.healthcard_predictions.prediction_data IS
'JSONB metadata containing: upper_bound, lower_bound, mse, rmse, mae, r_squared, trend, seasonality_detected, notes.';

-- ============================================================================
-- Sample Prediction Data Insert (for testing)
-- ============================================================================

-- Uncomment to insert sample predictions:
-- INSERT INTO public.healthcard_predictions (
--     healthcard_type,
--     barangay_id,
--     prediction_date,
--     predicted_cards,
--     confidence_level,
--     model_version,
--     prediction_data
-- ) VALUES
-- (
--     'food_handler',
--     22, -- A.O. Floirendo
--     CURRENT_DATE + INTERVAL '1 day',
--     5,
--     0.85,
--     'SARIMA(1,1,1)(1,1,1,7)',
--     '{"upper_bound": 7, "lower_bound": 3, "rmse": 1.2, "r_squared": 0.78}'::jsonb
-- ),
-- (
--     'non_food',
--     25, -- Cacao
--     CURRENT_DATE + INTERVAL '1 day',
--     3,
--     0.82,
--     'SARIMA(1,1,1)(1,1,1,7)',
--     '{"upper_bound": 5, "lower_bound": 1, "rmse": 0.9, "r_squared": 0.72}'::jsonb
-- );

-- ============================================================================
-- End of Migration
-- ============================================================================
