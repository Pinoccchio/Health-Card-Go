-- Enable Supabase Realtime for notifications table
-- This grants SELECT permission to supabase_realtime_admin role so that
-- Realtime can evaluate RLS policies and broadcast UPDATE/INSERT/DELETE events
--
-- Without this permission, Realtime events will not fire even if RLS policies exist.
-- This is a common issue when Realtime doesn't work despite correct client-side code.

GRANT SELECT ON public.notifications TO supabase_realtime_admin;

-- Verify notifications table is in the realtime publication
-- (This should already be configured, but we verify/add it to be safe)
DO $$
BEGIN
  -- Check if notifications is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'notifications'
  ) THEN
    -- Add notifications table to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
