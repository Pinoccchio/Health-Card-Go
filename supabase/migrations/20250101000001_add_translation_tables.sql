-- Migration: Add translation tables for multi-language support
-- Phase 3: Database Schema Changes
-- Date: January 1, 2025

-- =====================================================
-- 1. SERVICE TRANSLATIONS TABLE
-- =====================================================
-- Stores localized service names, descriptions, and requirements
CREATE TABLE IF NOT EXISTS service_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'fil', 'ceb')),
  name TEXT NOT NULL,
  description TEXT,
  requirements JSONB DEFAULT '[]'::jsonb, -- Array of translated requirement strings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, locale)
);

-- Index for faster lookups by service and locale
CREATE INDEX idx_service_translations_service_locale ON service_translations(service_id, locale);

-- Enable RLS
ALTER TABLE service_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read service translations
CREATE POLICY "Allow public read access to service translations"
  ON service_translations FOR SELECT
  USING (true);

-- Only authenticated users with admin roles can modify
CREATE POLICY "Allow admins to manage service translations"
  ON service_translations FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role_id IN (1, 2) -- Super Admin or Healthcare Admin
    )
  );

-- =====================================================
-- 2. ANNOUNCEMENT TRANSLATIONS TABLE
-- =====================================================
-- Stores localized announcement titles and content
CREATE TABLE IF NOT EXISTS announcement_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'fil', 'ceb')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, locale)
);

-- Index for faster lookups
CREATE INDEX idx_announcement_translations_announcement_locale ON announcement_translations(announcement_id, locale);

-- Enable RLS
ALTER TABLE announcement_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read announcement translations
CREATE POLICY "Allow public read access to announcement translations"
  ON announcement_translations FOR SELECT
  USING (true);

-- Only Super Admins can manage announcements
CREATE POLICY "Allow super admins to manage announcement translations"
  ON announcement_translations FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM profiles
      WHERE role_id = 1 -- Super Admin only
    )
  );

-- =====================================================
-- 3. MODIFY NOTIFICATIONS TABLE
-- =====================================================
-- Add translation key columns for dynamic notification content
-- Instead of storing English-only text, we'll store translation keys

-- Add new columns for translation keys
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS title_key TEXT,
  ADD COLUMN IF NOT EXISTS message_key TEXT,
  ADD COLUMN IF NOT EXISTS params JSONB DEFAULT '{}'::jsonb;

-- Update existing notifications to use translation keys (migration data)
-- This is a one-time migration - future notifications will use keys from the start

-- For appointment reminders
UPDATE notifications
SET
  title_key = 'notification.appointment_reminder.title',
  message_key = 'notification.appointment_reminder.message',
  params = jsonb_build_object(
    'date', title, -- Extract date from existing title
    'time', message -- Extract time from existing message
  )
WHERE type = 'appointment_reminder' AND title_key IS NULL;

-- For approval notifications
UPDATE notifications
SET
  title_key = 'notification.approval.title',
  message_key = 'notification.approval.message'
WHERE type = 'approval' AND title_key IS NULL;

-- For cancellation notifications
UPDATE notifications
SET
  title_key = 'notification.cancellation.title',
  message_key = 'notification.cancellation.message',
  params = jsonb_build_object(
    'reason', message -- Extract reason from message
  )
WHERE type = 'cancellation' AND title_key IS NULL;

-- For feedback request notifications
UPDATE notifications
SET
  title_key = 'notification.feedback_request.title',
  message_key = 'notification.feedback_request.message'
WHERE type = 'feedback_request' AND title_key IS NULL;

-- For general notifications
UPDATE notifications
SET
  title_key = 'notification.general.title',
  message_key = 'notification.general.message',
  params = jsonb_build_object(
    'title', title,
    'message', message
  )
WHERE type = 'general' AND title_key IS NULL;

-- =====================================================
-- 4. POPULATE SERVICE TRANSLATIONS
-- =====================================================
-- Insert English translations for existing services (baseline)
INSERT INTO service_translations (service_id, locale, name, description, requirements)
SELECT
  id,
  'en' as locale,
  name,
  description,
  requirements
FROM services
ON CONFLICT (service_id, locale) DO NOTHING;

-- Filipino translations (to be populated by admin or via API)
-- We're inserting placeholders that match the English - admins can update via UI
INSERT INTO service_translations (service_id, locale, name, description, requirements)
SELECT
  id,
  'fil' as locale,
  name, -- Placeholder - will be translated by admin
  description, -- Placeholder
  requirements -- Placeholder
FROM services
ON CONFLICT (service_id, locale) DO NOTHING;

-- Cebuano translations (placeholders)
INSERT INTO service_translations (service_id, locale, name, description, requirements)
SELECT
  id,
  'ceb' as locale,
  name, -- Placeholder - will be translated by admin
  description, -- Placeholder
  requirements -- Placeholder
FROM services
ON CONFLICT (service_id, locale) DO NOTHING;

-- =====================================================
-- 5. CREATE UPDATED_AT TRIGGERS
-- =====================================================
-- Automatically update updated_at timestamp on row changes

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_translations_updated_at
  BEFORE UPDATE ON service_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcement_translations_updated_at
  BEFORE UPDATE ON announcement_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. HELPER FUNCTIONS FOR LOCALIZED DATA
-- =====================================================

-- Function to get localized service data
CREATE OR REPLACE FUNCTION get_localized_service(
  p_service_id INTEGER,
  p_locale TEXT DEFAULT 'en'
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  description TEXT,
  requirements JSONB,
  category TEXT,
  duration_minutes INTEGER,
  requires_appointment BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    COALESCE(st.name, s.name) as name,
    COALESCE(st.description, s.description) as description,
    COALESCE(st.requirements, s.requirements) as requirements,
    s.category,
    s.duration_minutes,
    s.requires_appointment,
    s.is_active
  FROM services s
  LEFT JOIN service_translations st ON s.id = st.service_id AND st.locale = p_locale
  WHERE s.id = p_service_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get all localized services
CREATE OR REPLACE FUNCTION get_all_localized_services(
  p_locale TEXT DEFAULT 'en'
)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  description TEXT,
  requirements JSONB,
  category TEXT,
  duration_minutes INTEGER,
  requires_appointment BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    COALESCE(st.name, s.name) as name,
    COALESCE(st.description, s.description) as description,
    COALESCE(st.requirements, s.requirements) as requirements,
    s.category,
    s.duration_minutes,
    s.requires_appointment,
    s.is_active
  FROM services s
  LEFT JOIN service_translations st ON s.id = st.service_id AND st.locale = p_locale
  WHERE s.is_active = true
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTES FOR API IMPLEMENTATION (Phase 4)
-- =====================================================
-- 1. Services API (/api/services):
--    - Accept `locale` query parameter (default: 'en')
--    - Use get_all_localized_services(locale) function
--    - Return localized name, description, requirements
--
-- 2. Notifications API (/api/notifications):
--    - Return title_key, message_key, params
--    - Client-side: use next-intl to translate with t(title_key, params)
--    - Example: t('notification.appointment_reminder.title', { date: '2025-01-15' })
--
-- 3. Announcements API (/api/announcements):
--    - Accept `locale` query parameter
--    - JOIN with announcement_translations
--    - Return localized title and content
--
-- 4. Profile Locale:
--    - User's locale stored in profiles.locale column
--    - Used to determine which translations to fetch
--    - Only patients (role_id = 4) can use fil/ceb locales
--    - Admins (role_id 1, 2) forced to 'en'
