/**
 * Seed Script: Generate 12 Months of Realistic Appointment Data for 2025
 *
 * This script generates ~1,400 appointment records for 2025 (Jan - Dec)
 * across four service categories:
 * - HealthCard (Services 12-15): ~600 appointments
 * - HIV (Service 16): ~240 appointments
 * - Pregnancy (Service 17): ~300 appointments
 * - Immunization (Service 19): ~240 appointments
 *
 * Status Distribution (realistic patterns):
 * - HealthCard: 90% completed, 5% cancelled, 5% no_show
 * - HIV: 85% completed, 8% cancelled, 7% no_show
 * - Pregnancy: 88% completed, 7% cancelled, 5% no_show
 * - Immunization: 88% completed, 7% cancelled, 5% no_show
 *
 * Seasonal Patterns:
 * - HealthCard: +20% Jan-Mar (CNY season), -15% May-Jun (summer)
 * - HIV: Consistent (no seasonality)
 * - Pregnancy: Slight increase Q3-Q4
 * - Immunization: +15% Feb/Jun (school seasons), -15% Dec (holidays)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

// Healthcare Admin IDs
const ADMIN_IDS = {
  healthcard: 'e671daa2-afcb-4fd6-ac81-12c75e2949d5', // Maria Santos
  hiv: '3a7140cc-c6b7-4d8e-89eb-de9da634d58e', // Juan Reyes
  pregnancy: 'e8abb768-6e70-4b0e-a409-cf0a1261d7cb', // Ana Cruz
  immunization: 'a43ede23-4efc-4053-894e-7a99e61fccbf', // Rosa Mendoza
};

// Service configurations
const SERVICES = {
  healthcard: {
    ids: [12, 13, 14, 15],
    monthlyBase: 50, // base appointments per month
    statusDistribution: { completed: 0.90, cancelled: 0.05, no_show: 0.05 },
    seasonalMultipliers: {
      1: 1.2, 2: 1.2, 3: 1.2, // Jan-Mar: CNY season (+20%)
      4: 1.0, 5: 0.85, 6: 0.85, // Apr-Jun: Summer dip (-15%)
      7: 1.0, 8: 1.0, 9: 1.0, // Jul-Sep: Normal
      10: 1.05, 11: 1.05, 12: 1.1, // Oct-Dec: Slight increase
    },
  },
  hiv: {
    ids: [16],
    monthlyBase: 20,
    statusDistribution: { completed: 0.85, cancelled: 0.08, no_show: 0.07 },
    seasonalMultipliers: {}, // No seasonality
  },
  pregnancy: {
    ids: [17],
    monthlyBase: 25,
    statusDistribution: { completed: 0.88, cancelled: 0.07, no_show: 0.05 },
    seasonalMultipliers: {
      1: 1.0, 2: 1.0, 3: 1.0,
      4: 0.95, 5: 0.95, 6: 0.95,
      7: 1.05, 8: 1.05, 9: 1.10, // Q3: Slight increase
      10: 1.10, 11: 1.08, 12: 1.05, // Q4: Moderate increase
    },
  },
  immunization: {
    ids: [19],
    monthlyBase: 20,
    statusDistribution: { completed: 0.88, cancelled: 0.07, no_show: 0.05 },
    seasonalMultipliers: {
      1: 1.0, 2: 1.15, 3: 1.05,     // Feb: back-to-school peak
      4: 1.0, 5: 1.0, 6: 1.15,       // Jun: school year catch-up
      7: 1.10, 8: 1.10, 9: 1.0,      // Jul-Aug: campaign continuation
      10: 1.0, 11: 1.0, 12: 0.85,    // Dec: holiday dip
    },
  },
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
  card_type: 'food_handler' | 'non_food' | null;
}

/**
 * Generate random time between 8 AM and 5 PM
 */
function generateAppointmentTime(timeBlock: 'AM' | 'PM'): string {
  if (timeBlock === 'AM') {
    // 8:00 AM - 11:30 AM
    const hour = 8 + Math.floor(Math.random() * 4);
    const minute = Math.random() < 0.5 ? 0 : 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  } else {
    // 1:00 PM - 4:30 PM
    const hour = 13 + Math.floor(Math.random() * 4);
    const minute = Math.random() < 0.5 ? 0 : 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  }
}

/**
 * Determine appointment status based on distribution
 */
function determineStatus(distribution: Record<string, number>): AppointmentStatus {
  const rand = Math.random();
  if (rand < distribution.completed) return 'completed';
  if (rand < distribution.completed + distribution.cancelled) return 'cancelled';
  return 'no_show';
}

