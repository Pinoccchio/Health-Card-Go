# Automatic No-Show Detection & Account Suspension System

## Overview

The automatic no-show detection system monitors appointments and automatically marks patients as no-show if they don't arrive within 24 hours after their scheduled appointment. After 2 no-shows, the patient's account is suspended for 1 month.

## Features Implemented

### 1. Database Schema
- **patients table** updated with:
  - `no_show_count` (INTEGER): Tracks total no-shows per patient
  - `suspended_until` (TIMESTAMP): Suspension expiry date
  - `last_no_show_at` (TIMESTAMP): Last no-show timestamp for analytics

### 2. Automatic Detection
- **Utility Function** (`src/lib/utils/appointmentUtils.ts`):
  - `markNoShowsAndSuspend()`: Main detection logic
  - `checkAndUnsuspendPatient()`: Auto-reinstatement after suspension expires

- **Detection Criteria**:
  - Appointment status is `scheduled` or `checked_in`
  - Appointment date + 24 hours < current time (Philippine Time)

### 3. Suspension Policy
- **Strike System**: Each no-show increments `no_show_count`
- **Suspension Trigger**: 2 or more no-shows
- **Suspension Duration**: 1 month from the date of suspension
- **Auto-Reinstatement**: Account automatically unsuspended when period expires

### 4. Cron Job API
- **Endpoint**: `POST /api/cron/check-no-shows`
- **Authentication**: Bearer token (CRON_SECRET_TOKEN)
- **Schedule**: Daily at 1:00 AM PHT (recommended)

### 5. Booking Validation
- Suspended patients cannot book new appointments
- API returns suspension details (expiry date, days remaining)
- Booking page shows prominent suspension warning banner

### 6. Patient Notifications
- **No-show marked**: Informs patient of strike count (e.g., "Strike 1/2")
- **Account suspended**: Notifies of suspension with reinstatement date
- **Suspension lifted**: Confirms account reinstatement

## Setup Instructions

### Step 1: Environment Variables

Add to your `.env.local` file:

```bash
# Generate a secure random token
# Example: openssl rand -hex 32
CRON_SECRET_TOKEN=your_secure_random_token_here
```

**Security**: Never commit this token to version control. Keep it secret!

### Step 2: Database Migration (Already Applied)

The migration has been applied automatically via Supabase MCP. Verify by checking the `patients` table:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'patients'
AND column_name IN ('no_show_count', 'suspended_until', 'last_no_show_at');
```

### Step 3: Configure Cron Scheduler

You have several options for running the cron job:

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-no-shows",
      "schedule": "0 1 * * *"
    }
  ]
}
```

Note: Vercel Cron automatically includes authentication headers.

#### Option B: External Cron Service (cron-job.org)

1. Go to https://cron-job.org
2. Create a new cron job:
   - **URL**: `https://your-domain.vercel.app/api/cron/check-no-shows`
   - **Method**: POST
   - **Schedule**: `0 1 * * *` (1:00 AM daily, adjust to PHT if needed)
   - **Headers**:
     - `Authorization: Bearer YOUR_CRON_SECRET_TOKEN`
     - `Content-Type: application/json`

#### Option C: GitHub Actions (for self-hosted)

Create `.github/workflows/no-show-detection.yml`:

```yaml
name: Daily No-Show Detection

on:
  schedule:
    - cron: '0 17 * * *'  # 1:00 AM PHT (UTC+8) = 5:00 PM UTC previous day

jobs:
  check-no-shows:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger No-Show Detection
        run: |
          curl -X POST https://your-domain.vercel.app/api/cron/check-no-shows \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}" \
            -H "Content-Type: application/json"
```

Add `CRON_SECRET_TOKEN` to GitHub Secrets.

### Step 4: Verify Setup

Test the cron job manually:

```bash
curl -X POST http://localhost:3000/api/cron/check-no-shows \
  -H "Authorization: Bearer your_cron_secret_token" \
  -H "Content-Type: application/json"
```

Expected response:

```json
{
  "success": true,
  "message": "No-show detection completed",
  "timestamp": "2025-01-XX...",
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

### Step 5: Health Check

Check if the cron job is configured:

```bash
curl http://localhost:3000/api/cron/check-no-shows
```

Expected response:

```json
{
  "status": "ok",
  "endpoint": "/api/cron/check-no-shows",
  "configured": true,
  "message": "Cron job is configured and ready",
  "usage": {
    "method": "POST",
    "headers": {
      "Authorization": "Bearer YOUR_CRON_SECRET_TOKEN"
    },
    "schedule": "Daily at 1:00 AM PHT"
  }
}
```

## Testing the System

### Test 1: Create Past Appointment

```sql
-- Insert a test appointment with a past date
INSERT INTO appointments (
  patient_id,
  service_id,
  appointment_date,
  appointment_time,
  time_block,
  appointment_number,
  status
) VALUES (
  'patient_uuid_here',
  1,
  CURRENT_DATE - INTERVAL '3 days',  -- 3 days ago
  '08:00:00',
  'AM',
  1,
  'scheduled'
);
```

### Test 2: Manually Trigger Cron Job

```bash
curl -X POST http://localhost:3000/api/cron/check-no-shows \
  -H "Authorization: Bearer your_cron_secret_token"
```

### Test 3: Verify No-Show Marking

```sql
-- Check if appointment was marked as no-show
SELECT id, status, appointment_date
FROM appointments
WHERE status = 'no_show';

