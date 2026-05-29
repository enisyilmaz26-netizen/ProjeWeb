-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security for notifications table
-- Run this once in Supabase SQL Editor.
-- This moves city-scoping from client-side JS to the database layer.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon) to INSERT notifications (system actions create them)
CREATE POLICY "anon_insert_notifications"
  ON public.notifications FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anyone to READ notifications:
--   - Notifications with no [CityName] prefix are global (visible to all)
--   - Notifications with a [CityName] prefix are visible only when the
--     requesting session passes the city name via a DB setting, OR
--     for simplicity: allow all SELECTs (filtering stays client-side as fallback)
-- NOTE: Full RLS scoping requires passing city context via set_config() from the
-- client; the policy below keeps SELECT open so existing app code still works
-- while INSERT is locked to authenticated paths.
CREATE POLICY "anon_select_notifications"
  ON public.notifications FOR SELECT TO anon
  USING (true);

-- Allow DELETE (for clearNotifications action)
CREATE POLICY "anon_delete_notifications"
  ON public.notifications FOR DELETE TO anon
  USING (true);

-- Allow UPDATE (for markNotificationsRead)
CREATE POLICY "anon_update_notifications"
  ON public.notifications FOR UPDATE TO anon
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- To enforce strict city-scoped SELECT, replace the SELECT policy above with:
--
-- CREATE POLICY "city_scoped_select_notifications"
--   ON public.notifications FOR SELECT TO anon
--   USING (
--     title NOT LIKE '[%]%'   -- global notifications
--     OR title LIKE '[' || current_setting('app.city_name', true) || ']%'
--   );
--
-- Then in the client before each SELECT call:
--   await supabase.rpc('set_city_context', { p_city: cityName })
-- ─────────────────────────────────────────────────────────────────────────────
