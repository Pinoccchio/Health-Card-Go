-- Fix log_appointment_status_change() trigger to handle service_role context
-- This fixes the constraint violation when patients book appointments using adminClient (service role)
-- The original trigger assumed auth.uid() would always be available, but service role has no auth context

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
        v_is_reversion := TRUE;
        v_reverted_from_history_id := (NEW._reversion_metadata->>'reverted_from_history_id')::UUID;

    -- Priority 2: Completion context (healthcare admin completing appointment)
    ELSIF NEW.completed_by_id IS NOT NULL THEN
        v_changed_by_id := NEW.completed_by_id;

    -- Priority 3: Authenticated user context (normal RLS-based operations)
    ELSIF auth.uid() IS NOT NULL THEN
        v_changed_by_id := auth.uid();

    -- Priority 4: Patient's user_id (for service_role operations like patient booking)
    -- This handles the case where adminClient (service role) creates appointments on behalf of patients
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
        -- New appointment created
        v_from_status := NULL;
        v_to_status := NEW.status;
        v_change_type := 'status_change';
        v_reason := 'Appointment created';

    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Status changed on existing appointment
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
            WHEN 'checked_in' THEN
                v_change_type := 'checked_in';
                v_reason := 'Patient checked in';
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
        -- No status change, don't log
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

-- Comment explaining the fix
COMMENT ON FUNCTION log_appointment_status_change() IS
'Logs appointment status changes to appointment_status_history table.
Updated to handle service_role context by falling back to patient user_id when auth.uid() is NULL.
This allows adminClient (service role) to create appointments on behalf of patients without constraint violations.';
