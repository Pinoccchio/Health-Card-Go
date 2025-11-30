import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/reports/generate
 * Generate comprehensive reports for disease surveillance, appointments, and health office statistics
 * Report types: disease_surveillance, appointment_summary, health_office_overview, custom
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const {
      report_type,
      start_date,
      end_date,
      filters = {},
    } = body;

    if (!report_type) {
      return NextResponse.json(
        { success: false, error: 'report_type is required' },
        { status: 400 }
      );
    }

    // Default to last 30 days if no dates specified
    const defaultEndDate = new Date().toISOString().split('T')[0];
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const defaultStartDateStr = defaultStartDate.toISOString().split('T')[0];

    const finalStartDate = start_date || defaultStartDateStr;
    const finalEndDate = end_date || defaultEndDate;

    let reportData: any = {};

    switch (report_type) {
      case 'disease_surveillance':
        reportData = await generateDiseaseSurveillanceReport(supabase, finalStartDate, finalEndDate, filters);
        break;

      case 'appointment_summary':
        reportData = await generateAppointmentSummaryReport(supabase, finalStartDate, finalEndDate, filters);
        break;

      case 'health_office_overview':
        reportData = await generateHealthOfficeOverviewReport(supabase, finalStartDate, finalEndDate);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report_type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      report: {
        type: report_type,
        generated_at: new Date().toISOString(),
        date_range: {
          start: finalStartDate,
          end: finalEndDate,
        },
        generated_by: user.email,
        ...reportData,
      },
    });

  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function generateDiseaseSurveillanceReport(
  supabase: any,
  startDate: string,
  endDate: string,
  filters: any
) {
  // Fetch diseases within date range
  let query = supabase
    .from('diseases')
    .select(`
      *,
      patients(patient_number, profiles(first_name, last_name)),
      barangays(name)
    `)
    .gte('diagnosis_date', startDate)
    .lte('diagnosis_date', endDate);

  if (filters.disease_type) {
    query = query.eq('disease_type', filters.disease_type);
  }
  if (filters.barangay_id) {
    query = query.eq('barangay_id', filters.barangay_id);
  }

  const { data: diseases, error } = await query;

  if (error) throw error;

  // Aggregate statistics
  const totalCases = diseases?.length || 0;
  const activeCases = diseases?.filter(d => d.status === 'active').length || 0;
  const recoveredCases = diseases?.filter(d => d.status === 'recovered').length || 0;
  const deceasedCases = diseases?.filter(d => d.status === 'deceased').length || 0;

  const criticalCases = diseases?.filter(d => d.severity === 'critical').length || 0;
  const severeCases = diseases?.filter(d => d.severity === 'severe').length || 0;

  // Group by disease type
  const byDiseaseType: Record<string, any> = {};
  diseases?.forEach(d => {
    if (!byDiseaseType[d.disease_type]) {
      byDiseaseType[d.disease_type] = {
        total: 0,
        active: 0,
        recovered: 0,
        critical: 0,
        severe: 0,
      };
    }
    byDiseaseType[d.disease_type].total++;
    if (d.status === 'active') byDiseaseType[d.disease_type].active++;
    if (d.status === 'recovered') byDiseaseType[d.disease_type].recovered++;
    if (d.severity === 'critical') byDiseaseType[d.disease_type].critical++;
    if (d.severity === 'severe') byDiseaseType[d.disease_type].severe++;
  });

  // Group by barangay
  const byBarangay: Record<string, any> = {};
  diseases?.forEach(d => {
    const barangayName = d.barangays?.name || 'Unknown';
    if (!byBarangay[barangayName]) {
      byBarangay[barangayName] = {
        total: 0,
        active: 0,
        critical: 0,
      };
    }
    byBarangay[barangayName].total++;
    if (d.status === 'active') byBarangay[barangayName].active++;
    if (d.severity === 'critical') byBarangay[barangayName].critical++;
  });

  // Top affected barangays
  const topBarangays = Object.entries(byBarangay)
    .map(([name, stats]: [string, any]) => ({ barangay: name, ...stats }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    summary: {
      total_cases: totalCases,
      active_cases: activeCases,
      recovered_cases: recoveredCases,
      deceased_cases: deceasedCases,
      critical_cases: criticalCases,
      severe_cases: severeCases,
      recovery_rate: totalCases > 0 ? ((recoveredCases / totalCases) * 100).toFixed(2) : 0,
      mortality_rate: totalCases > 0 ? ((deceasedCases / totalCases) * 100).toFixed(2) : 0,
    },
    by_disease_type: byDiseaseType,
    top_affected_barangays: topBarangays,
    filters: filters,
  };
}

async function generateAppointmentSummaryReport(
  supabase: any,
  startDate: string,
  endDate: string,
  filters: any
) {
  // Fetch appointments within date range
  let query = supabase
    .from('appointments')
    .select(`
      *,
      patients(patient_number, profiles(first_name, last_name)),
      doctors(profiles(first_name, last_name)),
      services(name, category)
    `)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate);

  if (filters.doctor_id) {
    query = query.eq('doctor_id', filters.doctor_id);
  }
  if (filters.service_id) {
    query = query.eq('service_id', filters.service_id);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data: appointments, error } = await query;

  if (error) throw error;

  const total = appointments?.length || 0;
  const completed = appointments?.filter(a => a.status === 'completed').length || 0;
  const cancelled = appointments?.filter(a => a.status === 'cancelled').length || 0;
  const noShow = appointments?.filter(a => a.status === 'no_show').length || 0;
  const scheduled = appointments?.filter(a => a.status === 'scheduled').length || 0;

  // Group by service
  const byService: Record<string, any> = {};
  appointments?.forEach(a => {
    const serviceName = a.services?.name || 'Unknown';
    if (!byService[serviceName]) {
      byService[serviceName] = {
        total: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      };
    }
    byService[serviceName].total++;
    if (a.status === 'completed') byService[serviceName].completed++;
    if (a.status === 'cancelled') byService[serviceName].cancelled++;
    if (a.status === 'no_show') byService[serviceName].no_show++;
  });

  // Calculate average wait time
  const completedApts = appointments?.filter(a =>
    a.status === 'completed' && a.checked_in_at && a.completed_at
  ) || [];

  let avgWaitTimeMinutes = 0;
  if (completedApts.length > 0) {
    const totalWaitTime = completedApts.reduce((sum, apt) => {
      const checkIn = new Date(apt.checked_in_at).getTime();
      const completed = new Date(apt.completed_at).getTime();
      return sum + (completed - checkIn);
    }, 0);
    avgWaitTimeMinutes = Math.round(totalWaitTime / completedApts.length / 1000 / 60);
  }

  return {
    summary: {
      total_appointments: total,
      completed,
      cancelled,
      no_show: noShow,
      scheduled,
      completion_rate: total > 0 ? ((completed / total) * 100).toFixed(2) : 0,
      no_show_rate: total > 0 ? ((noShow / total) * 100).toFixed(2) : 0,
      cancellation_rate: total > 0 ? ((cancelled / total) * 100).toFixed(2) : 0,
      avg_wait_time_minutes: avgWaitTimeMinutes,
    },
    by_service: byService,
    filters: filters,
  };
}

