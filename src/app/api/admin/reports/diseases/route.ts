import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID().substring(0, 8);

  // Log incoming request
  console.log(`[${requestId}] 🦠 Admin Reports - Diseases API Request:`, {
    endpoint: '/api/admin/reports/diseases',
    params: Object.fromEntries(request.nextUrl.searchParams),
    timestamp: new Date().toISOString(),
  });

  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log(`[${requestId}] ❌ Authentication failed:`, authError?.message || 'No user');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    console.log(`[${requestId}] ✅ User authenticated:`, user.id);

    // Verify Super Admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'super_admin') {
      console.log(`[${requestId}] ❌ Authorization failed:`, {
        role: profile?.role,
        error: profileError?.message,
      });
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      );
    }

    console.log(`[${requestId}] ✅ Super Admin authorized`);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const barangayId = searchParams.get('barangay_id');
    const diseaseType = searchParams.get('disease_type');
    const severity = searchParams.get('severity');

    // Build query for diseases
    let query = supabase
      .from('diseases')
      .select(`
        id,
        disease_type,
        custom_disease_name,
        diagnosis_date,
        severity,
        status,
        notes,
        created_at,
        barangay_id,
        barangays (
          id,
          name
        ),
        patient_id,
        patients (
          patient_number,
          profiles:user_id (
            first_name,
            last_name
          )
        ),
        anonymous_patient_data,
        medical_record_id
      `);

    // Apply filters
    if (startDate) {
      query = query.gte('diagnosis_date', startDate);
    }
    if (endDate) {
      query = query.lte('diagnosis_date', endDate);
    }
    if (barangayId) {
      query = query.eq('barangay_id', parseInt(barangayId));
    }
    if (diseaseType) {
      query = query.eq('disease_type', diseaseType);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }

    // Execute query
    const { data: diseases, error: queryError } = await query.order('diagnosis_date', { ascending: false });

    if (queryError) {
      console.error('Error fetching diseases:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch diseases data' },
        { status: 500 }
      );
    }

    const filteredDiseases = diseases || [];

    // Calculate summary statistics
    const summary = {
      total_cases: filteredDiseases.length,
      unique_patients: new Set(filteredDiseases.filter((d: any) => d.patient_id).map((d: any) => d.patient_id)).size,
      anonymous_cases: filteredDiseases.filter((d: any) => !d.patient_id && d.anonymous_patient_data).length,
      active: filteredDiseases.filter((d: any) => d.status === 'active').length,
      recovered: filteredDiseases.filter((d: any) => d.status === 'recovered').length,
      deceased: filteredDiseases.filter((d: any) => d.status === 'deceased').length,
      ongoing_treatment: filteredDiseases.filter((d: any) => d.status === 'ongoing_treatment').length,
    };

    // Disease type breakdown
    const diseaseBreakdown = filteredDiseases.reduce((acc: any, disease: any) => {
      const type = disease.disease_type || 'other';
      const displayName = disease.disease_type === 'other' && disease.custom_disease_name
        ? disease.custom_disease_name
        : type;

      if (!acc[displayName]) {
        acc[displayName] = { disease_type: displayName, count: 0, active: 0, recovered: 0 };
      }
      acc[displayName].count++;
      if (disease.status === 'active') acc[displayName].active++;
      if (disease.status === 'recovered') acc[displayName].recovered++;
      return acc;
    }, {});

    // Severity breakdown
    const severityBreakdown = filteredDiseases.reduce((acc: any, disease: any) => {
      const sev = disease.severity || 'unknown';
      if (!acc[sev]) {
        acc[sev] = { severity: sev, count: 0 };
      }
      acc[sev].count++;
      return acc;
    }, {});

    // Barangay breakdown
    const barangayBreakdown = filteredDiseases.reduce((acc: any, disease: any) => {
      const barangayName = disease.barangays?.name || 'Unknown';
      if (!acc[barangayName]) {
        acc[barangayName] = { barangay: barangayName, count: 0 };
      }
      acc[barangayName].count++;
      return acc;
    }, {});

    // Trend data (cases per day)
    const trendData = filteredDiseases.reduce((acc: any, disease: any) => {
      const date = disease.diagnosis_date;
      if (!date) return acc;
      if (!acc[date]) {
        acc[date] = { date, count: 0 };
      }
      acc[date].count++;
      return acc;
    }, {});

    const trendArray = Object.values(trendData).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    // Transform diseases for table display
    const tableData = filteredDiseases.map((disease: any) => {
      // Determine patient info (registered patient or anonymous)
      let patientInfo = { name: 'N/A', patient_number: 'N/A', type: 'unknown' };

      if (disease.patient_id && disease.patients) {
        const patient = disease.patients;
        const profile = patient.profiles;
        patientInfo = {
          name: profile ? `${profile.first_name} ${profile.last_name}` : 'N/A',
          patient_number: patient.patient_number || 'N/A',
          type: 'registered',
        };
      } else if (disease.anonymous_patient_data) {
        const anonData = typeof disease.anonymous_patient_data === 'string'
          ? JSON.parse(disease.anonymous_patient_data)
          : disease.anonymous_patient_data;
        patientInfo = {
          name: anonData.name || 'Anonymous Patient',
          patient_number: 'Anonymous',
          type: 'anonymous',
        };
      }

      const diseaseDisplayName = disease.disease_type === 'other' && disease.custom_disease_name
        ? disease.custom_disease_name
        : disease.disease_type;

      return {
        id: disease.id,
        disease_type: disease.disease_type,
        disease_display_name: diseaseDisplayName,
        custom_disease_name: disease.custom_disease_name,
        diagnosis_date: disease.diagnosis_date,
        severity: disease.severity,
        status: disease.status,
        notes: disease.notes,
        barangay_name: disease.barangays?.name || 'Unknown',
        patient_name: patientInfo.name,
        patient_number: patientInfo.patient_number,
        patient_type: patientInfo.type,
        created_at: disease.created_at,
      };
    });

    const duration = Date.now() - startTime;
    const responseData = {
      summary,
      disease_breakdown: Object.values(diseaseBreakdown).sort((a: any, b: any) => b.count - a.count),
      severity_breakdown: Object.values(severityBreakdown),
      barangay_breakdown: Object.values(barangayBreakdown).sort((a: any, b: any) => b.count - a.count).slice(0, 15),
      trend_data: trendArray,
      table_data: tableData,
    };

    console.log(`[${requestId}] ✅ Diseases API Success:`, {
      duration: `${duration}ms`,
      records: {
        diseases: filteredDiseases.length,
        diseaseTypes: Object.values(diseaseBreakdown).length,
        severityLevels: Object.values(severityBreakdown).length,
        barangays: Object.values(barangayBreakdown).length,
        trendPoints: trendArray.length,
        tableRows: tableData.length,
      },
      summary,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Diseases API Error (${duration}ms):`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
