# Testing the Automatic No-Show Detection System

## Complete Step-by-Step Testing Guide

This guide will walk you through testing the automatic no-show detection and account suspension system from start to finish.

---

## Prerequisites

Before starting, ensure you have:
- ✅ Development server can run (`npm run dev`)
- ✅ Database migration applied (no_show_count, suspended_until columns exist)
- ✅ CRON_SECRET_TOKEN added to `.env.local`
- ✅ At least one active patient in the database

---

## Part 1: Initial Setup & Health Check

### Step 1: Start the Development Server

Open PowerShell and navigate to the project:

```powershell
cd C:\Users\User\Documents\first_year_files\folder_for_jobs\HealthCard\Health-Card-Go
npm run dev
```

**Wait for**:
```
▲ Next.js 16.x.x
- Local:        http://localhost:3000
✓ Ready in 2.5s
```

✅ **Server is running!**

---

### Step 2: Run the Health Check Test

**Open a NEW PowerShell window** (keep the dev server running):

```powershell
cd C:\Users\User\Documents\first_year_files\folder_for_jobs\HealthCard\Health-Card-Go
.\test-cron.ps1
```

**Expected Output:**
```
========================================
Testing No-Show Detection Cron Job
========================================

Test 1: Health Check (GET request)
✅ Health Check Passed!
Status: ok
Configured: True

Test 2: Trigger No-Show Detection (POST request)
✅ No-Show Detection Executed Successfully!

Statistics:
  - Total Appointments Checked: 0
  - Total Marked as No-Show: 0
  - Total Patients Suspended: 0
```

✅ **Cron job is working!** (No overdue appointments yet, so 0 marked)

---

### Troubleshooting Step 2

**Error: "Cannot run scripts"**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Error: "Connection refused"**
- Check dev server is running
- Verify URL is `http://localhost:3000`

**Error: "Unauthorized" (401)**
- Check `.env.local` has `CRON_SECRET_TOKEN`
- Restart dev server after adding token

---

## Part 2: Create Test Data

Now let's create appointments that are overdue to test the automatic detection.

### Step 3: Get a Test Patient ID

Open Supabase Dashboard → SQL Editor, run:

```sql
-- Get an active patient
SELECT
  p.id as patient_id,
  p.patient_number,
  prof.first_name,
  prof.last_name,
  prof.email,
  prof.status
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE prof.status = 'active'
LIMIT 1;
```

