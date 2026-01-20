-- =====================================================
-- Laboratory Fees Management System
-- =====================================================
-- This migration creates tables and policies for managing
-- laboratory request fees that can be modified by Super Admins
--
-- Created: 2026-01-21
-- =====================================================

-- =====================================================
-- 1. CREATE LAB_FEES TABLE
-- =====================================================
-- Stores current active laboratory fees for each health card type
-- Only one active fee per card_type at a time

CREATE TABLE IF NOT EXISTS lab_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_type TEXT NOT NULL CHECK (card_type IN ('food_handler', 'non_food', 'pink')),
  test_fee INTEGER NOT NULL CHECK (test_fee >= 0),
  card_fee INTEGER NOT NULL CHECK (card_fee >= 0),
  total_fee INTEGER GENERATED ALWAYS AS (test_fee + card_fee) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Ensure only one active fee per card type
  CONSTRAINT unique_active_fee_per_card UNIQUE(card_type) WHERE (is_active = true)
);

-- Add index for faster lookups
CREATE INDEX idx_lab_fees_card_type_active ON lab_fees(card_type, is_active) WHERE is_active = true;

-- Add comment
COMMENT ON TABLE lab_fees IS 'Stores laboratory fee pricing for health card services. Only one active fee per card type.';

-- =====================================================
-- 2. CREATE LAB_FEES_HISTORY TABLE
-- =====================================================
-- Audit trail for all fee changes

CREATE TABLE IF NOT EXISTS lab_fees_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_fee_id UUID REFERENCES lab_fees(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL,
  old_test_fee INTEGER,
  new_test_fee INTEGER,
  old_card_fee INTEGER,
  new_card_fee INTEGER,
  old_total_fee INTEGER,
  new_total_fee INTEGER,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_reason TEXT,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deactivated'))
);

-- Add index for history queries
CREATE INDEX idx_lab_fees_history_lab_fee_id ON lab_fees_history(lab_fee_id);
CREATE INDEX idx_lab_fees_history_changed_at ON lab_fees_history(changed_at DESC);

-- Add comment
COMMENT ON TABLE lab_fees_history IS 'Audit trail for all laboratory fee changes. Tracks who changed what and when.';

-- =====================================================
-- 3. CREATE TRIGGER FOR AUTOMATIC HISTORY TRACKING
-- =====================================================

-- Function to log fee changes to history
CREATE OR REPLACE FUNCTION log_lab_fee_change()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT (new fee created)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lab_fees_history (
      lab_fee_id,
      card_type,
      old_test_fee,
      new_test_fee,
      old_card_fee,
      new_card_fee,
      old_total_fee,
      new_total_fee,
      changed_by,
      action
    ) VALUES (
      NEW.id,
      NEW.card_type,
      NULL,
      NEW.test_fee,
      NULL,
      NEW.card_fee,
      NULL,
      NEW.total_fee,
      NEW.updated_by,
      'created'
    );
    RETURN NEW;
  END IF;

  -- On UPDATE (fee modified)
  IF TG_OP = 'UPDATE' THEN
    -- Only log if fees actually changed or if deactivated
    IF OLD.test_fee != NEW.test_fee OR
       OLD.card_fee != NEW.card_fee OR
       OLD.is_active != NEW.is_active THEN

      INSERT INTO lab_fees_history (
        lab_fee_id,
        card_type,
        old_test_fee,
        new_test_fee,
        old_card_fee,
        new_card_fee,
        old_total_fee,
        new_total_fee,
        changed_by,
        action
      ) VALUES (
        NEW.id,
        NEW.card_type,
        OLD.test_fee,
        NEW.test_fee,
        OLD.card_fee,
        NEW.card_fee,
        OLD.total_fee,
        NEW.total_fee,
        NEW.updated_by,
        CASE
          WHEN NEW.is_active = false THEN 'deactivated'
          ELSE 'updated'
        END
      );
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on lab_fees table
CREATE TRIGGER trigger_log_lab_fee_change
  AFTER INSERT OR UPDATE ON lab_fees
  FOR EACH ROW
  EXECUTE FUNCTION log_lab_fee_change();

-- =====================================================
-- 4. CREATE FUNCTION TO UPDATE FEES
-- =====================================================
-- Function to safely update lab fees (deactivates old, creates new)