async function generateHealthOfficeOverviewReport(
  supabase: any,
  startDate: string,
  endDate: string
) {
  // Get multiple datasets in parallel
  const [
    { data: appointments },
    { data: diseases },
    { data: patients },
    { data: doctors },
    { data: feedback },
  ] = await Promise.all([
    supabase.from('appointments').select('*').gte('appointment_date', startDate).lte('appointment_date', endDate),
    supabase.from('diseases').select('*').gte('diagnosis_date', startDate).lte('diagnosis_date', endDate),
    supabase.from('patients').select('*').gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('doctors').select('*'),
    supabase.from('feedback').select('*').gte('created_at', startDate).lte('created_at', endDate),
  ]);

  // Calculate comprehensive statistics
  const totalAppointments = appointments?.length || 0;
  const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
  const totalDiseases = diseases?.length || 0;
  const activeDiseases = diseases?.filter(d => d.status === 'active').length || 0;
  const newPatients = patients?.length || 0;
  const totalDoctors = doctors?.length || 0;

  // Feedback statistics
  const totalFeedback = feedback?.length || 0;
  const avgRating = totalFeedback > 0
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback).toFixed(2)
    : 0;
  const recommendationRate = totalFeedback > 0
    ? ((feedback.filter(f => f.would_recommend).length / totalFeedback) * 100).toFixed(2)
    : 0;

  return {
    summary: {
      total_appointments: totalAppointments,
      completed_appointments: completedAppointments,
      total_disease_cases: totalDiseases,
      active_disease_cases: activeDiseases,
      new_patients: newPatients,
      total_doctors: totalDoctors,
      total_feedback: totalFeedback,
      avg_feedback_rating: avgRating,
      recommendation_rate: recommendationRate,
    },
    performance_indicators: {
      appointment_completion_rate: totalAppointments > 0
        ? ((completedAppointments / totalAppointments) * 100).toFixed(2)
        : 0,
      disease_active_rate: totalDiseases > 0
        ? ((activeDiseases / totalDiseases) * 100).toFixed(2)
        : 0,
      patient_satisfaction: avgRating,
      recommendation_rate: recommendationRate,
    },
  };
}