/**
 * Generate timestamps for appointment lifecycle based on status
 */
function generateTimestamps(
  appointmentDate: Date,
  appointmentTime: string,
  status: AppointmentStatus
) {
  const baseDate = new Date(appointmentDate);
  const [hours, minutes] = appointmentTime.split(':').map(Number);
  baseDate.setHours(hours, minutes, 0, 0);

  const created_at = new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before
  const updated_at = new Date(baseDate);

  let verified_at = null;
  let started_at = null;
  let completed_at = null;

  if (status === 'completed') {
    // Checked in 5-15 minutes early
    verified_at = new Date(baseDate.getTime() - (5 + Math.random() * 10) * 60 * 1000);
    // Started 0-5 minutes after check-in
    started_at = new Date(verified_at.getTime() + Math.random() * 5 * 60 * 1000);
    // Completed 20-45 minutes after start
    completed_at = new Date(started_at.getTime() + (20 + Math.random() * 25) * 60 * 1000);
  } else if (status === 'cancelled') {
    // Cancelled 1-3 days before appointment
    updated_at.setTime(baseDate.getTime() - (1 + Math.random() * 2) * 24 * 60 * 60 * 1000);
  }
  // no_show: patient simply didn't arrive

  return {
    created_at: created_at.toISOString(),
    updated_at: updated_at.toISOString(),
    verified_at: verified_at?.toISOString() || null,
    started_at: started_at?.toISOString() || null,
    completed_at: completed_at?.toISOString() || null,
  };
}

/**
 * Generate reason text based on service
 */
function generateReason(serviceId: number): string {
  const reasons: Record<number, string[]> = {
    12: ['Food handler certificate application', 'Health card for new job', 'Pre-employment medical'],
    13: ['Renewal of food handler certificate', 'Annual health card renewal'],
    14: ['Non-food health card application', 'General employment health card'],
    15: ['Non-food health card renewal', 'Health card update'],
    16: ['HIV testing for peace of mind', 'Pre-marriage HIV test', 'Routine HIV screening'],
    17: ['First prenatal checkup', 'Monthly prenatal visit', 'Pregnancy monitoring'],
    19: [
      'Routine childhood vaccination',
      'BCG vaccine',
      'OPV/IPV dose',
      'Measles/MMR vaccine',
      'Pentavalent vaccine',
      'Pneumococcal vaccine',
      'Hepatitis B vaccine',
      'Vitamin A supplementation',
    ],
  };

  const serviceReasons = reasons[serviceId] || ['General consultation'];
  return serviceReasons[Math.floor(Math.random() * serviceReasons.length)];
}

/**
 * Generate card type for healthcard services
 */
function generateCardType(serviceId: number): 'food_handler' | 'non_food' | null {
  if (serviceId === 12 || serviceId === 13) return 'food_handler';
  if (serviceId === 14 || serviceId === 15) return 'non_food';
  return null;
}

/**
 * Generate appointments for a specific month
 */
function generateMonthlyAppointments(
  year: number,
  month: number,
  category: 'healthcard' | 'hiv' | 'pregnancy' | 'immunization'
): AppointmentRecord[] {
  const config = SERVICES[category];
  const adminId = ADMIN_IDS[category];
  const appointments: AppointmentRecord[] = [];

  // Apply seasonal multiplier
  const multiplier = config.seasonalMultipliers[month] || 1.0;
  const targetCount = Math.round(config.monthlyBase * multiplier);

  // Generate appointments spread across the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const appointmentsPerDay = Math.ceil(targetCount / daysInMonth);

  let appointmentCounter = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);

    // Skip Sundays (day 0) and some Saturdays (day 6)
    if (date.getDay() === 0 || (date.getDay() === 6 && Math.random() < 0.7)) {
      continue;
    }

    // Generate 1-3 appointments per day (variability)
    const dailyCount = Math.min(
      Math.floor(Math.random() * 3) + 1,
      targetCount - appointments.length
    );

    for (let i = 0; i < dailyCount; i++) {
      const serviceId = config.ids[Math.floor(Math.random() * config.ids.length)];
      const patientId = PATIENT_IDS[Math.floor(Math.random() * PATIENT_IDS.length)];
      const status = determineStatus(config.statusDistribution);
      const timeBlock = Math.random() < 0.5 ? 'AM' : 'PM';
      const appointmentTime = generateAppointmentTime(timeBlock);
      const timestamps = generateTimestamps(date, appointmentTime, status);

      const appointment: AppointmentRecord = {
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
        card_type: generateCardType(serviceId),
      };

      appointments.push(appointment);
    }

    // Stop if we've reached target
    if (appointments.length >= targetCount) break;
  }

  return appointments;
}

