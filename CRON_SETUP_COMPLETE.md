# 🎉 Cron Setup Complete!

## ✅ What Has Been Configured

### 1. CRON_SECRET_TOKEN Added ✅
**File**: `.env.local`
```
CRON_SECRET_TOKEN=6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44
```

**⚠️ IMPORTANT**: Add this same token to your Vercel production environment variables:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `CRON_SECRET_TOKEN` = `6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44`
3. Save changes and redeploy

---

### 2. Vercel Cron Configured ✅
**File**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/check-no-shows",
      "schedule": "0 17 * * *"
    }
  ]
}
```

**Schedule**: Daily at **5:00 PM UTC** = **1:00 AM PHT (Philippine Time, UTC+8)**

**How it works**:
- Vercel automatically calls your cron endpoint
- No manual authentication header needed (Vercel handles it)
- Runs automatically after deployment
- View logs in Vercel Dashboard → Deployments → Functions

---

### 3. GitHub Actions Workflow (Alternative) ✅
**File**: `.github/workflows/no-show-detection.yml`

**Use this if**:
- You're not using Vercel
- You want backup redundancy
- You prefer GitHub Actions

**Setup Required**:
1. Go to GitHub Repository → Settings → Secrets and variables → Actions
2. Add secrets:
   - `CRON_SECRET_TOKEN` = `6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44`
   - `PRODUCTION_URL` = `https://your-domain.vercel.app` (your production URL)
3. Push workflow to repository
4. Enable Actions in repository settings

**Manual Trigger**: Go to Actions tab → Daily No-Show Detection → Run workflow

---

## 🚀 Next Steps

### Step 1: Test Locally (RIGHT NOW!)

Start your dev server:
```bash
cd Health-Card-Go
npm run dev
```

In another terminal, test the cron endpoint:
```bash
curl -X POST http://localhost:3000/api/cron/check-no-shows \
  -H "Authorization: Bearer 6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "No-show detection completed",
  "timestamp": "2025-01-21T...",
  "stats": {
    "totalAppointmentsChecked": 0,
    "totalMarkedNoShow": 0,
    "totalPatientsSuspended": 0,
    "details": {
      "appointmentsMarked": [],
      "patientsSuspended": []
    }
  }
}
```

---

### Step 2: Create Test Data

Run this SQL in Supabase SQL Editor to create a past appointment:

```sql
-- Get a test patient ID (replace with actual patient from your database)
SELECT id, patient_number FROM patients LIMIT 1;

-- Create past appointment (3 days ago)
INSERT INTO appointments (
  patient_id,
  service_id,
  appointment_date,
  appointment_time,
  time_block,
  appointment_number,
  status,
  reason,
  created_at
) VALUES (
  'YOUR_PATIENT_ID_HERE',  -- Replace with actual patient ID
  1,                        -- Service ID (adjust as needed)
  CURRENT_DATE - INTERVAL '3 days',
  '08:00:00',
  'AM',
  1,
  'scheduled',
  'Test appointment for no-show detection',
  NOW()
);

-- Verify the appointment was created
SELECT
  id,
  patient_id,
  appointment_date,
  status
FROM appointments
WHERE appointment_date < CURRENT_DATE
ORDER BY appointment_date DESC
LIMIT 5;
```

---

### Step 3: Trigger Cron Job Manually

After creating test data, trigger the cron job again:

```bash
curl -X POST http://localhost:3000/api/cron/check-no-shows \
  -H "Authorization: Bearer 6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44" \
  -H "Content-Type: application/json"
```

**Expected Response** (with test data):
```json
{
  "success": true,
  "message": "No-show detection completed",
  "stats": {
    "totalAppointmentsChecked": 1,
    "totalMarkedNoShow": 1,
    "totalPatientsSuspended": 0,
    "details": {
      "appointmentsMarked": [
        {
          "appointmentId": "abc-123...",
          "patientId": "def-456...",
          "appointmentDate": "2025-01-18",
          "noShowCount": 1
        }
      ],
      "patientsSuspended": []
    }
  }
}
```

---

### Step 4: Verify Database Updates

Check that the system worked:

```sql
-- 1. Check appointment was marked as no-show
SELECT
  id,
  appointment_date,
  status,
  updated_at
FROM appointments
WHERE status = 'no_show'
ORDER BY updated_at DESC
LIMIT 5;

-- 2. Check patient's no-show count increased
SELECT
  id,
  patient_number,
  no_show_count,
  last_no_show_at,
  suspended_until
FROM patients
WHERE no_show_count > 0
ORDER BY last_no_show_at DESC;

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

---

### Step 5: Test Suspension (2nd No-Show)

Create another past appointment for the SAME patient:

```sql
-- Create 2nd past appointment (2 days ago)
INSERT INTO appointments (
  patient_id,
  service_id,
  appointment_date,
  appointment_time,
  time_block,
  appointment_number,
  status,
  reason,
  created_at
) VALUES (
  'SAME_PATIENT_ID_HERE',  -- Use the SAME patient ID from Step 2
  1,
  CURRENT_DATE - INTERVAL '2 days',
  '09:00:00',
  'AM',
  2,
  'scheduled',
  'Second test appointment',
  NOW()
);
```

Trigger cron again:

```bash
curl -X POST http://localhost:3000/api/cron/check-no-shows \
  -H "Authorization: Bearer 6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44"
```

Verify suspension:

```sql
-- Check patient is suspended
SELECT
  p.patient_number,
  p.no_show_count,
  p.suspended_until,
  prof.status
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.no_show_count >= 2;

-- Expected result:
-- no_show_count: 2
-- suspended_until: ~1 month from now
-- status: 'suspended'
```

---

### Step 6: Test Booking Rejection

Try to book an appointment via API (replace session cookie):

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie_here" \
  -d '{
    "service_id": 1,
    "appointment_date": "2025-02-01",
    "time_block": "AM",
    "reason": "Test booking while suspended"
  }'
```

**Expected Response** (403 Forbidden):
```json
{
  "error": "Your account is suspended due to multiple no-shows",
  "suspended_until": "2025-02-21T...",
  "days_remaining": 30,
  "message": "Your account will be automatically reinstated on February 21, 2025..."
}
```

Or visit: `http://localhost:3000/patient/book-appointment`
- Should show red suspension warning banner
- Form should be disabled

---

### Step 7: Deploy to Production

1. **Commit all changes**:
```bash
git add .
git commit -m "feat: Add automatic no-show detection system with cron scheduler

- Add CRON_SECRET_TOKEN to .env.local
- Configure Vercel Cron (vercel.json) to run daily at 1 AM PHT
- Add GitHub Actions workflow as alternative option
- Implement automatic suspension after 2 no-shows
- Add suspension warning banner to booking page
- Update TypeScript types for patient suspension fields"
```

2. **Push to repository**:
```bash
git push origin master
```

3. **Add environment variable to Vercel**:
   - Go to Vercel Dashboard
   - Your Project → Settings → Environment Variables
   - Add: `CRON_SECRET_TOKEN` = `6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44`
   - **Important**: Select "Production" environment
   - Save and redeploy

4. **Verify deployment**:
   - Check Vercel deployment logs
   - Verify cron job is scheduled (Vercel Dashboard → Crons)
   - Test production endpoint (replace with your domain):
     ```bash
     curl https://your-domain.vercel.app/api/cron/check-no-shows
     ```

---

## 📊 Monitoring the Cron Job

### Vercel Dashboard
1. Go to Vercel Dashboard → Your Project
2. Click "Crons" tab
3. View execution history, logs, and success/failure rates

### Database Queries

Monitor system performance:

```sql
-- Count of no-shows by day
SELECT
  DATE(updated_at) as date,
  COUNT(*) as no_shows
FROM appointments
WHERE status = 'no_show'
GROUP BY DATE(updated_at)
ORDER BY date DESC
LIMIT 30;

-- Currently suspended patients
SELECT
  COUNT(*) as total_suspended,
  COUNT(CASE WHEN suspended_until > NOW() THEN 1 END) as active_suspensions,
  COUNT(CASE WHEN suspended_until <= NOW() THEN 1 END) as expired_suspensions
FROM patients
WHERE suspended_until IS NOT NULL;

-- No-show statistics by patient
SELECT
  p.patient_number,
  prof.first_name,
  prof.last_name,
  p.no_show_count,
  p.last_no_show_at,
  p.suspended_until,
  prof.status
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.no_show_count > 0
ORDER BY p.no_show_count DESC, p.last_no_show_at DESC
LIMIT 20;
```

---

## 🎯 Success Criteria

Your system is working correctly if:

✅ Cron job executes daily at 1:00 AM PHT
✅ Past appointments are marked as no-show
✅ Patient no_show_count increments correctly
✅ Notifications are sent to patients
✅ Account suspended after 2nd no-show
✅ Suspended patients cannot book appointments
✅ Booking page shows suspension warning
✅ Accounts automatically unsuspend after 1 month

---

## 🔧 Troubleshooting

### Issue: "Unauthorized" error
**Fix**: Check CRON_SECRET_TOKEN matches in:
- `.env.local` (local)
- Vercel Environment Variables (production)
- GitHub Secrets (if using Actions)

### Issue: Cron not running
**Fix**:
1. Verify `vercel.json` exists in project root
2. Check Vercel Dashboard → Crons tab
3. Ensure project is deployed to Vercel
4. Try manual trigger via API

### Issue: No appointments marked
**Fix**:
1. Verify test appointments are > 24 hours old
2. Check appointment status is 'scheduled' or 'checked_in'
3. Review cron job logs for errors

### Issue: Suspension not working
**Fix**:
1. Verify migration applied: `SELECT * FROM patients LIMIT 1;` (should have no_show_count column)
2. Check patient has 2+ no-shows
3. Verify profile status changed to 'suspended'

---

## 📝 Quick Reference

**Cron Secret Token**:
```
6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44
```

**Cron Schedule**: `0 17 * * *` (1:00 AM PHT daily)

**Test Endpoint**:
```bash
curl -X POST http://localhost:3000/api/cron/check-no-shows \
  -H "Authorization: Bearer 6e6a66756d9d2ad952598f78eda08b77e800b13e79406b1a5f77e9e1dc38ec44"
```

**Health Check**:
```bash
curl http://localhost:3000/api/cron/check-no-shows
```

---

## 🎉 You're All Set!

The automatic no-show detection system is fully configured and ready to deploy. Follow Steps 1-7 above to test locally and deploy to production.

For detailed documentation, see: `docs/NO_SHOW_SYSTEM_SETUP.md`

**Questions?** Check the troubleshooting section or review the implementation files.
