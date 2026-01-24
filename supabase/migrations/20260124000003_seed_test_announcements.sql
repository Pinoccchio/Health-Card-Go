-- Migration: Seed diverse test announcements created by Patricia Gonzales (Education Admin)
-- Date: 2026-01-24
-- Creator: Patricia Gonzales (education.admin@test.com)

-- =============================================
-- Step 1: Verify Patricia Gonzales exists
-- =============================================
DO $$
DECLARE
  patricia_id UUID;
BEGIN
  -- Find Patricia Gonzales' user ID
  SELECT id INTO patricia_id
  FROM profiles
  WHERE email = 'education.admin@test.com'
    AND role = 'education_admin'
    AND status = 'active';

  IF patricia_id IS NULL THEN
    RAISE EXCEPTION 'Patricia Gonzales (education.admin@test.com) not found. Please create this user first.';
  ELSE
    RAISE NOTICE 'Found Patricia Gonzales with ID: %', patricia_id;
  END IF;
END $$;

-- =============================================
-- Step 2: Seed Test Announcements
-- =============================================

-- Create temporary function to get Patricia's ID
CREATE OR REPLACE FUNCTION get_patricia_id()
RETURNS UUID AS $$
DECLARE
  patricia_id UUID;
BEGIN
  SELECT id INTO patricia_id
  FROM profiles
  WHERE email = 'education.admin@test.com'
    AND role = 'education_admin';

  RETURN patricia_id;
END;
$$ LANGUAGE plpgsql;

-- Insert test announcements
INSERT INTO announcements (id, title, content, created_by, target_audience, is_active, created_at, updated_at)
VALUES
  -- 1. ACTIVE - For All Users
  (
    gen_random_uuid(),
    'Welcome to Panabo City Health Office Digital Services',
    'We are pleased to announce the launch of our new digital health platform! This system allows you to book appointments, view your medical records, and access your digital health card. For assistance, please visit our office at City Health Office, Panabo City, Davao del Norte, or call us at (084) 823-1234.',
    get_patricia_id(),
    'all',
    true,
    NOW() - INTERVAL '10 hours', -- Posted 10 hours ago (within 48h = "new" badge)
    NOW() - INTERVAL '10 hours'
  ),

  -- 2. ACTIVE - For Patients Only
  (
    gen_random_uuid(),
    'Reminder: Health Card Renewal for 2026',
    'Dear Patients, please be reminded that health cards issued in 2025 will expire soon. To renew your health card, please book an appointment for a General Health Checkup service. Your renewed card will be issued after your checkup is completed. Health cards are valid for one year from the issue date.',
    get_patricia_id(),
    'patients',
    true,
    NOW() - INTERVAL '30 hours', -- Posted 30 hours ago (within 48h = "new" badge)
    NOW() - INTERVAL '30 hours'
  ),

  -- 3. ACTIVE - For Healthcare Admins
  (
    gen_random_uuid(),
    'New Feature: Appointment Uploads Verification',
    'Healthcare Admins can now require patients to upload supporting documents (lab results, prescriptions, etc.) when booking appointments. Please review the updated appointment management workflow in your dashboard. For questions, contact the IT department or Super Admin.',
    get_patricia_id(),
    'healthcare_admin',
    true,
    NOW() - INTERVAL '20 hours', -- Posted 20 hours ago (within 48h = "new" badge)
    NOW() - INTERVAL '20 hours'
  ),

  -- 4. INACTIVE - For All Users (Expired Event)
  (
    gen_random_uuid(),
    'Free COVID-19 Vaccination Drive - December 2025',
    'The City Health Office will conduct a free COVID-19 vaccination drive on December 15-20, 2025, at all barangay health centers. Walk-ins are welcome. Bring a valid ID and your vaccination card (if available). This is a FREE service for all Panabo City residents.',
    get_patricia_id(),
    'all',
    false, -- Inactive (event has passed)
    NOW() - INTERVAL '30 days', -- Posted 30 days ago (old announcement)
    NOW() - INTERVAL '30 days'
  ),

  -- 5. ACTIVE - For Super Admins
  (
    gen_random_uuid(),
    'System Maintenance Scheduled: January 28, 2026',
    'Super Admins, please be informed that system maintenance is scheduled for January 28, 2026, from 2:00 AM to 6:00 AM (PST). During this period, the platform will be temporarily unavailable. Please notify all users in advance and avoid scheduling critical operations during this window.',
    get_patricia_id(),
    'super_admin',
    true,
    NOW() - INTERVAL '5 hours', -- Posted 5 hours ago (within 48h = "new" badge)
    NOW() - INTERVAL '5 hours'
  ),

  -- 6. ACTIVE - For Staff (Disease Surveillance)
  (
    gen_random_uuid(),
    'Dengue Cases Monitoring - Weekly Update Required',
    'All staff members involved in disease surveillance: Please ensure dengue cases are logged daily in the system. Weekly reports are due every Friday at 5:00 PM. Use the Disease Heatmap feature to identify high-risk barangays. For technical support, contact the Super Admin.',
    get_patricia_id(),
    'staff',
    true,
    NOW() - INTERVAL '40 hours', -- Posted 40 hours ago (within 48h = "new" badge)
    NOW() - INTERVAL '40 hours'
  ),

  -- 7. ACTIVE - For Education Admins
  (
    gen_random_uuid(),
    'Health Education Seminar Schedule - February 2026',
    'Education Admins, the February 2026 Health Education Seminars are now open for registration. Topics include: Maternal Health, Nutrition, Dengue Prevention, and HIV/AIDS Awareness. Please coordinate with barangay officials to promote these sessions. Maximum capacity: 50 participants per session.',
    get_patricia_id(),
    'education_admin',
    true,
    NOW() - INTERVAL '15 hours', -- Posted 15 hours ago (within 48h = "new" badge)
    NOW() - INTERVAL '15 hours'
  ),

  -- 8. INACTIVE - For Patients (Outdated Reminder)
  (
    gen_random_uuid(),
    'Laboratory Services Price Update - December 2025',
    'Dear Patients, effective December 1, 2025, laboratory service fees have been updated. Please check the latest pricing in the Services section before booking your appointment. Payment can be made via GCash, cash, or bank transfer.',
    get_patricia_id(),
    'patients',
    false, -- Inactive (outdated information)
    NOW() - INTERVAL '60 days', -- Posted 60 days ago (old announcement)
    NOW() - INTERVAL '60 days'
  ),

  -- 9. ACTIVE - For All Users (Important Policy Update)
  (
    gen_random_uuid(),
    'Updated Appointment Booking Policy - 7-Day Lead Time',
    'Important Update: To ensure proper resource allocation, all appointments must be booked at least 7 days in advance. Same-day and next-day bookings are no longer available (except for emergency services). Walk-in services remain available for specific services. Thank you for your cooperation.',
    get_patricia_id(),
    'all',
    true,
    NOW() - INTERVAL '3 days', -- Posted 3 days ago (older than 48h = no "new" badge)
    NOW() - INTERVAL '3 days'
  ),

  -- 10. ACTIVE - For Healthcare Admins (Training Announcement)
  (
    gen_random_uuid(),
    'Mandatory Training: Medical Records Management System',
    'All Healthcare Admins are required to attend a mandatory training session on the new Medical Records Management System on February 5, 2026, at 2:00 PM (City Health Office Conference Room). Please confirm your attendance with the Super Admin by January 30, 2026.',
    get_patricia_id(),
    'healthcare_admin',
    true,
    NOW() - INTERVAL '1 day', -- Posted 1 day ago (within 48h = "new" badge)
    NOW() - INTERVAL '1 day'
  ),

  -- 11. ACTIVE - For Patients (Service Highlight)
  (
    gen_random_uuid(),
    'New Service Available: Telemedicine Consultation',
    'We are excited to introduce Telemedicine Consultation services! Patients can now consult with healthcare professionals remotely via video call. To book a telemedicine appointment, select the "Telemedicine Consultation" service when scheduling. Note: This service is available Monday to Friday, 9:00 AM - 3:00 PM only.',
    get_patricia_id(),
    'patients',
    true,
    NOW() - INTERVAL '25 hours', -- Posted 25 hours ago (within 48h = "new" badge)
    NOW() - INTERVAL '25 hours'
  ),

  -- 12. INACTIVE - For All Users (Completed Event)
  (
    gen_random_uuid(),
    'Annual Health Fair 2025 - Thank You!',
    'Thank you to everyone who participated in the Annual Health Fair 2025 held on November 20-22, 2025! We served over 2,000 residents with free health screenings, consultations, and health education. Stay tuned for next year''s event!',
    get_patricia_id(),
    'all',
    false, -- Inactive (event completed)
    NOW() - INTERVAL '65 days', -- Posted 65 days ago (old announcement)
    NOW() - INTERVAL '65 days'
  );

