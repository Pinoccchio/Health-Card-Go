-- Migration: Add appointment uploads table and verification fields
-- Purpose: Support document upload and verification workflow for health card appointments
-- Created: 2026-01-19

-- ============================================================================
-- ENUMS: Define new enum types
-- ============================================================================

-- Lab location type (Inside vs Outside CHO)
CREATE TYPE lab_location_type AS ENUM ('inside_cho', 'outside_cho');

-- Verification status for uploaded documents
CREATE TYPE verification_status_type AS ENUM ('pending', 'approved', 'rejected');

-- Appointment stages for health card workflow
CREATE TYPE appointment_stage_type AS ENUM (
  'check_in',        -- Patient checks in
  'laboratory',      -- Patient goes to laboratory
  'results',         -- Lab results ready
  'checkup',         -- Doctor checkup
  'releasing'        -- Health card releasing
);

-- Health card type enum
CREATE TYPE health_card_type AS ENUM ('food_handler', 'non_food', 'pink');

-- File type for uploads
CREATE TYPE upload_file_type AS ENUM ('lab_request', 'payment_receipt', 'valid_id', 'other');

-- ============================================================================
-- TABLE: appointment_uploads
-- ============================================================================

CREATE TABLE appointment_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  file_type upload_file_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_size_bytes INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Full path in Supabase Storage
  uploaded_by_id UUID NOT NULL REFERENCES profiles(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  verified_by_id UUID REFERENCES profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_status verification_status_type DEFAULT 'pending',
  verification_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_appointment_uploads_appointment_id ON appointment_uploads(appointment_id);
CREATE INDEX idx_appointment_uploads_uploaded_by ON appointment_uploads(uploaded_by_id);
CREATE INDEX idx_appointment_uploads_verified_by ON appointment_uploads(verified_by_id);
CREATE INDEX idx_appointment_uploads_verification_status ON appointment_uploads(verification_status);

-- Add updated_at trigger
CREATE TRIGGER set_appointment_uploads_updated_at
  BEFORE UPDATE ON appointment_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ALTER: appointments table - Add new columns
-- ============================================================================

ALTER TABLE appointments
  ADD COLUMN verification_status verification_status_type DEFAULT 'pending',
  ADD COLUMN lab_location lab_location_type,
  ADD COLUMN appointment_stage appointment_stage_type,
  ADD COLUMN card_type health_card_type;

-- Add indexes for new columns
CREATE INDEX idx_appointments_verification_status ON appointments(verification_status);
CREATE INDEX idx_appointments_lab_location ON appointments(lab_location);
CREATE INDEX idx_appointments_appointment_stage ON appointments(appointment_stage);
CREATE INDEX idx_appointments_card_type ON appointments(card_type);

-- ============================================================================
-- ALTER: services table - Add new columns
-- ============================================================================

ALTER TABLE services
  ADD COLUMN card_type health_card_type,
  ADD COLUMN available_days TEXT[], -- Array of day names: ['Monday', 'Tuesday', etc.]
  ADD COLUMN lab_location_required BOOLEAN DEFAULT FALSE;

-- Add index for service queries
CREATE INDEX idx_services_card_type ON services(card_type);

-- ============================================================================
-- RLS POLICIES: appointment_uploads
-- ============================================================================

-- Enable RLS
ALTER TABLE appointment_uploads ENABLE ROW LEVEL SECURITY;

-- Super Admin: Full access to all uploads
CREATE POLICY "Super Admin can view all uploads"
  ON appointment_uploads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Healthcare Admin: Can view/verify uploads for their assigned service appointments
CREATE POLICY "Healthcare Admin can view uploads for their service"
  ON appointment_uploads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN appointments ON appointments.id = appointment_uploads.appointment_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_admin'
      AND profiles.assigned_service_id = appointments.service_id
    )
  );

CREATE POLICY "Healthcare Admin can update uploads for their service"
  ON appointment_uploads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      JOIN appointments ON appointments.id = appointment_uploads.appointment_id
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'healthcare_admin'
      AND profiles.assigned_service_id = appointments.service_id
    )
  );

-- Patient: Can view/upload own appointment documents
CREATE POLICY "Patient can view own uploads"
  ON appointment_uploads FOR SELECT
  TO authenticated
  USING (
    uploaded_by_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_uploads.appointment_id
      AND appointments.patient_id = auth.uid()
    )
  );

