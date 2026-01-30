/**
 * Seed Script: Generate 12 Months of Pink Card Appointment Data for 2025
 *
 * Seeds Pink Card (Service 24): ~240 appointments
 *
 * Usage:
 *   1. Disable triggers in Supabase SQL Editor:
 *      ALTER TABLE appointments DISABLE TRIGGER log_appointment_status_on_insert;
 *      ALTER TABLE appointments DISABLE TRIGGER log_appointment_status_on_update;
 *      ALTER TABLE appointments DISABLE TRIGGER trigger_cleanup_drafts_before_booking;
 *
 *   2. Run: npx tsx src/scripts/seed-pink-card.ts
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

// Healthcare Admin ID for Pink Card
const PINK_CARD_ADMIN_ID = '204968f5-cfc2-422a-b8df-b77ec6388704'; // Genevieve Cruz

// Pink Card service configuration
const PINK_CARD_CONFIG = {
  ids: [24],
  monthlyBase: 20,
  statusDistribution: { completed: 0.85, cancelled: 0.08, no_show: 0.07 },
  seasonalMultipliers: {} as Record<number, number>, // No seasonality
};

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
  card_type: 'pink';
  lab_location: 'inside_cho';
  verification_status: string;
  appointment_stage: string;
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

const PINK_CARD_REASONS = [
  'Pink card application',
  'Pink card renewal',
  'Routine pink card screening',
  'Pre-employment pink card',
];

function generateReason(): string {
  return PINK_CARD_REASONS[Math.floor(Math.random() * PINK_CARD_REASONS.length)];
}

function generateMonthlyAppointments(
  year: number,
  month: number
): AppointmentRecord[] {
  const config = PINK_CARD_CONFIG;
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
      const serviceId = config.ids[0];
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
        reason: generateReason(),
        ...timestamps,
        completed_by_id: status === 'completed' ? PINK_CARD_ADMIN_ID : null,
        cancellation_reason:
          status === 'cancelled'
            ? ['Personal emergency', 'Conflict with work', 'Feeling unwell'][
                Math.floor(Math.random() * 3)
              ]
            : null,
        card_type: 'pink',
        lab_location: 'inside_cho',
        verification_status: 'pending',
        appointment_stage: 'verification',
      });
    }

    if (appointments.length >= targetCount) break;
  }

  return appointments;
}

async function seedPinkCard() {
  console.log('Starting Pink Card appointment seeding...\n');

  // Check for existing seeded data to avoid duplicates
  const { count: pinkCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('service_id', 24)
    .gte('appointment_date', '2025-01-01')
    .lte('appointment_date', '2025-12-31');

  console.log(`Existing 2025 appointments - Pink Card: ${pinkCount ?? 0}`);

  if ((pinkCount ?? 0) > 50) {
    console.log('\nWARNING: Significant existing data found. Aborting to prevent duplicates.');
    console.log('If you want to re-seed, delete existing seeded data first:');
    console.log('  DELETE FROM appointments WHERE service_id = 24 AND appointment_date >= \'2025-01-01\' AND appointment_date <= \'2025-12-31\';');
    process.exit(1);
  }

  const allAppointments: AppointmentRecord[] = [];

  for (let month = 1; month <= 12; month++) {
    console.log(`Generating appointments for 2025-${month.toString().padStart(2, '0')}...`);

    const pinkAppts = generateMonthlyAppointments(2025, month);
    allAppointments.push(...pinkAppts);

    console.log(`  Pink Card: ${pinkAppts.length}`);
  }

  const totalGenerated = allAppointments.length;

  console.log(`\nTotal appointments generated: ${totalGenerated}`);
  console.log(`  Pink Card (service 24): ${totalGenerated}`);

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

  console.log('\n\nPink Card appointment seeding completed!');
  console.log(`  Total inserted: ${inserted} appointments`);
  console.log(`  Pink Card (service 24): ${inserted}`);
  console.log(`  Date range: Jan 2025 - Dec 2025`);
  console.log('\nRemember to re-enable triggers:');
  console.log('  ALTER TABLE appointments ENABLE TRIGGER log_appointment_status_on_insert;');
  console.log('  ALTER TABLE appointments ENABLE TRIGGER log_appointment_status_on_update;');
  console.log('  ALTER TABLE appointments ENABLE TRIGGER trigger_cleanup_drafts_before_booking;');
}

seedPinkCard()
  .then(() => {
    console.log('\nSeeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nSeeding failed:', error);
    process.exit(1);
  });
