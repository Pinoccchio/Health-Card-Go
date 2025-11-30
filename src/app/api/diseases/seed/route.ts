import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * SEED ENDPOINT - Development/Testing Only
 * Seeds historical disease data for analytics and SARIMA modeling
 *
 * Distribution:
 * - 70% Dengue
 * - 15% HIV/AIDS
 * - 10% Pregnancy complications
 * - 5% Other diseases
 *
 * Spread across 6 months with varying severity across 44 barangays
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Check if user is super admin (role_id = 1)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role_id !== 1) {
    return NextResponse.json(
      { success: false, error: 'Forbidden - Super Admin access required' },
      { status: 403 }
    );
  }

  try {
    // Get all patients, barangays for realistic data
    const { data: patients } = await supabase
      .from('patients')
      .select('id, barangay_id, user_id');

    const { data: barangays } = await supabase
      .from('barangays')
      .select('id, name');

    const { data: medicalRecords } = await supabase
      .from('medical_records')
      .select('id, patient_id');

    if (!patients || !barangays || patients.length === 0 || barangays.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Insufficient data: Need patients and barangays in database' },
        { status: 400 }
      );
    }

    // Disease types with weights
    const diseaseDistribution = [
      { type: 'dengue', weight: 70, severities: ['mild', 'moderate', 'severe', 'critical'] },
      { type: 'hiv_aids', weight: 15, severities: ['stable', 'progressive', 'advanced'] },
      { type: 'pregnancy_complications', weight: 10, severities: ['mild', 'moderate', 'severe'] },
      { type: 'malaria', weight: 2, severities: ['mild', 'moderate', 'severe'] },
      { type: 'measles', weight: 2, severities: ['mild', 'moderate'] },
      { type: 'rabies', weight: 1, severities: ['mild', 'severe', 'critical'] },
    ];

    const statuses = ['active', 'recovering', 'recovered', 'deceased'];

    // Generate 120 disease records over 6 months
    const totalRecords = 120;
    const diseaseRecords = [];
    const now = new Date();

    for (let i = 0; i < totalRecords; i++) {
      // Select disease type based on weighted distribution
      const rand = Math.random() * 100;
      let cumulativeWeight = 0;
      let selectedDisease = diseaseDistribution[0];

      for (const disease of diseaseDistribution) {
        cumulativeWeight += disease.weight;
        if (rand <= cumulativeWeight) {
          selectedDisease = disease;
          break;
        }
      }

      // Random date within last 6 months
      const daysAgo = Math.floor(Math.random() * 180);
      const diagnosisDate = new Date(now);
      diagnosisDate.setDate(diagnosisDate.getDate() - daysAgo);

      // Random patient and barangay
      const patient = patients[Math.floor(Math.random() * patients.length)];
      const barangay = barangays[Math.floor(Math.random() * barangays.length)];

      // Use patient's actual barangay 70% of the time for realism
      const usePatientBarangay = Math.random() < 0.7;
      const finalBarangayId = usePatientBarangay && patient.barangay_id
        ? patient.barangay_id
        : barangay.id;

      // Random severity and status
      const severity = selectedDisease.severities[
        Math.floor(Math.random() * selectedDisease.severities.length)
      ];

      // Status logic: older cases more likely to be recovered
      let status;
      if (daysAgo > 120) {
        status = Math.random() < 0.8 ? 'recovered' : statuses[Math.floor(Math.random() * statuses.length)];
      } else if (daysAgo > 60) {
        status = Math.random() < 0.5 ? 'recovering' : statuses[Math.floor(Math.random() * statuses.length)];
      } else {
        status = Math.random() < 0.4 ? 'active' : statuses[Math.floor(Math.random() * statuses.length)];
      }

      // Link to medical record if available (50% chance)
      const medicalRecordId = medicalRecords && medicalRecords.length > 0 && Math.random() < 0.5
        ? medicalRecords[Math.floor(Math.random() * medicalRecords.length)].id
        : null;

      diseaseRecords.push({
        patient_id: patient.user_id, // Use user_id from patients table
        medical_record_id: medicalRecordId,
        barangay_id: finalBarangayId,
        disease_type: selectedDisease.type,
        diagnosis_date: diagnosisDate.toISOString().split('T')[0],
        severity,
        status,
        created_at: diagnosisDate.toISOString(),
      });
    }

    // Insert disease records in batches
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < diseaseRecords.length; i += batchSize) {
      const batch = diseaseRecords.slice(i, i + batchSize);
      batches.push(batch);
    }

    let totalInserted = 0;
    const errors = [];

    for (const batch of batches) {
      const { data, error } = await supabase
        .from('diseases')
        .insert(batch)
        .select();

      if (error) {
        errors.push(error.message);
      } else {
        totalInserted += data?.length || 0;
      }
    }

    // Get summary statistics
    const { data: summary } = await supabase
      .from('diseases')
      .select('disease_type, barangay_id, status')
      .order('diagnosis_date', { ascending: false });

    const diseaseTypeCounts = summary?.reduce((acc: any, d: any) => {
      acc[d.disease_type] = (acc[d.disease_type] || 0) + 1;
      return acc;
    }, {});

    const barangayCount = new Set(summary?.map((d: any) => d.barangay_id)).size;
    const statusCounts = summary?.reduce((acc: any, d: any) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${totalInserted} disease records`,
      summary: {
        totalRecords: totalInserted,
        diseaseTypes: diseaseTypeCounts,
        barangaysCovered: barangayCount,
        statusBreakdown: statusCounts,
        errors: errors.length > 0 ? errors : null,
      },
    });

  } catch (error: any) {
    console.error('Error seeding disease data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed disease data',
        details: error.message
      },
      { status: 500 }
    );
  }
}