-- =============================================
-- Step 3: Drop temporary function
-- =============================================
DROP FUNCTION IF EXISTS get_patricia_id();

-- =============================================
-- Step 4: Verify seeded announcements
-- =============================================
DO $$
DECLARE
  total_count INTEGER;
  active_count INTEGER;
  inactive_count INTEGER;
  audience_stats TEXT;
BEGIN
  -- Count total announcements
  SELECT COUNT(*) INTO total_count FROM announcements;

  -- Count by status
  SELECT COUNT(*) INTO active_count FROM announcements WHERE is_active = true;
  SELECT COUNT(*) INTO inactive_count FROM announcements WHERE is_active = false;

  -- Generate audience breakdown
  SELECT string_agg(
    format('%s: %s', target_audience, count),
    ', '
  ) INTO audience_stats
  FROM (
    SELECT target_audience, COUNT(*)::TEXT as count
    FROM announcements
    GROUP BY target_audience
    ORDER BY target_audience
  ) sub;

  RAISE NOTICE '=== Announcement Seeding Summary ===';
  RAISE NOTICE 'Total announcements: %', total_count;
  RAISE NOTICE 'Active: %', active_count;
  RAISE NOTICE 'Inactive: %', inactive_count;
  RAISE NOTICE 'By audience: %', audience_stats;

  IF total_count <> 12 THEN
    RAISE EXCEPTION 'Expected 12 announcements, but found %', total_count;
  END IF;

  RAISE NOTICE 'Announcement seeding completed successfully!';
END $$;