/**
 * Main seed function
 */
async function seedAppointments() {
  console.log('🌱 Starting appointment seeding...\n');

  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-12-31');

  let totalGenerated = 0;
  const allAppointments: AppointmentRecord[] = [];

  // Generate for each month of 2025
  for (let year = startDate.getFullYear(); year <= endDate.getFullYear(); year++) {
    const startMonth = year === 2025 ? 1 : 1;
    const endMonth = year === 2025 ? 12 : 12;

    for (let month = startMonth; month <= endMonth; month++) {
      console.log(`📅 Generating appointments for ${year}-${month.toString().padStart(2, '0')}...`);

      // Generate for each category
      const healthcardAppts = generateMonthlyAppointments(year, month, 'healthcard');
      const hivAppts = generateMonthlyAppointments(year, month, 'hiv');
      const pregnancyAppts = generateMonthlyAppointments(year, month, 'pregnancy');
      const immunizationAppts = generateMonthlyAppointments(year, month, 'immunization');

      allAppointments.push(...healthcardAppts, ...hivAppts, ...pregnancyAppts, ...immunizationAppts);

      console.log(
        `  ✅ HealthCard: ${healthcardAppts.length}, HIV: ${hivAppts.length}, Pregnancy: ${pregnancyAppts.length}, Immunization: ${immunizationAppts.length}`
      );

      totalGenerated += healthcardAppts.length + hivAppts.length + pregnancyAppts.length + immunizationAppts.length;
    }
  }

  console.log(`\n📊 Total appointments generated: ${totalGenerated}`);
  console.log(`   - HealthCard: ${allAppointments.filter(a => [12,13,14,15].includes(a.service_id)).length}`);
  console.log(`   - HIV: ${allAppointments.filter(a => a.service_id === 16).length}`);
  console.log(`   - Pregnancy: ${allAppointments.filter(a => a.service_id === 17).length}`);
  console.log(`   - Immunization: ${allAppointments.filter(a => a.service_id === 19).length}`);

  // Status breakdown
  const completed = allAppointments.filter(a => a.status === 'completed').length;
  const cancelled = allAppointments.filter(a => a.status === 'cancelled').length;
  const noShow = allAppointments.filter(a => a.status === 'no_show').length;
  console.log(`\n📈 Status Distribution:`);
  console.log(`   - Completed: ${completed} (${((completed / totalGenerated) * 100).toFixed(1)}%)`);
  console.log(`   - Cancelled: ${cancelled} (${((cancelled / totalGenerated) * 100).toFixed(1)}%)`);
  console.log(`   - No Show: ${noShow} (${((noShow / totalGenerated) * 100).toFixed(1)}%)`);

  // Insert in batches of 100
  // NOTE: Triggers should be disabled manually before running:
  // ALTER TABLE appointments DISABLE TRIGGER log_appointment_status_on_insert;
  // ALTER TABLE appointments DISABLE TRIGGER log_appointment_status_on_update;
  // ALTER TABLE appointments DISABLE TRIGGER trigger_cleanup_drafts_before_booking;
  console.log('\n💾 Inserting into database (ensure triggers are disabled)...');
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < allAppointments.length; i += batchSize) {
    const batch = allAppointments.slice(i, i + batchSize);

    const { error } = await supabase
      .from('appointments')
      .insert(batch);

    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      throw error;
    }

    inserted += batch.length;
    process.stdout.write(`\r   Progress: ${inserted}/${totalGenerated} (${((inserted / totalGenerated) * 100).toFixed(1)}%)`);
  }

  console.log('\n\n✅ Appointment seeding completed successfully!');
  console.log(`   Total inserted: ${inserted} appointments`);
  console.log(`   Date range: Jan 2025 - Dec 2025 (12 months)`);
  console.log('\n⚠️  Remember to re-enable triggers:');
  console.log('   ALTER TABLE appointments ENABLE TRIGGER log_appointment_status_on_insert;');
  console.log('   ALTER TABLE appointments ENABLE TRIGGER log_appointment_status_on_update;');
  console.log('   ALTER TABLE appointments ENABLE TRIGGER trigger_cleanup_drafts_before_booking;');
}

// Run if called directly
if (require.main === module) {
  seedAppointments()
    .then(() => {
      console.log('\n🎉 Seeding complete! Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedAppointments };
