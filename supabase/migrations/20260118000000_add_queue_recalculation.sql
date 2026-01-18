-- Add Queue Recalculation Function
-- This migration adds the recalculate_queue_numbers() function to automatically
-- recalculate queue numbers when an appointment is cancelled, eliminating gaps.

-- Fix unique constraint to allow cancelled appointments to keep their queue numbers
-- Drop the old constraint if it exists
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS unique_queue_per_service;

-- Create a partial unique index that only applies to non-cancelled/no-show appointments
-- This allows cancelled/no-show appointments to retain their original queue numbers for audit trail
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_queue_per_service
ON appointments (appointment_date, service_id, appointment_number)
WHERE status NOT IN ('cancelled', 'no_show');

-- Create the queue recalculation function
CREATE OR REPLACE FUNCTION recalculate_queue_numbers(
  p_appointment_date DATE,
  p_service_id INTEGER,
  p_cancelled_queue_number INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Decrement queue numbers for all appointments AFTER the cancelled one
  -- Only update appointments on the same date/service with higher queue numbers
  -- Exclude cancelled/no-show appointments from recalculation
  UPDATE appointments
  SET
    appointment_number = appointment_number - 1,
    updated_at = NOW()
  WHERE
    appointment_date = p_appointment_date
    AND service_id = p_service_id
    AND appointment_number > p_cancelled_queue_number
    AND status IN ('scheduled', 'checked_in', 'in_progress', 'completed');

  -- Log the recalculation for audit purposes
  RAISE NOTICE 'Queue recalculated: date=%, service=%, cancelled_queue=%',
    p_appointment_date, p_service_id, p_cancelled_queue_number;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION recalculate_queue_numbers(DATE, INTEGER, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION recalculate_queue_numbers(DATE, INTEGER, INTEGER) IS
  'Recalculates queue numbers when an appointment is cancelled, eliminating gaps in the sequence';