-- Check if patient's no-show count increased
SELECT id, patient_number, no_show_count, suspended_until
FROM patients
WHERE no_show_count > 0;
```

### Test 4: Verify Suspension (After 2nd No-Show)

Create a second past appointment for the same patient and trigger the cron job again. Verify:

```sql
-- Check patient suspension
SELECT
  p.patient_number,
  p.no_show_count,
  p.suspended_until,
  prof.status
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.no_show_count >= 2;
```

### Test 5: Verify Booking Rejection

Try to book an appointment via API:

```bash
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -H "Cookie: your_session_cookie" \
  -d '{
    "service_id": 1,
    "appointment_date": "2025-02-01",
    "time_block": "AM",
    "reason": "Test booking while suspended"
  }'
```

Expected response (for suspended patient):

```json
{
  "error": "Your account is suspended due to multiple no-shows",
  "suspended_until": "2025-02-15T...",
  "days_remaining": 15,
  "message": "Your account will be automatically reinstated on February 15, 2025..."
}
```

## Monitoring & Logs

### View Cron Job Execution Logs

Check server logs for execution details:

```
[markNoShowsAndSuspend] Starting no-show detection...
[markNoShowsAndSuspend] Found 3 overdue appointments
[markNoShowsAndSuspend] Marked appointment abc-123 as no-show (patient no-show count: 1)
[markNoShowsAndSuspend] Suspended patient def-456 until 2025-02-15...
[markNoShowsAndSuspend] Completed: { totalChecked: 3, totalMarked: 3, totalSuspended: 1 }
```

### Database Queries for Monitoring

```sql
-- Count suspended patients
SELECT COUNT(*) as suspended_count
FROM profiles
WHERE status = 'suspended';

-- List patients with no-shows
SELECT
  p.patient_number,
  prof.first_name,
  prof.last_name,
  p.no_show_count,
  p.suspended_until,
  prof.status
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE p.no_show_count > 0
ORDER BY p.no_show_count DESC;

-- View recent no-show appointments
SELECT
  a.id,
  a.appointment_date,
  a.appointment_number,
  p.patient_number,
  a.status,
  a.updated_at
FROM appointments a
JOIN patients p ON a.patient_id = p.id
WHERE a.status = 'no_show'
ORDER BY a.updated_at DESC
LIMIT 10;
```

## User Experience

### For Patients

#### Before Suspension:
1. Patient books appointment
2. Patient doesn't show up
3. 24 hours after appointment date, system marks as no-show
4. Patient receives notification: "Strike 1/2"

#### After 2nd No-Show:
1. Patient account automatically suspended
2. Patient receives notification with reinstatement date
3. Booking page shows prominent suspension warning
4. API rejects any booking attempts

#### After Suspension Period:
1. System automatically reinstates account when `suspended_until` expires
2. Patient receives reinstatement notification
3. Patient can book appointments again

### For Admins

Admins can view:
- Patient no-show history
- Suspended patients list
- No-show statistics in reports

## Business Rules Summary

| Rule | Value |
|------|-------|
| No-Show Detection Window | 24 hours after appointment date |
| Strikes Before Suspension | 2 no-shows |
| Suspension Duration | 1 month |
| Auto-Reinstatement | Yes (automatic when period expires) |
| Manual Override | Admin can manually unsuspend via patient management |

## Troubleshooting

### Issue: Cron job not running

**Check 1**: Verify environment variable
```bash
echo $CRON_SECRET_TOKEN
```

**Check 2**: Test health check endpoint
```bash
curl http://localhost:3000/api/cron/check-no-shows
```

**Check 3**: Check cron service logs (Vercel Dashboard or cron-job.org)

### Issue: Patients not getting suspended

**Check 1**: Verify database migration
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'patients' AND column_name = 'no_show_count';
```

**Check 2**: Check no-show count in database
```sql
SELECT id, patient_number, no_show_count FROM patients;
```

**Check 3**: Review cron job execution logs

### Issue: Suspended patients can still book

**Check 1**: Verify profile status
```sql
SELECT id, status FROM profiles WHERE status = 'suspended';
```

**Check 2**: Check booking API logic (should be checking suspension status)

**Check 3**: Clear browser cache and test again

## Future Enhancements

- Progressive suspension (1st offense: warning, 2nd: 1 week, 3rd: 1 month)
- Admin dashboard for managing suspensions
- Grace period for emergencies (manual override by admin)
- No-show analytics dashboard
- Patient behavior insights (seasonal patterns, trends)
- Email notifications (currently in-app only)
- SMS notifications integration

## File Reference

### New Files Created:
1. `src/lib/utils/appointmentUtils.ts` - Core logic
2. `src/app/api/cron/check-no-shows/route.ts` - API endpoint
3. `.env.example` - Environment variable template
4. `docs/NO_SHOW_SYSTEM_SETUP.md` - This documentation

### Modified Files:
1. `src/app/api/appointments/route.ts` - Suspension check in booking
2. `src/app/(dashboard-patient)/patient/book-appointment/page.tsx` - Suspension warning UI
3. `src/types/auth.ts` - Patient interface with new fields
4. `src/types/index.ts` - Re-export Patient type

### Database Migration:
- Migration name: `add_no_show_tracking_to_patients`
- Applied via: Supabase MCP

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify database migration applied correctly
3. Test cron job manually
4. Review environment variables configuration
5. Contact the development team if issues persist

---

**Last Updated**: December 21, 2025
**Version**: 1.0.0
**Author**: Claude Code Assistant
