-- Migration: Add Health Card Expiration System
-- Purpose: Automatically track health card expiration based on appointment completion dates
-- Business Rule: Health cards expire 1 year after appointment completion

-- ============================================
-- Step 1: Add 'expired' to user_status enum
-- ============================================
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'expired';

-- ============================================
-- Step 2: Create function to calculate expiry date
-- ============================================
CREATE OR REPLACE FUNCTION calculate_health_card_expiry_date(p_patient_id UUID)
RETURNS DATE
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_completed_at TIMESTAMP WITH TIME ZONE;
    v_expiry_date DATE;
BEGIN
    -- Get the most recent completed appointment for this patient
    SELECT completed_at INTO v_completed_at
    FROM appointments
    WHERE patient_id = p_patient_id
      AND status = 'completed'
      AND completed_at IS NOT NULL
    ORDER BY completed_at DESC
    LIMIT 1;

    -- If no completed appointment found, return NULL
    IF v_completed_at IS NULL THEN
        RETURN NULL;
    END IF;

    -- Calculate expiry date: completed_at + 1 year
    v_expiry_date := (v_completed_at + INTERVAL '1 year')::DATE;

    RETURN v_expiry_date;
END;
$$;

-- ============================================
-- Step 3: Create function to check if health card is expired
-- ============================================
CREATE OR REPLACE FUNCTION is_health_card_expired(p_expiry_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_expiry_date IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN CURRENT_DATE > p_expiry_date;
END;
$$;

-- ============================================
-- Step 4: Create trigger function to auto-set expiry_date
-- ============================================
CREATE OR REPLACE FUNCTION set_health_card_expiry_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expiry_date DATE;
BEGIN
    -- Calculate expiry date based on patient's completed appointments
    v_expiry_date := calculate_health_card_expiry_date(NEW.patient_id);

    -- Set the expiry_date
    NEW.expiry_date := v_expiry_date;

    RETURN NEW;
END;
$$;

-- ============================================
-- Step 5: Create trigger on health_cards INSERT
-- ============================================
DROP TRIGGER IF EXISTS trigger_set_health_card_expiry_date ON health_cards;
CREATE TRIGGER trigger_set_health_card_expiry_date
    BEFORE INSERT ON health_cards
    FOR EACH ROW
    EXECUTE FUNCTION set_health_card_expiry_date();

-- ============================================
-- Step 6: Update existing health cards with expiry dates
-- ============================================
UPDATE health_cards hc
SET expiry_date = calculate_health_card_expiry_date(hc.patient_id)
WHERE expiry_date IS NULL;

-- ============================================
-- Step 7: Update is_active based on expiry_date
-- ============================================
UPDATE health_cards
SET is_active = FALSE
WHERE expiry_date IS NOT NULL
  AND CURRENT_DATE > expiry_date
  AND is_active = TRUE;

-- ============================================
-- Step 8: Create index on expiry_date for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_health_cards_expiry_date ON health_cards(expiry_date);
CREATE INDEX IF NOT EXISTS idx_health_cards_is_active ON health_cards(is_active);

-- ============================================
-- Step 9: Create view for health card status
-- ============================================
CREATE OR REPLACE VIEW health_cards_with_status AS
SELECT
    hc.*,
    CASE
        WHEN hc.expiry_date IS NULL THEN 'pending'
        WHEN CURRENT_DATE > hc.expiry_date THEN 'expired'
        WHEN CURRENT_DATE > (hc.expiry_date - INTERVAL '30 days')::DATE THEN 'expiring_soon'
        ELSE 'active'
    END AS card_status,
    CASE
        WHEN hc.expiry_date IS NULL THEN NULL
        ELSE (hc.expiry_date - CURRENT_DATE)
    END AS days_remaining
FROM health_cards hc;

-- ============================================
-- Step 10: Grant permissions
-- ============================================
GRANT SELECT ON health_cards_with_status TO authenticated;

-- ============================================
-- Step 11: Add comments for documentation
-- ============================================
COMMENT ON FUNCTION calculate_health_card_expiry_date IS
    'Calculates health card expiry date as 1 year after the most recent completed appointment';

COMMENT ON FUNCTION is_health_card_expired IS
    'Returns TRUE if the health card has expired (current date > expiry date)';

COMMENT ON FUNCTION set_health_card_expiry_date IS
    'Trigger function that automatically sets expiry_date when a health card is created';

COMMENT ON VIEW health_cards_with_status IS
    'View that includes calculated card_status (active, expiring_soon, expired) and days_remaining';