**Copy the `patient_id`** (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

---

### Step 4: Create First Past Appointment (3 Days Ago)

Replace `YOUR_PATIENT_ID_HERE` with the ID from Step 3:

```sql
-- Create overdue appointment (3 days ago)
INSERT INTO appointments (
  patient_id,
  service_id,
  appointment_date,
  appointment_time,
  time_block,
  appointment_number,
  status,
  reason,
  created_at,
  updated_at
) VALUES (
  'YOUR_PATIENT_ID_HERE',  -- 👈 REPLACE THIS
  1,                        -- Service ID (adjust if needed)
  CURRENT_DATE - INTERVAL '3 days',  -- 3 days ago
  '08:00:00',
  'AM',
  1,
  'scheduled',              -- Status: scheduled (will be marked no-show)
  'Test appointment for automatic no-show detection',
  NOW(),
  NOW()
);

-- Verify the appointment was created
SELECT
  id,
  appointment_date,
  appointment_time,
  time_block,
  status,
  appointment_number
FROM appointments
WHERE appointment_date < CURRENT_DATE
ORDER BY created_at DESC
LIMIT 1;
```

✅ **You should see your test appointment with status = 'scheduled'**

---

### Step 5: Trigger No-Show Detection (First Time)

Back in PowerShell, run the test script again:

```powershell
.\test-cron.ps1
```

**Expected Output:**
```
✅ No-Show Detection Executed Successfully!

Statistics:
  - Total Appointments Checked: 1
  - Total Marked as No-Show: 1      👈 SUCCESS!
  - Total Patients Suspended: 0

Appointments Marked:
  - Appointment ID: abc-123...
    Patient ID: def-456...
    Date: 2025-01-18
    No-Show Count: 1                👈 First strike!
```

✅ **First no-show detected and marked!**

---

### Step 6: Verify First No-Show in Database

Run in Supabase SQL Editor:

```sql
-- 1. Check appointment status changed to 'no_show'
SELECT
  id,
  appointment_date,
  status,
  updated_at
FROM appointments
WHERE status = 'no_show'
ORDER BY updated_at DESC
LIMIT 5;

-- 2. Check patient's no_show_count increased to 1
SELECT
  p.id,
  p.patient_number,
  p.no_show_count,        -- Should be 1
  p.last_no_show_at,      -- Should have timestamp
  p.suspended_until       -- Should be NULL (not suspended yet)
FROM patients p
WHERE p.no_show_count > 0
ORDER BY p.last_no_show_at DESC
LIMIT 5;

-- 3. Check notification was sent
SELECT
  id,
  title,
  message,
  created_at
FROM notifications
WHERE title = 'Appointment Marked as No Show'
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check appointment status history
SELECT
  ash.id,
  ash.from_status,
  ash.to_status,
  ash.reason,
  ash.changed_at,
  ash.metadata
FROM appointment_status_history ash
WHERE ash.to_status = 'no_show'
ORDER BY ash.changed_at DESC
LIMIT 5;
```

**Expected Results:**
- ✅ Appointment status = `no_show`
- ✅ Patient no_show_count = `1`
- ✅ Notification created
- ✅ Status history logged

---

## Part 3: Test Account Suspension (2nd No-Show)

Now let's create a second overdue appointment to trigger suspension.

### Step 7: Create Second Past Appointment (Same Patient)

**IMPORTANT**: Use the **SAME patient_id** from Step 3!

```sql
-- Create 2nd overdue appointment (2 days ago)
INSERT INTO appointments (
  patient_id,
  service_id,
  appointment_date,
  appointment_time,
  time_block,
  appointment_number,
  status,
  reason,
  created_at,
  updated_at
) VALUES (
  'SAME_PATIENT_ID_HERE',  -- 👈 Use SAME patient ID!
  1,
  CURRENT_DATE - INTERVAL '2 days',  -- 2 days ago
  '09:00:00',
  'AM',
  2,
  'scheduled',
  'Second test appointment for suspension testing',
  NOW(),
  NOW()
);

-- Verify 2nd appointment created
SELECT
  id,
  appointment_date,
  status
FROM appointments
WHERE patient_id = 'YOUR_PATIENT_ID'  -- 👈 REPLACE
AND status = 'scheduled'
ORDER BY appointment_date DESC;
```

---

### Step 8: Trigger No-Show Detection (Second Time)

Run the test script again:

```powershell
.\test-cron.ps1
```

**Expected Output:**
```
✅ No-Show Detection Executed Successfully!

Statistics:
  - Total Appointments Checked: 1
  - Total Marked as No-Show: 1
  - Total Patients Suspended: 1    👈 SUSPENSION TRIGGERED!

Appointments Marked:
  - Appointment ID: xyz-789...
    Patient ID: def-456...
    Date: 2025-01-19
    No-Show Count: 2                👈 Second strike!

Patients Suspended:                 👈 PATIENT SUSPENDED!
  - Patient ID: def-456...
    Suspended Until: 2025-02-21T...
    No-Show Count: 2
```

✅ **Account suspended after 2nd no-show!**

---

### Step 9: Verify Suspension in Database

```sql
-- Check patient suspension status
SELECT
  p.id,
  p.patient_number,
  p.no_show_count,          -- Should be 2
  p.suspended_until,        -- Should be ~1 month from now
  p.last_no_show_at,
  prof.status               -- Should be 'suspended'
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.no_show_count >= 2;

-- Calculate days until reinstatement
SELECT
  p.patient_number,
  p.suspended_until,
  EXTRACT(DAY FROM (p.suspended_until - NOW())) as days_remaining
FROM patients p
WHERE p.suspended_until IS NOT NULL;

-- Check suspension notification sent
SELECT
  id,
  title,
  message,
  created_at
FROM notifications
WHERE title = 'Account Suspended Due to No-Shows'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Results:**
- ✅ no_show_count = `2`
- ✅ suspended_until = ~30 days from now
- ✅ profile status = `'suspended'`
- ✅ Suspension notification created

---

## Part 4: Test Booking Rejection

Now let's verify that suspended patients cannot book appointments.

### Step 10: Test Booking API Rejection

**Option A: Using PowerShell Script**

Create `test-booking.ps1`:

```powershell
# Test Booking While Suspended
$baseUrl = "http://localhost:3000"

# Note: You'll need a valid session cookie from a logged-in suspended patient
# For now, we'll test the frontend UI instead
Write-Host "Testing booking rejection in browser..." -ForegroundColor Yellow
Write-Host "1. Login as the suspended patient" -ForegroundColor White
Write-Host "2. Navigate to: $baseUrl/patient/book-appointment" -ForegroundColor White
Write-Host "3. You should see a red suspension warning banner" -ForegroundColor White
```

**Option B: Test in Browser (Recommended)**

1. **Login as the suspended patient**:
   - Go to `http://localhost:3000/login`
   - Login with the suspended patient's credentials

2. **Navigate to booking page**:
   - Go to `http://localhost:3000/patient/book-appointment`

3. **Expected UI**:
   - 🔴 **Red suspension banner** at the top showing:
     - "Account Suspended - Booking Disabled"
     - No-show count
     - Days remaining
     - Reinstatement date
   - ❌ **Booking form should be disabled/blocked**

---

### Step 11: Direct API Test (Without Login)

You can simulate the booking API check:

```sql
-- Manually check if booking would be rejected
SELECT
  p.patient_number,
  p.no_show_count,
  p.suspended_until,
  prof.status,
  CASE
    WHEN prof.status = 'suspended' AND p.suspended_until > NOW()
    THEN 'BOOKING REJECTED ❌'
    ELSE 'BOOKING ALLOWED ✅'
  END as booking_status,
  EXTRACT(DAY FROM (p.suspended_until - NOW())) as days_remaining
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.patient_number = 'YOUR_PATIENT_NUMBER';  -- 👈 REPLACE
```

**Expected**: `booking_status = 'BOOKING REJECTED ❌'`

---

## Part 5: Test Auto-Reinstatement

### Step 12: Manually Expire Suspension (For Testing)

To test auto-reinstatement without waiting 30 days:

```sql
-- Set suspension to expire in 1 minute (for testing)
UPDATE patients
SET suspended_until = NOW() + INTERVAL '1 minute'
WHERE id = 'YOUR_PATIENT_ID';  -- 👈 REPLACE

-- Verify update
SELECT
  patient_number,
  suspended_until,
  EXTRACT(SECOND FROM (suspended_until - NOW())) as seconds_remaining
FROM patients
WHERE id = 'YOUR_PATIENT_ID';  -- 👈 REPLACE
```

**Wait 1-2 minutes...**

---

### Step 13: Test Auto-Unsuspension

Try to book an appointment (or trigger the check):

**Option A: Via Browser**
1. Refresh the booking page: `http://localhost:3000/patient/book-appointment`
2. The page will call the API to check suspension
3. If expired, account auto-reinstates
4. Suspension banner should disappear
5. Booking form should be enabled

**Option B: Direct SQL Check**

```sql
-- The API would run this check:
SELECT
  p.id,
  p.suspended_until,
  prof.status,
  CASE
    WHEN p.suspended_until IS NOT NULL AND p.suspended_until <= NOW()
    THEN 'AUTO-UNSUSPEND NOW! ✅'
    ELSE 'STILL SUSPENDED ❌'
  END as reinstatement_status
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.id = 'YOUR_PATIENT_ID';  -- 👈 REPLACE
```

**Manually trigger unsuspension** (simulating what the API does):

```sql
-- Unsuspend the account
UPDATE profiles
SET status = 'active'
WHERE id = (SELECT user_id FROM patients WHERE id = 'YOUR_PATIENT_ID');

UPDATE patients
SET suspended_until = NULL
WHERE id = 'YOUR_PATIENT_ID';

-- Insert reinstatement notification
INSERT INTO notifications (
  user_id,
  type,
  title,
  message,
  link,
  created_at
)
SELECT
  user_id,
  'general',
  'Account Suspension Lifted',
  'Your account suspension has been lifted. You can now book appointments.',
  '/patient/book-appointment',
  NOW()
FROM patients
WHERE id = 'YOUR_PATIENT_ID';

-- Verify reinstatement
SELECT
  p.patient_number,
  p.no_show_count,
  p.suspended_until,
  prof.status
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.id = 'YOUR_PATIENT_ID';
```

**Expected**:
- ✅ status = `'active'`
- ✅ suspended_until = `NULL`
- ✅ Notification created

---

## Part 6: Cleanup Test Data

### Step 14: Remove Test Data (After Testing)

```sql
-- Delete test appointments
DELETE FROM appointments
WHERE reason LIKE '%test%' OR reason LIKE '%Test%';

-- Reset patient no-show count
UPDATE patients
SET
  no_show_count = 0,
  suspended_until = NULL,
  last_no_show_at = NULL
WHERE no_show_count > 0;

-- Reset profile status
UPDATE profiles
SET status = 'active'
WHERE status = 'suspended';

-- Delete test notifications
DELETE FROM notifications
WHERE title IN (
  'Appointment Marked as No Show',
  'Account Suspended Due to No-Shows',
  'Account Suspension Lifted'
);

-- Delete test status history
DELETE FROM appointment_status_history
WHERE reason LIKE '%automatic no-show detection%';
```

---

## Complete Testing Checklist

Use this checklist to verify everything works:

### Initial Setup
- [ ] Dev server running (`npm run dev`)
- [ ] Health check passes (GET `/api/cron/check-no-shows`)
- [ ] CRON_SECRET_TOKEN configured

### First No-Show Detection
- [ ] Created past appointment (3 days ago)
- [ ] Ran cron job (`.\test-cron.ps1`)
- [ ] Appointment marked as `no_show`
- [ ] Patient `no_show_count` = 1
- [ ] Notification sent to patient
- [ ] Status history logged

### Account Suspension (2nd No-Show)
- [ ] Created 2nd past appointment (same patient)
- [ ] Ran cron job again
- [ ] 2nd appointment marked as `no_show`
- [ ] Patient `no_show_count` = 2
- [ ] Profile status changed to `'suspended'`
- [ ] `suspended_until` set to ~30 days
- [ ] Suspension notification sent

### Booking Rejection
- [ ] Suspension banner shows on booking page
- [ ] Booking form is disabled
- [ ] API rejects booking attempts
- [ ] Error message shows reinstatement date

### Auto-Reinstatement
- [ ] Suspension expires (or manually set to expire)
- [ ] Account auto-reinstates when checking
- [ ] Status changes back to `'active'`
- [ ] `suspended_until` cleared
- [ ] Reinstatement notification sent
- [ ] Booking allowed again

---

## Common Issues & Solutions

### Issue: "No appointments checked"
**Cause**: No appointments are 24+ hours overdue
**Solution**: Create appointments with `CURRENT_DATE - INTERVAL '3 days'`

### Issue: "Patient not suspended after 2 no-shows"
**Cause**: Database migration not applied
**Solution**: Check `patients` table has `no_show_count` column

### Issue: "Cron returns 401 Unauthorized"
**Cause**: Missing or incorrect CRON_SECRET_TOKEN
**Solution**: Check `.env.local` and restart dev server

### Issue: "Suspension banner doesn't show"
**Cause**: Frontend not fetching suspension status
**Solution**: Check browser console for errors, verify `/api/profile` endpoint

### Issue: "Auto-reinstatement not working"
**Cause**: `checkAndUnsuspendPatient()` not called
**Solution**: Trigger by accessing booking page or calling API

---

## Performance Benchmarks

Expected execution times:

| Operation | Time | Notes |
|-----------|------|-------|
| Health Check | <50ms | Simple GET request |
| No-Show Detection (0 appointments) | <100ms | Quick database scan |
| No-Show Detection (100 appointments) | <2s | Processes in batch |
| Account Suspension | <500ms | Updates profile + patient |
| Auto-Reinstatement | <300ms | Updates 2 tables |

---

## Next Steps After Testing

Once all tests pass:

1. **Commit test script**:
   ```bash
   git add test-cron.ps1
   git commit -m "Add PowerShell test script for cron endpoint"
   ```

2. **Deploy to production**:
   - Add `CRON_SECRET_TOKEN` to Vercel environment
   - Push code to trigger deployment
   - Verify cron schedule in Vercel Dashboard

3. **Monitor in production**:
   - Check Vercel Cron logs daily
   - Review suspended patients weekly
   - Adjust suspension policy if needed

---

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify database migration applied
3. Test each component individually
4. Review this documentation
5. Check `docs/NO_SHOW_SYSTEM_SETUP.md` for detailed setup

---

**You're ready to test!** Start with Part 1 and work through each section step-by-step. Good luck! 🚀
