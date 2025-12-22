# Quick Test Guide - No-Show System

## 🚀 Quick Start (5 Minutes)

### 1. Start Server
```powershell
npm run dev
```

### 2. Test Cron (New PowerShell Window)
```powershell
.\test-cron.ps1
```

Expected: `✅ No-Show Detection Executed Successfully!`

---

## 📝 Create Test Data (Copy-Paste)

### Get Patient ID
```sql
SELECT id FROM patients LIMIT 1;
```
Copy the ID (e.g., `abc-123...`)

### Create Past Appointment
```sql
INSERT INTO appointments (patient_id, service_id, appointment_date, appointment_time, time_block, appointment_number, status, reason, created_at, updated_at)
VALUES ('PASTE_PATIENT_ID_HERE', 1, CURRENT_DATE - INTERVAL '3 days', '08:00:00', 'AM', 1, 'scheduled', 'Test', NOW(), NOW());
```

### Run Cron Again
```powershell
.\test-cron.ps1
```

Expected: `Total Marked as No-Show: 1` ✅

---

## 🔍 Quick Verification Queries

### Check No-Shows
```sql
SELECT * FROM appointments WHERE status = 'no_show';
SELECT patient_number, no_show_count FROM patients WHERE no_show_count > 0;
```

### Check Suspensions
```sql
SELECT p.patient_number, p.no_show_count, p.suspended_until, prof.status
FROM patients p
JOIN profiles prof ON p.user_id = prof.id
WHERE prof.status = 'suspended';
```

---

## ⚡ Test Suspension (2nd No-Show)

### Create 2nd Appointment (SAME patient!)
```sql
INSERT INTO appointments (patient_id, service_id, appointment_date, appointment_time, time_block, appointment_number, status, reason, created_at, updated_at)
VALUES ('SAME_PATIENT_ID', 1, CURRENT_DATE - INTERVAL '2 days', '09:00:00', 'AM', 2, 'scheduled', 'Test 2', NOW(), NOW());
```

### Run Cron
```powershell
.\test-cron.ps1
```

Expected: `Total Patients Suspended: 1` 🔴

---

## 🧹 Cleanup After Testing

```sql
DELETE FROM appointments WHERE reason LIKE '%Test%';
UPDATE patients SET no_show_count = 0, suspended_until = NULL WHERE no_show_count > 0;
UPDATE profiles SET status = 'active' WHERE status = 'suspended';
```

---

## 📚 Full Documentation

For detailed testing: See `docs/TESTING_NO_SHOW_SYSTEM.md`

For setup info: See `CRON_SETUP_COMPLETE.md`

For deployment: See `docs/NO_SHOW_SYSTEM_SETUP.md`

---

## 🎯 Success Checklist

- [ ] Health check passes
- [ ] Creates past appointment
- [ ] Marks as no-show (1st strike)
- [ ] Increments no_show_count
- [ ] Suspends after 2nd no-show
- [ ] Booking page shows warning
- [ ] Cleanup works

**All green? You're ready to deploy!** 🚀
