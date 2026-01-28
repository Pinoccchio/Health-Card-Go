-- ============================================================================
-- Migration: Rename "Check-in" to "Verified"
-- ============================================================================
-- Purpose: Rename all "check-in" related terms to "verified" for consistency
--
-- Changes:
-- 1. Rename appointment_status enum value: checked_in → verified
-- 2. Rename appointment_stage_type enum value: check_in → verification
-- 3. Rename change_type enum value: checked_in → verified
-- 4. Rename column: appointments.checked_in_at → verified_at
-- 5. Update trigger function to use new enum values
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename Enum Values
-- ============================================================================

-- Rename appointment_status enum value: checked_in → verified
ALTER TYPE appointment_status RENAME VALUE 'checked_in' TO 'verified';

-- Rename appointment_stage_type enum value: check_in → verification
ALTER TYPE appointment_stage_type RENAME VALUE 'check_in' TO 'verification';

-- Rename change_type enum value: checked_in → verified
ALTER TYPE change_type RENAME VALUE 'checked_in' TO 'verified';

-- ============================================================================
-- STEP 2: Rename Column
-- ============================================================================

-- Rename column: checked_in_at → verified_at
ALTER TABLE appointments RENAME COLUMN checked_in_at TO verified_at;

-- ============================================================================
-- STEP 3: Update Trigger Function
-- ============================================================================

-- Update log_appointment_status_change function to use 'verified' instead of 'checked_in'
CREATE OR REPLACE FUNCTION log_appointment_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by_id UUID;
    v_from_status TEXT;
    v_to_status TEXT;
    v_change_type change_type;
    v_reason TEXT;
    v_is_reversion BOOLEAN := FALSE;
    v_reverted_from_history_id UUID := NULL;
BEGIN
    -- Determine changed_by_id with fallback chain
    -- Priority 1: Reversion metadata (explicit override for revert operations)
    IF NEW._reversion_metadata IS NOT NULL THEN
        v_changed_by_id := (NEW._reversion_metadata->>'changed_by_id')::UUID;
        v_is_reversion := COALESCE((NEW._reversion_metadata->>'is_reversion')::BOOLEAN, FALSE);
        v_reverted_from_history_id := (NEW._reversion_metadata->>'reverted_from_history_id')::UUID;

    -- Priority 2: Completion context (healthcare admin completing appointment)
    ELSIF NEW.completed_by_id IS NOT NULL THEN
        v_changed_by_id := NEW.completed_by_id;

    -- Priority 3: Authenticated user context (normal RLS-based operations)
    ELSIF auth.uid() IS NOT NULL THEN
        v_changed_by_id := auth.uid();

    -- Priority 4: Patient's user_id (for service_role operations like patient booking)
    ELSE
        SELECT p.user_id INTO v_changed_by_id
        FROM patients p
        WHERE p.id = NEW.patient_id;
    END IF;

    -- Safety check: ensure we have a valid user_id
    IF v_changed_by_id IS NULL THEN
        RAISE EXCEPTION 'Cannot determine changed_by_id for appointment % (patient_id: %). This indicates the patient record may be missing or invalid.',
            NEW.id, NEW.patient_id;
    END IF;

    -- Determine status change details based on operation type
    IF TG_OP = 'INSERT' THEN
        v_from_status := NULL;
        v_to_status := NEW.status;
        v_change_type := 'status_change';
        v_reason := 'Appointment created';

    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        v_from_status := OLD.status;
        v_to_status := NEW.status;

        -- Determine change type based on new status
        CASE NEW.status
            WHEN 'cancelled' THEN
                v_change_type := 'cancellation';
                v_reason := COALESCE(NEW.cancellation_reason, 'Appointment cancelled');
            WHEN 'no_show' THEN
                v_change_type := 'no_show';
                v_reason := 'Patient marked as no-show';
            WHEN 'verified' THEN
                v_change_type := 'verified';
                v_reason := 'Patient verified';
            WHEN 'in_progress' THEN
                v_change_type := 'started';
                v_reason := 'Appointment started';
            WHEN 'completed' THEN
                v_change_type := 'completed';
                v_reason := 'Appointment completed';
            ELSE
                v_change_type := 'status_change';
                v_reason := format('Status changed from %s to %s', OLD.status, NEW.status);
        END CASE;
    ELSE
        RETURN NEW;
    END IF;

    -- Insert status history entry
    INSERT INTO appointment_status_history (
        appointment_id,
        from_status,
        to_status,
        changed_by,
        change_type,
        reason,
        is_reversion,
        reverted_from_history_id,
        metadata
    ) VALUES (
        NEW.id,
        v_from_status,
        v_to_status,
        v_changed_by_id,
        v_change_type,
        v_reason,
        v_is_reversion,
        v_reverted_from_history_id,
        CASE
            WHEN TG_OP = 'INSERT' THEN '{"initial_creation": true}'::jsonb
            WHEN v_is_reversion THEN jsonb_build_object('is_reversion', true, 'reverted_from', v_reverted_from_history_id)
            ELSE NULL
        END
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update function comment
COMMENT ON FUNCTION log_appointment_status_change() IS
'Logs appointment status changes to appointment_status_history table.
Updated 2026-01-28: Changed checked_in → verified terminology.
Handles service_role context by falling back to patient user_id when auth.uid() is NULL.';

-- ============================================================================
-- STEP 4: Update Existing History Records (if any)
-- ============================================================================

-- Update any existing status history records that reference old values
-- Note: The enum rename already handles the to_status/from_status columns
-- We just need to update the reason text if needed
UPDATE appointment_status_history
SET reason = 'Patient verified'
WHERE reason = 'Patient checked in';

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Verify enum values exist
-- SELECT enum_range(NULL::appointment_status);
-- SELECT enum_range(NULL::appointment_stage_type);
-- SELECT enum_range(NULL::change_type);

-- Verify column was renamed
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'appointments' AND column_name = 'verified_at';
