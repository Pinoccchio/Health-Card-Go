# Health Card Expiration System - Implementation Complete

## Overview

The Health Card Expiration System has been successfully implemented to automatically track and display health card expiration status based on appointment completion dates. Health cards expire 1 year after the appointment is completed.

**Implementation Date:** January 21, 2026
**Status:** ✅ Complete and Deployed

---

## Business Rules

1. **Expiration Calculation:** Health cards expire **1 year (365 days)** after the appointment `completed_at` timestamp
2. **Automatic Tracking:** Expiry dates are automatically calculated and stored when health cards are created
3. **Status Categories:**
   - **Active:** More than 30 days remaining (Green)
   - **Expiring Soon:** 30 days or less remaining (Yellow)
   - **Expired:** Past the expiry date (Red)
   - **Pending:** No expiry date set (Gray)
4. **Patient Visibility:** Expiration status is displayed on patient dashboard and health card pages
5. **Warning System:** Patients receive warnings 30 days before expiration

---

## Implementation Components

### 1. Database Layer

#### Migration: `20260121000002_add_health_card_expiration.sql`

**Location:** `supabase/migrations/20260121000002_add_health_card_expiration.sql`

**Changes:**
- ✅ Added `'expired'` to `user_status` ENUM
- ✅ Created `calculate_health_card_expiry_date()` function
- ✅ Created `is_health_card_expired()` function
- ✅ Created `set_health_card_expiry_date()` trigger function
- ✅ Created trigger on `health_cards` INSERT to auto-calculate expiry
- ✅ Updated existing health cards with calculated expiry dates
- ✅ Updated `is_active` flag for expired cards
- ✅ Created indexes on `expiry_date` and `is_active` for performance
- ✅ Created `health_cards_with_status` view for easy querying

**Database View:**
```sql
CREATE VIEW health_cards_with_status AS
SELECT
    hc.*,
    CASE
        WHEN hc.expiry_date IS NULL THEN 'pending'
        WHEN CURRENT_DATE > hc.expiry_date THEN 'expired'
        WHEN CURRENT_DATE > (hc.expiry_date - INTERVAL '30 days')::DATE THEN 'expiring_soon'
        ELSE 'active'
    END AS card_status,
    CASE
        WHEN hc.expiry_date IS NULL THEN NULL
        ELSE (hc.expiry_date - CURRENT_DATE)
    END AS days_remaining
FROM health_cards hc;
```

---

### 2. Utility Functions

#### File: `lib/utils/healthCardExpiration.ts`

**Location:** `health-card-go/src/lib/utils/healthCardExpiration.ts`

**Exports:**
- `calculateExpiryDate(completedAt)` - Calculate expiry date (1 year after completion)
- `isHealthCardExpired(expiryDate)` - Check if card is expired
- `getDaysRemaining(expiryDate)` - Calculate days until expiration
- `getExpirationStatus(expiryDate)` - Get status enum ('active', 'expiring_soon', 'expired', 'pending')
- `getExpirationInfo(expiryDate)` - Get comprehensive expiration information object
- `formatExpiryDate(expiryDate, locale)` - Format date for display
- `getStatusBadgeColor(status)` - Get Tailwind CSS color classes for status badge
- `getStatusLabel(status)` - Get human-readable label
- `needsRenewal(expiryDate)` - Check if renewal is needed

**Constants:**
- `HEALTH_CARD_EXPIRATION_YEARS = 1`
- `EXPIRATION_WARNING_DAYS = 30`

---

### 3. API Routes

#### A. Health Card Expiration Check API

**Endpoint:** `POST /api/health-cards/expiration/check`
**Location:** `health-card-go/src/app/api/health-cards/expiration/check/route.ts`

**Purpose:** Validate health card expiration on-demand

**Request Body:**
```typescript
{
  patient_id?: string;     // Patient UUID
  health_card_id?: string; // Health Card UUID
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    health_card_id: string;
    patient_id: string;
    expiry_date: string | null;
    formatted_expiry_date: string;
    is_expired: boolean;
    is_active: boolean;
    days_remaining: number | null;
    status: 'active' | 'expiring_soon' | 'expired' | 'pending';
    status_label: string;
    warning_message?: string;
    expiration_info: HealthCardExpirationInfo;
  };
  error?: string;
}
```