CREATE POLICY "Patient can insert own uploads"
  ON appointment_uploads FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_id
      AND appointments.patient_id = auth.uid()
    )
  );

-- Patient can delete their own uploads (before verification)
CREATE POLICY "Patient can delete unverified uploads"
  ON appointment_uploads FOR DELETE
  TO authenticated
  USING (
    uploaded_by_id = auth.uid()
    AND verification_status = 'pending'
  );

-- ============================================================================
-- FUNCTIONS: Helper functions
-- ============================================================================

-- Function to get card type requirements
CREATE OR REPLACE FUNCTION get_card_type_requirements(p_card_type health_card_type)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE p_card_type
    WHEN 'food_handler' THEN ARRAY['Urinalysis', 'Stool Test', 'CBC', 'Chest X-ray']
    WHEN 'non_food' THEN ARRAY['Urinalysis', 'Stool Test', 'CBC', 'Chest X-ray']
    WHEN 'pink' THEN ARRAY['Gram Stain', 'Hepatitis B', 'Syphilis', 'HIV Test']
    ELSE ARRAY[]::TEXT[]
  END;
END;
$$;

-- Function to get service available days
CREATE OR REPLACE FUNCTION get_service_available_days(p_service_id INTEGER)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_available_days TEXT[];
BEGIN
  SELECT available_days INTO v_available_days
  FROM services
  WHERE id = p_service_id;

  -- If no specific days set, return all weekdays
  IF v_available_days IS NULL OR array_length(v_available_days, 1) IS NULL THEN
    RETURN ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  END IF;

  RETURN v_available_days;
END;
$$;

-- ============================================================================
-- DATA UPDATES: Update existing services with new fields
-- ============================================================================

-- Service 12: Health Card Issuance & Renewal (consolidated)
-- Default to food_handler type, available Monday-Friday
UPDATE services
SET
  available_days = ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  lab_location_required = TRUE
WHERE id = 12;

-- Service 16: HIV Testing & Counseling
-- Available Monday, Wednesday, Friday
UPDATE services
SET
  available_days = ARRAY['Monday', 'Wednesday', 'Friday'],
  lab_location_required = FALSE
WHERE id = 16;

-- Service 17: Prenatal Checkup
-- Available Tuesday only
UPDATE services
SET
  available_days = ARRAY['Tuesday'],
  lab_location_required = FALSE
WHERE id = 17;

-- ============================================================================
-- COMMENTS: Add documentation
-- ============================================================================

COMMENT ON TABLE appointment_uploads IS 'Stores document uploads for health card appointments (lab requests, payment receipts, IDs)';
COMMENT ON COLUMN appointment_uploads.verification_status IS 'Document verification status: pending (default), approved, rejected';
COMMENT ON COLUMN appointment_uploads.lab_location IS 'For health card appointments: inside_cho or outside_cho';
COMMENT ON COLUMN appointment_uploads.appointment_stage IS 'Current stage in health card workflow: check_in, laboratory, results, checkup, releasing';
COMMENT ON COLUMN appointment_uploads.card_type IS 'Type of health card: food_handler (yellow), non_food (green), pink';

COMMENT ON COLUMN services.available_days IS 'Days when this service is available (e.g., [Monday, Wednesday, Friday])';
COMMENT ON COLUMN services.lab_location_required IS 'Whether this service requires lab location selection (Inside/Outside CHO)';
COMMENT ON COLUMN services.card_type IS 'For health card services: which card type this service issues';

-- ============================================================================
-- GRANTS: Ensure authenticated users can access functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_card_type_requirements TO authenticated;
GRANT EXECUTE ON FUNCTION get_service_available_days TO authenticated;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback this migration:
-- DROP TABLE appointment_uploads CASCADE;
-- ALTER TABLE appointments DROP COLUMN verification_status, DROP COLUMN lab_location, DROP COLUMN appointment_stage, DROP COLUMN card_type;
-- ALTER TABLE services DROP COLUMN card_type, DROP COLUMN available_days, DROP COLUMN lab_location_required;
-- DROP FUNCTION get_card_type_requirements;
-- DROP FUNCTION get_service_available_days;
-- DROP TYPE lab_location_type CASCADE;
-- DROP TYPE verification_status_type CASCADE;
-- DROP TYPE appointment_stage_type CASCADE;
-- DROP TYPE health_card_type CASCADE;
-- DROP TYPE upload_file_type CASCADE;
