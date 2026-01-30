/**
 * Seed Script: Generate 12 Months of HIV & Pregnancy Appointment Data for 2025
 *
 * Targeted version of seed-appointments.ts that ONLY seeds:
 * - HIV (Service 16): ~240 appointments
 * - Pregnancy (Service 17): ~300 appointments
 *
 * This avoids duplicating healthcard and immunization data that already exists.
 *
 * Usage:
 *   1. Disable triggers in Supabase SQL Editor:
 *      ALTER TABLE appointments DISABLE TRIGGER log_appointment_status_on_insert;
 *      ALTER TABLE appointments DISABLE TRIGGER log_appointment_status_on_update;
 *      ALTER TABLE appointments DISABLE TRIGGER trigger_cleanup_drafts_before_booking;
 *
 *   2. Run: npx tsx src/scripts/seed-hiv-pregnancy.ts
 *
 *   3. Re-enable triggers:
 *      ALTER TABLE appointments ENABLE TRIGGER log_appointment_status_on_insert;
 *      ALTER TABLE appointments ENABLE TRIGGER log_appointment_status_on_update;
 *      ALTER TABLE appointments ENABLE TRIGGER trigger_cleanup_drafts_before_booking;
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Patient IDs from database (patients.id, NOT profiles.id)
const PATIENT_IDS = [
  '605c728a-0288-41e1-a2da-baaf372e165d', // Hansel Cabo
  'b93f889a-3c81-4119-951e-921a58501703', // ayessa pacana
  'b0872be7-5297-49d9-bde4-50c393653f1f', // Jex Xejs
  'ee83efab-6a5d-4e96-b930-b925f8c2498d', // neil tapinit
  '272d79c3-3000-4338-9043-24a9678a6e59', // basang Basang
];

// Healthcare Admin IDs for HIV and Pregnancy
const ADMIN_IDS = {
  hiv: '3a7140cc-c6b7-4d8e-89eb-de9da634d58e',       // Juan Reyes
  pregnancy: 'e8abb768-6e70-4b0e-a409-cf0a1261d7cb',  // Ana Cruz
};

// Only HIV and Pregnancy service configurations
const SERVICES = {
  hiv: {
    ids: [16],
    monthlyBase: 20,
    statusDistribution: { completed: 0.85, cancelled: 0.08, no_show: 0.07 },
    seasonalMultipliers: {} as Record<number, number>,
  },
  pregnancy: {
    ids: [17],
    monthlyBase: 25,
    statusDistribution: { completed: 0.88, cancelled: 0.07, no_show: 0.05 },
    seasonalMultipliers: {
      1: 1.0, 2: 1.0, 3: 1.0,
      4: 0.95, 5: 0.95, 6: 0.95,
      7: 1.05, 8: 1.05, 9: 1.10,
      10: 1.10, 11: 1.08, 12: 1.05,
    } as Record<number, number>,
  },
};

type Category = 'hiv' | 'pregnancy';
type AppointmentStatus = 'completed' | 'cancelled' | 'no_show';

interface AppointmentRecord {
  patient_id: string;
  service_id: number;
  appointment_date: string;
  appointment_time: string;
  appointment_number: number;
  status: AppointmentStatus;
  time_block: 'AM' | 'PM';
  reason: string;
  verified_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by_id: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  card_type: null;
}

function generateAppointmentTime(timeBlock: 'AM' | 'PM'): string {
  if (timeBlock === 'AM') {
    const hour = 8 + Math.floor(Math.random() * 4);
    const minute = Math.random() < 0.5 ? 0 : 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  } else {
    const hour = 13 + Math.floor(Math.random() * 4);
    const minute = Math.random() < 0.5 ? 0 : 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  }
}

function determineStatus(distribution: Record<string, number>): AppointmentStatus {
  const rand = Math.random();
  if (rand < distribution.completed) return 'completed';
  if (rand < distribution.completed + distribution.cancelled) return 'cancelled';
  return 'no_show';
}

function generateTimestamps(
  appointmentDate: Date,
  appointmentTime: string,
  status: AppointmentStatus
) {
  const baseDate = new Date(appointmentDate);
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  baseDate.setHours(hours, minutes, 0, 0);

  const created_at = new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const updated_at = new Date(baseDate);

  let verified_at = null;
  let started_at = null;
  let completed_at = null;

  if (status === 'completed') {
    verified_at = new Date(baseDate.getTime() - (5 + Math.random() * 10) * 60 * 1000);
    started_at = new Date(verified_at.getTime() + Math.random() * 5 * 60 * 1000);
    completed_at = new Date(started_at.getTime() + (20 + Math.random() * 25) * 60 * 1000);
  } else if (status === 'cancelled') {
    updated_at.setTime(baseDate.getTime() - (1 + Math.random() * 2) * 24 * 60 * 60 * 1000);
  }

  return {
    created_at: created_at.toISOString(),
    updated_at: updated_at.toISOString(),
    verified_at: verified_at?.toISOString() || null,
    started_at: started_at?.toISOString() || null,
    completed_at: completed_at?.toISOString() || null,
  };
}

function generateReason(serviceId: number): string {
  const reasons: Record<number, string[]> = {
    16: ['HIV testing for peace of mind', 'Pre-marriage HIV test', 'Routine HIV screening'],
    17: ['First prenatal checkup', 'Monthly prenatal visit', 'Pregnancy monitoring'],
  };
  const serviceReasons = reasons[serviceId] || ['General consultation'];
  return serviceReasons[Math.floor(Math.random() * serviceReasons.length)];
}

function generateMonthlyAppointments(
  year: number,
  month: number,
  category: Category
): AppointmentRecord[] {
  const config = SERVICES[category];
  const adminId = ADMIN_IDS[category];
  const appointments: AppointmentRecord[] = [];

  const multiplier = config.seasonalMultipliers[month] || 1.0;
  const targetCount = Math.round(config.monthlyBase * multiplier);

  const daysInMonth = new Date(year, month, 0).getDate();

  let appointmentCounter = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);

    if (date.getDay() === 0 || (date.getDay() === 6 && Math.random() < 0.7)) {
      continue;
    }

    const dailyCount = Math.min(
      Math.floor(Math.random() * 3) + 1,
      targetCount - appointments.length
    );

    for (let i = 0; i < dailyCount; i++) {
      const serviceId = config.ids[Math.floor(Math.random() * config.ids.length)];
      const patientId = PATIENT_IDS[Math.floor(Math.random() * PATIENT_IDS.length)];
      const status = determineStatus(config.statusDistribution);
      const timeBlock: 'AM' | 'PM' = Math.random() < 0.5 ? 'AM' : 'PM';
      const appointmentTime = generateAppointmentTime(timeBlock);
      const timestamps = generateTimestamps(date, appointmentTime, status);

      appointments.push({
        patient_id: patientId,
        service_id: serviceId,
        appointment_date: date.toISOString().split('T')[0],
        appointment_time: appointmentTime,
        appointment_number: appointmentCounter++,
        status,
        time_block: timeBlock,
        reason: generateReason(serviceId),
        ...timestamps,
        completed_by_id: status === 'completed' ? adminId : null,
        cancellation_reason:
          status === 'cancelled'
            ? ['Personal emergency', 'Conflict with work', 'Feeling unwell'][
                Math.floor(Math.random() * 3)
              ]
            : null,
        card_type: null, // HIV and Pregnancy don't use card_type
      });
    }

    if (appointments.length >= targetCount) break;
  }

  return appointments;
}

async function seedHivPregnancy() {
  console.log('Starting HIV & Pregnancy appointment seeding...\n');

  // Check for existing seeded data to avoid duplicates
  const { count: hivCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', 16)
    .gte('appointment_date', '2025-01-01')
    .lte('appointment_date', '2025-12-31');

  const { count: pregCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', 17)
    .gte('appointment_date', '2025-01-01')
    .lte('appointment_date', '2025-12-31');

  console.log(`Existing 2025 appointments - HIV: ${hivCount ?? 0}, Pregnancy: ${pregCount ?? 0}`);

  if ((hivCount ?? 0) > 50 || (pregCount ?? 0) > 50) {
    console.log('\nWARNING: Significant existing data found. Aborting to prevent duplicates.');
    console.log('If you want to re-seed, delete existing seeded data first:');
    console.log('  DELETE FROM appointments WHERE service_id IN (16, 17) AND appointment_date >= \'2025-01-01\' AND appointment_date <= \'2025-12-31\';');
    process.exit(1);
  }

  const allAppointments: AppointmentRecord[] = [];

  for (let month = 1; month <= 12; month++) {
    console.log(`Generating appointments for 2025-${month.toString().padStart(2, '0')}...`);

    const hivAppts = generateMonthlyAppointments(2025, month, 'hiv');
    const pregnancyAppts = generateMonthlyAppointments(2025, month, 'pregnancy');

    allAppointments.push(...hivAppts, ...pregnancyAppts);

    console.log(`  HIV: ${hivAppts.length}, Pregnancy: ${pregnancyAppts.length}`);
  }

  const hivTotal = allAppointments.filter(a => a.service_id === 16).length;
  const pregTotal = allAppointments.filter(a => a.service_id === 17).length;
  const totalGenerated = allAppointments.length;

  console.log(`\nTotal appointments generated: ${totalGenerated}`);
  console.log(`  HIV (service 16): ${hivTotal}`);
  console.log(`  Pregnancy (service 17): ${pregTotal}`);

  const completed = allAppointments.filter(a => a.status === 'completed').length;
  const cancelled = allAppointments.filter(a => a.status === 'cancelled').length;
  const noShow = allAppointments.filter(a => a.status === 'no_show').length;
  console.log(`\nStatus Distribution:`);
  console.log(`  Completed: ${completed} (${((completed / totalGenerated) * 100).toFixed(1)}%)`);
  console.log(`  Cancelled: ${cancelled} (${((cancelled / totalGenerated) * 100).toFixed(1)}%)`);
  console.log(`  No Show: ${noShow} (${((noShow / totalGenerated) * 100).toFixed(1)}%)`);

  // Insert in batches of 100
  console.log('\nInserting into database...');
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < allAppointments.length; i += batchSize) {
    const batch = allAppointments.slice(i, i + batchSize);

    const { error } = await supabase
      .from('appointments')
      .insert(batch);

    if (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }

    inserted += batch.length;
    process.stdout.write(`\r  Progress: ${inserted}/${totalGenerated} (${((inserted / totalGenerated) * 100).toFixed(1)}%)`);
  }

  console.log('\n\nHIV & Pregnancy appointment seeding completed!');
  console.log(`  Total inserted: ${inserted} appointments`);
  console.log(`  HIV: ${hivTotal}, Pregnancy: ${pregTotal}`);
  console.log(`  Date range: Jan 2025 - Dec 2025`);
  console.log('\nRemember to re-enable triggers:');
  console.log('  ALTER TABLE appointments ENABLE TRIGGER log_appointment_status_on_insert;');
  console.log('  ALTER TABLE appointments ENABLE TRIGGER log_appointment_status_on_update;');
  console.log('  ALTER TABLE appointments ENABLE TRIGGER trigger_cleanup_drafts_before_booking;');
}

seedHivPregnancy()
  .then(() => {
    console.log('\nSeeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nSeeding failed:', error);
    process.exit(1);
  });