#### B. Modified Health Card API

**Endpoint:** `GET /api/health-cards`
**Location:** `health-card-go/src/app/api/health-cards/route.ts`

**Changes:**
- Now queries `health_cards_with_status` view instead of `health_cards` table
- Includes expiration information in response
- Adds `expiration` object with status, days_remaining, etc.

**Response Structure:**
```typescript
{
  success: boolean;
  data: {
    ...healthCard,
    patient: { ... },
    expiration: {
      expiry_date: string | null;
      formatted_expiry_date: string;
      is_expired: boolean;
      days_remaining: number | null;
      status: HealthCardExpirationStatus;
      status_label: string;
      warning_message?: string;
    }
  }
}
```

---

### 4. Frontend Components

#### A. ExpirationStatus Component

**Location:** `health-card-go/src/components/health-card/ExpirationStatus.tsx`

**Purpose:** Display expiration status as a badge

**Props:**
```typescript
{
  status: HealthCardStatus;
  daysRemaining?: number | null;
  className?: string;
  showIcon?: boolean;
  showDays?: boolean;
}
```

**Visual Design:**
- Green badge: Active status
- Yellow badge: Expiring soon
- Red badge: Expired
- Gray badge: Pending
- Icons: CheckCircle, AlertTriangle, XCircle, Clock
- Shows days remaining/days past expiration

#### B. ExpirationWarning Component

**Location:** `health-card-go/src/components/health-card/ExpirationWarning.tsx`

**Purpose:** Display warning banner for expiring/expired cards

**Props:**
```typescript
{
  status: HealthCardStatus;
  expiryDate: Date | string | null;
  daysRemaining?: number | null;
  warningMessage?: string;
  onRenewClick?: () => void;
  showRenewButton?: boolean;
  className?: string;
}
```

**Features:**
- Only shows for 'expiring_soon' or 'expired' statuses
- Yellow banner for expiring soon
- Red banner for expired
- Includes "Book Renewal Appointment" button
- Shows formatted expiry date and days remaining

---

### 5. Patient Dashboard Integration

**Location:** `health-card-go/src/app/(dashboard-patient)/patient/dashboard/page.tsx`

**Changes:**
1. Added imports for expiration components and utilities
2. Added `healthCard` state to store expiration data
3. Added health card fetch in `loadDashboardData()` function
4. Added Health Card Expiration Widget section

**Widget Features:**
- Shows `ExpirationWarning` if card is expiring/expired
- Displays health card status with `ExpirationStatus` badge
- Shows expiry date
- Includes "View Health Card" button
- Only displays if health card exists and has been loaded

---

### 6. TypeScript Types

**Location:** `health-card-go/src/types/healthcard.ts`

**Added Types:**
```typescript
export type HealthCardExpirationStatus = 'active' | 'expiring_soon' | 'expired' | 'pending';

export interface HealthCardExpiration {
  expiry_date: string | null;
  formatted_expiry_date: string;
  is_expired: boolean;
  is_active: boolean;
  days_remaining: number | null;
  status: HealthCardExpirationStatus;
  status_label: string;
  warning_message?: string;
}

export interface HealthCardWithExpiration {
  ...health_card_fields,
  expiration: HealthCardExpiration;
  patient?: { ... };
}

export interface HealthCardExpirationCheckResponse {
  success: boolean;
  data?: { ... };
  error?: string;
}
```

---

## How It Works

### Automatic Expiry Date Calculation

1. **When a health card is created:**
   - Trigger `trigger_set_health_card_expiry_date` fires
   - Calls `calculate_health_card_expiry_date(patient_id)`
   - Finds most recent completed appointment for patient
   - Calculates: `completed_at + 1 YEAR`
   - Stores result in `health_cards.expiry_date`

2. **For existing health cards:**
   - Migration updates all existing cards with calculated expiry dates
   - Sets `is_active = FALSE` for expired cards

