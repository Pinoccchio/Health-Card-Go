# HealthCard Test Users Seeding Guide

## Overview
This guide provides instructions for creating test users in the HealthCard system using the Next.js registration flow.

## Important Notes

⚠️ **SECURITY WARNING**
- These are TEST ACCOUNTS ONLY
- Do NOT use these credentials in production
- All passwords follow the pattern: `[Role]@2025!`
- Change all passwords before production deployment

## Database Status

✅ **Database Setup Complete**
- All 12 tables created
- Services table seeded (9 services)
- Barangays table seeded (44 barangays)
- RLS policies active
- Database functions created
- Profile auto-creation trigger active

## Test User Creation Options

### Option 1: Manual Registration via UI (Recommended)

1. **Start the development server**:
   ```bash
   cd health-card-go
   npm run dev
   ```

2. **Navigate to**: http://localhost:3000/register

3. **Register each user** using the data below

### Option 2: Use Supabase Dashboard (For Staff/Doctors)

For non-patient users (Super Admin, Healthcare Admins, Doctors), you can create them directly via:
1. Supabase Dashboard → Authentication → Users → "Add User"
2. Then update their profile in the Database → profiles table

---

## Test Users to Create

### 1. SUPER ADMIN

**Registration URL**: http://localhost:3000/register

```javascript
{
  firstName: "Admin",
  lastName: "System",
  email: "admin@gmail.com",
  password: "Admin@2025!",
  confirmPassword: "Admin@2025!",
  role: "super_admin",
  acceptTerms: true
}
```

**Post-Registration Action**: None (auto-approved)

---

### 2. HEALTHCARE ADMINS (6 Users)

#### a. Healthcard Admin

```javascript
{
  firstName: "Healthcard",
  lastName: "Administrator",
  email: "healthcard.admin@gmail.com",
  password: "HealthCard@2025!",
  confirmPassword: "HealthCard@2025!",
  role: "healthcare_admin",
  adminCategory: "healthcard",
  acceptTerms: true
}
```

#### b. HIV Admin

```javascript
{
  firstName: "HIV",
  lastName: "Administrator",
  email: "hiv.admin@gmail.com",
  password: "HIV@2025!",
  confirmPassword: "HIV@2025!",
  role: "healthcare_admin",
  adminCategory: "hiv",
  acceptTerms: true
}
```

#### c. Pregnancy Admin

```javascript
{
  firstName: "Pregnancy",
  lastName: "Administrator",
  email: "pregnancy.admin@gmail.com",
  password: "Pregnancy@2025!",
  confirmPassword: "Pregnancy@2025!",
  role: "healthcare_admin",
  adminCategory: "pregnancy",
  acceptTerms: true
}
```

#### d. General Admin

```javascript
{
  firstName: "General",
  lastName: "Administrator",
  email: "general.admin@gmail.com",
  password: "General@2025!",
  confirmPassword: "General@2025!",
  role: "healthcare_admin",
  adminCategory: "general_admin",
  acceptTerms: true
}
```

#### e. Laboratory Admin

```javascript
{
  firstName: "Laboratory",
  lastName: "Administrator",
  email: "lab.admin@gmail.com",
  password: "Laboratory@2025!",
  confirmPassword: "Laboratory@2025!",
  role: "healthcare_admin",
  adminCategory: "laboratory",
  acceptTerms: true
}
```

**Post-Registration Action**: All Healthcare Admins are auto-approved (status: 'active')

#### f. Immunization Admin

```javascript
{
  firstName: "Immunization",
  lastName: "Administrator",
  email: "immunization.admin@gmail.com",
  password: "Immunization@2025!",
  confirmPassword: "Immunization@2025!",
  role: "healthcare_admin",
  adminCategory: "immunization",
  acceptTerms: true
}
```

**Post-Registration Action**: All Healthcare Admins are auto-approved (status: 'active')

**Services Managed:**
- Child Immunization (Free) - Service ID: 5
- Adult Vaccination - Service ID: 6

**Note:** This account manages immunization records and vaccination schedules. The database schema, RLS policies, and API filtering are already configured for this category.

---

### 3. DOCTORS (2 Users)

#### a. Dr. Juan Santos (General Practitioner)

