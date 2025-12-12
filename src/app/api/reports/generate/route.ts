import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/reports/generate
 * Generate comprehensive reports for disease surveillance, appointments, patients, feedback, and health office statistics
 * Report types: disease_surveillance, appointment_summary, patient_registration, feedback_satisfaction, health_office_overview
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

      case 'appointments':
        reportData = await generateAppointmentSummaryReport(supabase, finalStartDate, finalEndDate, filters);
        break;

      case 'patients':
        reportData = await generatePatientRegistrationReport(supabase, finalStartDate, finalEndDate, filters);
        break;

      case 'feedback':
        reportData = await generateFeedbackSatisfactionReport(supabase, finalStartDate, finalEndDate, filters);
        break;

      case 'system_overview':
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

  // ✅ FIX: Convert object to array with 'count' field
  const byDiseaseTypeArray = Object.entries(byDiseaseType).map(([disease_type, stats]: [string, any]) => ({
    disease_type,
    count: stats.total, // ✅ ADD: charts expect 'count' field
    ...stats,
  }));

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

  // ✅ FIX: Convert to array with 'count' field
  const byBarangayArray = Object.entries(byBarangay)
    .map(([barangay_name, stats]: [string, any]) => ({
      barangay_name,
      count: stats.total, // ✅ ADD: charts expect 'count' field
      ...stats
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ✅ NEW: Generate trend_data - group by date
  const trendByDate: Record<string, any> = {};
  diseases?.forEach(d => {
    const date = d.diagnosis_date;
    if (!trendByDate[date]) {
      trendByDate[date] = {
        date,
        new_cases: 0,
        active_cases: 0,
        recovered: 0,
      };
    }
    trendByDate[date].new_cases++;
    if (d.status === 'active') trendByDate[date].active_cases++;
    if (d.status === 'recovered') trendByDate[date].recovered++;
  });

  const trend_data = Object.values(trendByDate).sort((a: any, b: any) =>
    a.date.localeCompare(b.date)
  );

  return {
    summary: {
      total_cases: totalCases,
      active: activeCases,
      recovered: recoveredCases,
      deceased: deceasedCases,
      critical: criticalCases,
      severe: severeCases,
      // ✅ FIX: Return raw numbers, not strings
      recovery_rate: totalCases > 0 ? (recoveredCases / totalCases) * 100 : 0,
      mortality_rate: totalCases > 0 ? (deceasedCases / totalCases) * 100 : 0,
    },
    by_disease_type: byDiseaseTypeArray, // ✅ FIX: Now an array with 'count'
    by_barangay: byBarangayArray, // ✅ FIX: Now an array with 'count'
    by_severity: [
      { severity: 'mild', count: totalCases - severeCases - criticalCases },
      { severity: 'moderate', count: severeCases },
      { severity: 'severe', count: criticalCases },
    ],
    trend_data, // ✅ NEW: Add trend data
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
      services(name, category)
    `)
    .gte('appointment_date', startDate)
    .lte('appointment_date', endDate);
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

  // ✅ FIX: Convert object to array
  const byServiceArray = Object.entries(byService).map(([service_name, stats]: [string, any]) => ({
    service_name,
    count: stats.total,
    ...stats,
  }));

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

  // ✅ NEW: Generate trend_data - group by date
  const trendByDate: Record<string, any> = {};
  appointments?.forEach(a => {
    const date = a.appointment_date;
    if (!trendByDate[date]) {
      trendByDate[date] = {
        date,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
        no_show: 0,
      };
    }
    if (a.status === 'scheduled') trendByDate[date].scheduled++;
    if (a.status === 'completed') trendByDate[date].completed++;
    if (a.status === 'cancelled') trendByDate[date].cancelled++;
    if (a.status === 'no_show') trendByDate[date].no_show++;
  });

  const trend_data = Object.values(trendByDate).sort((a: any, b: any) =>
    a.date.localeCompare(b.date)
  );

  return {
    summary: {
      total_appointments: total,
      completed,
      cancelled,
      no_show: noShow,
      scheduled,
      // ✅ FIX: Return raw numbers, not strings
      completion_rate: total > 0 ? (completed / total) * 100 : 0,
      no_show_rate: total > 0 ? (noShow / total) * 100 : 0,
      cancellation_rate: total > 0 ? (cancelled / total) * 100 : 0,
      avg_wait_time_minutes: avgWaitTimeMinutes,
    },
    by_service: byServiceArray, // ✅ FIX: Now an array
    trend_data, // ✅ NEW: Add trend data
    filters: filters,
  };
}

async function generatePatientRegistrationReport(
  supabase: any,
  startDate: string,
  endDate: string,
  filters: any
) {
  // Fetch profiles (patients) within date range
  let query = supabase
    .from('profiles')
    .select(`
      *,
      barangays(name),
      patients(patient_number, user_id)
    `)
    .eq('role', 'patient')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (filters.barangay_id) {
    query = query.eq('barangay_id', filters.barangay_id);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data: patients, error } = await query;

  if (error) throw error;

  const total = patients?.length || 0;
  const pending = patients?.filter(p => p.status === 'pending').length || 0;
  const active = patients?.filter(p => p.status === 'active').length || 0;
  const rejected = patients?.filter(p => p.status === 'rejected').length || 0;
  const suspended = patients?.filter(p => p.status === 'suspended').length || 0;
  const walkIn = patients?.filter(p => p.patients && p.patients.user_id === null).length || 0;
  const registered = total - walkIn;

  // Calculate approval metrics
  const approved = patients?.filter(p => p.approved_at).length || 0;

  // ✅ FIX: Return raw numbers, not strings
  const approvalRate = (pending + active + rejected + suspended) > 0
    ? (approved / (pending + active + rejected + suspended)) * 100
    : 0;
  const rejectionRate = (pending + active + rejected + suspended) > 0
    ? (rejected / (pending + active + rejected + suspended)) * 100
    : 0;

  // Calculate average approval time
  const approvedPatients = patients?.filter(p => p.approved_at && p.created_at) || [];
  let avgApprovalTimeHours = 0;
  if (approvedPatients.length > 0) {
    const totalTime = approvedPatients.reduce((sum, p) => {
      const created = new Date(p.created_at).getTime();
      const approved = new Date(p.approved_at).getTime();
      return sum + (approved - created);
    }, 0);
    avgApprovalTimeHours = Math.round(totalTime / approvedPatients.length / 1000 / 60 / 60);
  }

  // Group by barangay
  const byBarangay: Record<string, any> = {};
  patients?.forEach(p => {
    const barangayName = p.barangays?.name || 'Unknown';
    if (!byBarangay[barangayName]) {
      byBarangay[barangayName] = {
        total: 0,
        active: 0,
        pending: 0,
      };
    }
    byBarangay[barangayName].total++;
    if (p.status === 'active') byBarangay[barangayName].active++;
    if (p.status === 'pending') byBarangay[barangayName].pending++;
  });

  const byBarangayArray = Object.entries(byBarangay).map(([name, stats]: [string, any]) => ({
    barangay_name: name,
    count: stats.total,
    ...stats,
    // ✅ FIX: Return raw number
    percentage: total > 0 ? (stats.total / total) * 100 : 0,
  }));

  // ✅ NEW: Generate by_age_group
  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const ageGroups: Record<string, number> = {
    '0-17': 0,
    '18-30': 0,
    '31-45': 0,
    '46-60': 0,
    '61+': 0,
    'Unknown': 0,
  };

  patients?.forEach(p => {
    const age = calculateAge(p.date_of_birth);
    if (age === null) {
      ageGroups['Unknown']++;
    } else if (age <= 17) {
      ageGroups['0-17']++;
    } else if (age <= 30) {
      ageGroups['18-30']++;
    } else if (age <= 45) {
      ageGroups['31-45']++;
    } else if (age <= 60) {
      ageGroups['46-60']++;
    } else {
      ageGroups['61+']++;
    }
  });

  const by_age_group = Object.entries(ageGroups).map(([age_group, count]) => ({
    age_group,
    count,
  }));

  // ✅ NEW: Generate trend_data - group by date
  const trendByDate: Record<string, any> = {};
  patients?.forEach(p => {
    const date = p.created_at.split('T')[0]; // Get date part only
    if (!trendByDate[date]) {
      trendByDate[date] = {
        date,
        registrations: 0,
        approved: 0,
      };
    }
    trendByDate[date].registrations++;
    if (p.approved_at) trendByDate[date].approved++;
  });

  const trend_data = Object.values(trendByDate).sort((a: any, b: any) =>
    a.date.localeCompare(b.date)
  );

  return {
    summary: {
      total_patients: total,
      pending,
      active,
      rejected,
      suspended,
      inactive: 0, // Placeholder
      walk_in_patients: walkIn,
      registered_patients: registered,
      approval_rate: approvalRate, // ✅ FIX: Now a number
      rejection_rate: rejectionRate, // ✅ FIX: Now a number
    },
    approval_metrics: {
      avg_approval_time_hours: avgApprovalTimeHours,
      total_approved: approved,
      total_rejected: rejected,
      pending_approvals: pending,
    },
    by_barangay: byBarangayArray,
    by_age_group, // ✅ NEW: Add age group distribution
    trend_data, // ✅ NEW: Add trend data
    filters: filters,
  };
}

async function generateFeedbackSatisfactionReport(
  supabase: any,
  startDate: string,
  endDate: string,
  filters: any
) {
  // Fetch feedback within date range
  // ✅ FIX: Proper Supabase join syntax for nested relations
  let query = supabase
    .from('feedback')
    .select(`
      *,
      patients(patient_number, profiles(first_name, last_name)),
      appointments!inner(
        appointment_date,
        service_id,
        services(name, category)
      )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  if (filters.service_id) {
    query = query.eq('appointments.service_id', filters.service_id);
  }

  const { data: feedback, error } = await query;

  if (error) throw error;

  const total = feedback?.length || 0;

  // ✅ FIX: Return raw numbers, not strings
  const avgOverallRating = total > 0
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / total
    : 0;
  const avgFacilityRating = total > 0
    ? feedback.reduce((sum, f) => sum + (f.facility_rating || 0), 0) / total
    : 0;
  const avgWaitTimeRating = total > 0
    ? feedback.reduce((sum, f) => sum + (f.wait_time_rating || 0), 0) / total
    : 0;
  const wouldRecommendCount = feedback?.filter(f => f.would_recommend).length || 0;
  const wouldRecommendPercentage = total > 0 ? (wouldRecommendCount / total) * 100 : 0;

  // Response rate (feedback with admin response)
  const withResponse = feedback?.filter(f => f.admin_response).length || 0;
  const responseRate = total > 0 ? (withResponse / total) * 100 : 0;

  // Rating distribution
  const ratingDistribution: Record<number, number> = {};
  [1, 2, 3, 4, 5].forEach(rating => {
    ratingDistribution[rating] = feedback?.filter(f => f.rating === rating).length || 0;
  });

  const ratingDistributionArray = Object.entries(ratingDistribution).map(([rating, count]) => ({
    rating: Number(rating),
    count,
    // ✅ FIX: Return raw number
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));

  // Group by service
  const byService: Record<string, any> = {};
  feedback?.forEach(f => {
    const serviceName = f.appointments?.services?.name || 'Unknown';
    if (!byService[serviceName]) {
      byService[serviceName] = {
        total_feedback: 0,
        total_rating: 0,
      };
    }
    byService[serviceName].total_feedback++;
    byService[serviceName].total_rating += f.rating;
  });

  const byServiceArray = Object.entries(byService).map(([name, stats]: [string, any]) => ({
    service_name: name,
    total_feedback: stats.total_feedback,
    // ✅ FIX: Return raw number
    average_rating: stats.total_rating / stats.total_feedback,
  }));

  // ✅ NEW: Generate trend_data - group by date
  const trendByDate: Record<string, any> = {};
  feedback?.forEach(f => {
    const date = f.created_at.split('T')[0]; // Get date part only
    if (!trendByDate[date]) {
      trendByDate[date] = {
        date,
        count: 0,
        total_rating: 0,
        total_facility_rating: 0,
      };
    }
    trendByDate[date].count++;
    trendByDate[date].total_rating += f.rating || 0;
    trendByDate[date].total_facility_rating += f.facility_rating || 0;
  });

  const trend_data = Object.values(trendByDate).map((day: any) => ({
    date: day.date,
    average_rating: day.count > 0 ? day.total_rating / day.count : 0,
    average_facility_rating: day.count > 0 ? day.total_facility_rating / day.count : 0,
  })).sort((a: any, b: any) => a.date.localeCompare(b.date));

  return {
    summary: {
      total_feedback: total,
      would_recommend_count: wouldRecommendCount,
      // ✅ FIX: Match component field names
      average_overall_rating: avgOverallRating,
      average_facility_rating: avgFacilityRating,
      average_wait_time_rating: avgWaitTimeRating,
      recommendation_percentage: wouldRecommendPercentage, // ✅ FIX: Field name match
      response_rate: responseRate,
    },
    rating_distribution: ratingDistributionArray,
    by_service: byServiceArray,
    trend_data, // ✅ NEW: Add trend data
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
    { data: feedback },
  ] = await Promise.all([
    supabase.from('appointments').select('*').gte('appointment_date', startDate).lte('appointment_date', endDate),
    supabase.from('diseases').select('*').gte('diagnosis_date', startDate).lte('diagnosis_date', endDate),
    supabase.from('patients').select('*').gte('created_at', startDate).lte('created_at', endDate),
    supabase.from('feedback').select('*').gte('created_at', startDate).lte('created_at', endDate),
  ]);

  // Calculate comprehensive statistics
  const totalAppointments = appointments?.length || 0;
  const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
  const totalDiseases = diseases?.length || 0;
  const activeDiseases = diseases?.filter(d => d.status === 'active').length || 0;
  const newPatients = patients?.length || 0;

  // Feedback statistics
  const totalFeedback = feedback?.length || 0;

  // ✅ FIX: Return raw numbers, not strings
  const avgRating = totalFeedback > 0
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
    : 0;
  const recommendationRate = totalFeedback > 0
    ? (feedback.filter(f => f.would_recommend).length / totalFeedback) * 100
    : 0;

  return {
    summary: {
      total_patients: newPatients,
      total_appointments: totalAppointments,
      completed_appointments: completedAppointments,
      total_disease_cases: totalDiseases,
      active_disease_cases: activeDiseases,
      new_patients: newPatients,
      total_feedback: totalFeedback,
      // ✅ FIX: Match component field names
      average_rating: avgRating,
      completion_rate: totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0,
    },
    performance_indicators: {
      appointment_completion_rate: totalAppointments > 0
        ? (completedAppointments / totalAppointments) * 100
        : 0,
      disease_active_rate: totalDiseases > 0
        ? (activeDiseases / totalDiseases) * 100
        : 0,
      patient_satisfaction: avgRating,
      recommendation_rate: recommendationRate,
    },
  };
}