CREATE OR REPLACE FUNCTION update_lab_fee(
  p_card_type TEXT,
  p_test_fee INTEGER,
  p_card_fee INTEGER,
  p_updated_by UUID,
  p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_fee_id UUID;
BEGIN
  -- Validate inputs
  IF p_card_type NOT IN ('food_handler', 'non_food', 'pink') THEN
    RAISE EXCEPTION 'Invalid card_type. Must be food_handler, non_food, or pink';
  END IF;

  IF p_test_fee < 0 OR p_card_fee < 0 THEN
    RAISE EXCEPTION 'Fees cannot be negative';
  END IF;

  -- Deactivate current active fee for this card type
  UPDATE lab_fees
  SET is_active = false,
      updated_at = NOW(),
      updated_by = p_updated_by
  WHERE card_type = p_card_type
    AND is_active = true;

  -- Create new active fee
  INSERT INTO lab_fees (
    card_type,
    test_fee,
    card_fee,
    is_active,
    updated_by
  ) VALUES (
    p_card_type,
    p_test_fee,
    p_card_fee,
    true,
    p_updated_by
  ) RETURNING id INTO v_new_fee_id;

  -- Update history with reason if provided
  IF p_change_reason IS NOT NULL THEN
    UPDATE lab_fees_history
    SET change_reason = p_change_reason
    WHERE lab_fee_id = v_new_fee_id
      AND changed_at = (SELECT MAX(changed_at) FROM lab_fees_history WHERE lab_fee_id = v_new_fee_id);
  END IF;

  RETURN v_new_fee_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION update_lab_fee IS 'Safely updates laboratory fees by deactivating old and creating new record. Maintains history.';

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE lab_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_fees_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE RLS POLICIES
-- =====================================================

-- Lab Fees Policies
-- Super Admin: Full access
CREATE POLICY "Super admins have full access to lab_fees"
  ON lab_fees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

-- Everyone: Read access to active fees only
CREATE POLICY "Everyone can view active lab fees"
  ON lab_fees
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Lab Fees History Policies
-- Super Admin: Full access to history
CREATE POLICY "Super admins can view all lab fee history"
  ON lab_fees_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

-- =====================================================
-- 7. SEED INITIAL DATA
-- =====================================================
-- Insert current hardcoded prices as initial database records

-- Get super admin user ID for initial seed (use first super admin found)
DO $$
DECLARE
  v_super_admin_id UUID;
BEGIN
  -- Find first super admin
  SELECT id INTO v_super_admin_id
  FROM profiles
  WHERE role = 'super_admin'
  LIMIT 1;

  -- Insert initial lab fees (matching current hardcoded values)

  -- Food Handler (Yellow Card): ₱100 tests + ₱70 card = ₱170
  INSERT INTO lab_fees (card_type, test_fee, card_fee, is_active, updated_by)
  VALUES ('food_handler', 100, 70, true, v_super_admin_id)
  ON CONFLICT (card_type) WHERE is_active = true DO NOTHING;

  -- Non-Food Handler (Green Card): ₱100 tests + ₱70 card = ₱170
  INSERT INTO lab_fees (card_type, test_fee, card_fee, is_active, updated_by)
  VALUES ('non_food', 100, 70, true, v_super_admin_id)
  ON CONFLICT (card_type) WHERE is_active = true DO NOTHING;

  -- Pink Card: ₱60 smearing + ₱100 card = ₱160
  INSERT INTO lab_fees (card_type, test_fee, card_fee, is_active, updated_by)
  VALUES ('pink', 60, 100, true, v_super_admin_id)
  ON CONFLICT (card_type) WHERE is_active = true DO NOTHING;

  RAISE NOTICE 'Initial lab fees seeded successfully';
END $$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION update_lab_fee TO authenticated;
GRANT EXECUTE ON FUNCTION log_lab_fee_change TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created: lab_fees, lab_fees_history
-- Triggers created: trigger_log_lab_fee_change
-- Functions created: update_lab_fee, log_lab_fee_change
-- Policies created: RLS enabled with super_admin full access
-- Initial data: Seeded current pricing (Yellow: ₱170, Green: ₱170, Pink: ₱160)
-- =====================================================