```javascript
{
  firstName: "Juan",
  lastName: "Santos",
  email: "dr.santos@gmail.com",
  password: "Doctor@2025!",
  confirmPassword: "Doctor@2025!",
  role: "doctor",
  specialization: "General Practitioner",
  licenseNumber: "PRC-123456789",
  acceptTerms: true
}
```

#### b. Dr. Maria Reyes (Pediatrician)

```javascript
{
  firstName: "Maria",
  lastName: "Reyes",
  email: "dr.reyes@gmail.com",
  password: "Doctor@2025!",
  confirmPassword: "Doctor@2025!",
  role: "doctor",
  specialization: "Pediatrician",
  licenseNumber: "PRC-987654321",
  acceptTerms: true
}
```

**Post-Registration Actions**:
1. Create doctor records in `doctors` table manually via Supabase Dashboard:
   ```sql
   -- For Dr. Santos
   INSERT INTO doctors (user_id, max_patients_per_day)
   SELECT id, 100 FROM profiles WHERE email = 'dr.santos@gmail.com';

   -- For Dr. Reyes
   INSERT INTO doctors (user_id, max_patients_per_day)
   SELECT id, 100 FROM profiles WHERE email = 'dr.reyes@gmail.com';
   ```

---

### 4. PATIENTS (4 Users)

#### a. Juan Dela Cruz (Active - Can Book)

```javascript
{
  firstName: "Juan",
  lastName: "Dela Cruz",
  email: "juan.delacruz@gmail.com",
  password: "Patient@2025!",
  confirmPassword: "Patient@2025!",
  role: "patient",
  barangayId: 1, // San Nicolas
  dateOfBirth: "1990-01-15",
  gender: "male",
  contactNumber: "+63 912 345 6789",
  emergencyContact: {
    name: "Maria Dela Cruz",
    phone: "+63 912 999 9999",
    email: "maria@email.com"
  },
  acceptTerms: true
}
```

**Post-Registration Actions**:
1. Approve via Super Admin or any Healthcare Admin
2. Create patient record and health card:
   ```sql
   -- Create patient record
   INSERT INTO patients (user_id, patient_number)
   SELECT id, generate_patient_number() FROM profiles WHERE email = 'juan.delacruz@gmail.com';

   -- Create health card
   INSERT INTO health_cards (patient_id, card_number, qr_code_data)
   SELECT p.id, generate_health_card_number(),
          json_build_object('patient_id', p.id, 'name', pr.first_name || ' ' || pr.last_name)::text
   FROM patients p
   JOIN profiles pr ON p.user_id = pr.id
   WHERE pr.email = 'juan.delacruz@gmail.com';
   ```

#### b. Maria Santos (Pending - For Approval Testing)

```javascript
{
  firstName: "Maria",
  lastName: "Santos",
  email: "maria.santos@gmail.com",
  password: "Patient@2025!",
  confirmPassword: "Patient@2025!",
  role: "patient",
  barangayId: 2, // Gredu
  dateOfBirth: "1995-03-20",
  gender: "female",
  contactNumber: "+63 923 456 7890",
  emergencyContact: {
    name: "Jose Santos",
    phone: "+63 923 888 8888",
    email: "jose@email.com"
  },
  acceptTerms: true
}
```

**Post-Registration Action**: Leave as PENDING for testing approval workflow

#### c. Pedro Gonzales (Active - With History)

```javascript
{
  firstName: "Pedro",
  lastName: "Gonzales",
  email: "pedro.gonzales@gmail.com",
  password: "Patient@2025!",
  confirmPassword: "Patient@2025!",
  role: "patient",
  barangayId: 3, // Salvacion
  dateOfBirth: "1988-07-10",
  gender: "male",
  contactNumber: "+63 934 567 8901",
  emergencyContact: {
    name: "Ana Gonzales",
    phone: "+63 934 777 7777",
    email: "ana@email.com"
  },
  acceptTerms: true
}
```

**Post-Registration Actions**: Same as Juan Dela Cruz

#### d. Rosa Mendoza (Active - Prenatal Services)