### Status Determination Flow

```
Patient views dashboard/health card
    ↓
Frontend fetches /api/health-cards
    ↓
API queries health_cards_with_status view
    ↓
View calculates status:
    - expiry_date IS NULL → 'pending'
    - CURRENT_DATE > expiry_date → 'expired'
    - CURRENT_DATE > (expiry_date - 30 days) → 'expiring_soon'
    - else → 'active'
    ↓
Frontend displays appropriate badge/warning
```

---

## Testing

### Manual Testing Steps

1. **Test Active Card:**
   - Find patient with completed appointment
   - Check expiry_date is 1 year from completed_at
   - Verify status shows as "Active" (green)
   - Verify dashboard shows green badge

2. **Test Expiring Soon:**
   - Update health card expiry_date to 20 days from today
   - Verify status shows as "Expiring Soon" (yellow)
   - Verify warning banner appears
   - Verify days remaining is displayed

3. **Test Expired Card:**
   - Update health card expiry_date to past date
   - Verify status shows as "Expired" (red)
   - Verify `is_active = FALSE`
   - Verify red warning banner appears
   - Verify "Book Renewal Appointment" button works

4. **Test Pending Card:**
   - Create health card with NULL expiry_date
   - Verify status shows as "Pending" (gray)

### SQL Testing Queries

```sql
-- Check all health cards with expiration status
SELECT
    id,
    patient_id,
    expiry_date,
    is_active,
    card_status,
    days_remaining
FROM health_cards_with_status;

-- Find expiring cards (next 30 days)
SELECT * FROM health_cards_with_status
WHERE card_status = 'expiring_soon';

-- Find expired cards
SELECT * FROM health_cards_with_status
WHERE card_status = 'expired';

-- Test expiry calculation for specific patient
SELECT calculate_health_card_expiry_date('patient-uuid-here');
```

---

## Future Enhancements

### Potential Additions:
1. **Email Notifications:**
   - Send email 30 days before expiration
   - Send email on expiration day
   - Send reminder 7 days after expiration

2. **Batch Expiration Updates:**
   - Scheduled function to update `is_active` nightly
   - Update patient profile status to 'expired' when card expires

3. **Renewal Workflow:**
   - Direct "Renew Now" button
   - Pre-fill appointment booking for renewal
   - Track renewal history

4. **Admin Dashboard:**
   - View all expiring cards
   - View all expired cards
   - Send bulk renewal reminders

5. **SMS Notifications:**
   - Send SMS reminders for expiration

---

## Files Created/Modified

### Created Files (7):
1. `supabase/migrations/20260121000002_add_health_card_expiration.sql`
2. `src/lib/utils/healthCardExpiration.ts`
3. `src/app/api/health-cards/expiration/check/route.ts`
4. `src/components/health-card/ExpirationStatus.tsx`
5. `src/components/health-card/ExpirationWarning.tsx`
6. `HEALTH_CARD_EXPIRATION_IMPLEMENTATION.md` (this file)

### Modified Files (3):
1. `src/app/api/health-cards/route.ts`
2. `src/app/(dashboard-patient)/patient/dashboard/page.tsx`
3. `src/types/healthcard.ts`

**Total:** 10 files

---

## Deployment Checklist

- [x] Database migration applied to Supabase
- [x] Utility functions created and tested
- [x] API routes implemented
- [x] Frontend components created
- [x] Patient dashboard updated
- [x] TypeScript types defined
- [x] Documentation completed

---

## Support & Troubleshooting

### Common Issues:

**Issue:** Expiry date is NULL for existing cards
**Solution:** Run the migration again to populate expiry_date for existing health cards

**Issue:** Status not updating in real-time
**Solution:** View `health_cards_with_status` is automatically calculated, ensure query is using the view

**Issue:** Warning not showing on dashboard
**Solution:** Check that health card fetch is successful and expiration data is included in response

---

## Contact

For questions or issues related to the Health Card Expiration System, refer to this documentation or check the implementation files listed above.

---

**Implementation Status:** ✅ Complete
**Last Updated:** January 21, 2026