```javascript
{
  firstName: "Rosa",
  lastName: "Mendoza",
  email: "rosa.mendoza@gmail.com",
  password: "Patient@2025!",
  confirmPassword: "Patient@2025!",
  role: "patient",
  barangay Id: 4, // Quezon
  dateOfBirth: "1992-12-05",
  gender: "female",
  contactNumber: "+63 945 678 9012",
  emergencyContact: {
    name: "Carlos Mendoza",
    phone: "+63 945 666 6666",
    email: "carlos@email.com"
  },
  acceptTerms: true
}
```

**Post-Registration Actions**: Same as Juan Dela Cruz

---

## Quick Copy-Paste Credentials

### Login Credentials (After Creation)

```
SUPER ADMIN:
Email: admin@gmail.com
Password: Admin@2025!

HEALTHCARD ADMIN:
Email: healthcard.admin@gmail.com
Password: HealthCard@2025!

HIV ADMIN:
Email: hiv.admin@gmail.com
Password: HIV@2025!

PREGNANCY ADMIN:
Email: pregnancy.admin@gmail.com
Password: Pregnancy@2025!

GENERAL ADMIN:
Email: general.admin@gmail.com
Password: General@2025!

LABORATORY ADMIN:
Email: lab.admin@gmail.com
Password: Laboratory@2025!

DOCTOR 1 (GP):
Email: dr.santos@gmail.com
Password: Doctor@2025!

DOCTOR 2 (Pediatrician):
Email: dr.reyes@gmail.com
Password: Doctor@2025!

PATIENT 1 (Active):
Email: juan.delacruz@gmail.com
Password: Patient@2025!

PATIENT 2 (Pending):
Email: maria.santos@gmail.com
Password: Patient@2025!

PATIENT 3 (Active):
Email: pedro.gonzales@gmail.com
Password: Patient@2025!

PATIENT 4 (Active):
Email: rosa.mendoza@gmail.com
Password: Patient@2025!
```

---

## Seeding Order

Follow this order for optimal testing:

1. **Super Admin** (needed for approvals)
2. **Healthcare Admins** (all 5)
3. **Doctors** (both)
4. **Patient 2** (Maria Santos - leave pending)
5. **Patients 1, 3, 4** (approve these)

---

## Post-Seeding Verification

### Via Supabase Dashboard

1. **Check profiles table**:
   ```sql
   SELECT email, role, admin_category, status
   FROM profiles
   ORDER BY role, email;
   ```

2. **Check patients table**:
   ```sql
   SELECT p.patient_number, pr.first_name, pr.last_name, pr.status
   FROM patients p
   JOIN profiles pr ON p.user_id = pr.id
   ORDER BY p.created_at;
   ```

3. **Check doctors table**:
   ```sql
   SELECT pr.first_name, pr.last_name, pr.specialization, d.max_patients_per_day
   FROM doctors d
   JOIN profiles pr ON d.user_id = pr.id;
   ```

4. **Check health_cards table**:
   ```sql
   SELECT hc.card_number, pr.first_name, pr.last_name
   FROM health_cards hc
   JOIN patients p ON hc.patient_id = p.id
   JOIN profiles pr ON p.user_id = pr.id;
   ```

---

## Current Implementation Status

✅ **Completed**:
- Database schema (12 tables)
- Services seeded (9 services)
- Barangays seeded (44 barangays)
- RLS policies
- Database functions
- Auto profile creation trigger
- Real Supabase Auth integration

⏳ **Next Steps** (Manually via registration):
- Create 12 test users
- Approve 3 patients (leave 1 pending)
- Create doctor and patient records

---

## Troubleshooting

### Issue: Profile not created after signup
**Solution**: Check if `handle_new_user()` trigger is active:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Issue: Cannot log in after registration
**Check**: Email confirmation settings in Supabase Dashboard → Authentication → Settings
- For development, disable "Confirm email"

### Issue: RLS blocking access
**Verify**: User has correct role and status:
```sql
SELECT id, email, role, status FROM profiles WHERE email = 'your@email.com';
```

---

## Next Development Phase

After seeding is complete, proceed to:
1. **Phase 2: Patient Role Implementation**
   - Patient dashboard
   - Appointment booking
   - Health card viewing
   - Profile management

---

**Last Updated**: November 29, 2025
**Database**: Supabase (PostgreSQL)
**Project**: HealthCard Next.js + Supabase
