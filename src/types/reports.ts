// Report Types and Interfaces for Super Admin Reports Page

export type ReportType =
  | 'appointments'
  | 'disease_surveillance'
  | 'patients'
  | 'feedback'
  | 'system_overview';

export type AppointmentStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'pending';

export type DiseaseType =
  | 'hiv_aids'
  | 'dengue'
  | 'malaria'
  | 'measles'
  | 'rabies'
  | 'pregnancy_complications'
  | 'other';

export type ServiceCategory =
  | 'healthcard'
  | 'hiv'
  | 'pregnancy'
  | 'general_admin'
  | 'laboratory'
  | 'immunization';

export type Severity = 'mild' | 'moderate' | 'severe' | 'critical';

export type PatientStatus = 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended';

// Filter interfaces
export interface ReportFilters {
  start_date?: string;
  end_date?: string;
  barangay_id?: number;
  service_id?: number;
  doctor_id?: string;
  status?: AppointmentStatus | PatientStatus;
  disease_type?: DiseaseType;
  severity?: Severity;
  category?: ServiceCategory;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

// Appointment Report Data
export interface AppointmentSummary {
  total_appointments: number;
  completed: number;
  cancelled: number;
  no_show: number;
  pending: number;
  scheduled: number;
  completion_rate: number;
  no_show_rate: number;
  cancellation_rate: number;
}

export interface AppointmentsByService {
  service_id: number;
  service_name: string;
  category: ServiceCategory;
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  completion_rate: number;
}

export interface AppointmentsByStatus {
  status: AppointmentStatus;
  count: number;
  percentage: number;
}

export interface DoctorPerformance {
  doctor_id: string;
  doctor_name: string;
  total_appointments: number;
  completed: number;
  avg_wait_time_minutes: number | null;
  completion_rate: number;
}

export interface AppointmentTrend {
  date: string;
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface QueueMetrics {
  avg_queue_number: number;
  max_queue_number: number;
  avg_wait_time_minutes: number | null;
  peak_hours: string[];
}

export interface AppointmentReportData {
  summary: AppointmentSummary;
  by_service: AppointmentsByService[];
  by_status: AppointmentsByStatus[];
  doctor_performance: DoctorPerformance[];
  trends: AppointmentTrend[];
  queue_metrics: QueueMetrics;
}

// Disease Surveillance Report Data
export interface DiseaseSummary {
  total_cases: number;
  active_cases: number;
  recovered: number;
  deceased: number;
  by_type: DiseaseByType[];
  by_severity: DiseaseBySeverity[];
}

export interface DiseaseByType {
  disease_type: DiseaseType;
  total: number;
  active: number;
  recovered: number;
  deceased: number;
  percentage: number;
}

export interface DiseaseBySeverity {
  severity: Severity;
  count: number;
  percentage: number;
}

export interface BarangayDiseaseData {
  barangay_id: number;
  barangay_name: string;
  total_cases: number;
  risk_level: 'low' | 'medium' | 'high';
  by_type: {
    disease_type: DiseaseType;
    count: number;
  }[];
}

export interface DiseaseTrend {
  date: string;
  [key: string]: string | number; // Dynamic keys for each disease type
}

export interface DiseasePrediction {
  disease_type: DiseaseType;
  prediction_date: string;
  predicted_cases: number;
  confidence_level: number;
}

export interface DiseaseReportData {
  summary: DiseaseSummary;
  by_barangay: BarangayDiseaseData[];
  trends: DiseaseTrend[];
  predictions: DiseasePrediction[];
}

// Patient Registration Report Data
export interface PatientRegistrationSummary {
  total_patients: number;
  pending: number;
  active: number;
  rejected: number;
  suspended: number;
  walk_in_patients: number;
  registered_patients: number;
  approval_rate: number;
  rejection_rate: number;
}

export interface RegistrationTrend {
  date: string;
  total_registered: number;
  approved: number;
  rejected: number;
}

export interface ApprovalMetrics {
  avg_approval_time_hours: number | null;
  total_approved: number;
  total_rejected: number;
  pending_approvals: number;
}

export interface PatientsByBarangay {
  barangay_id: number;
  barangay_name: string;
  total_patients: number;
  active: number;
  pending: number;
  percentage: number;
}

export interface PatientReportData {
  summary: PatientRegistrationSummary;
  registration_trends: RegistrationTrend[];
  approval_metrics: ApprovalMetrics;
  by_barangay: PatientsByBarangay[];
}

// Feedback & Satisfaction Report Data
export interface FeedbackSummary {
  total_feedback: number;
  avg_overall_rating: number;
  avg_doctor_rating: number;
  avg_facility_rating: number;
  avg_wait_time_rating: number;
  would_recommend_percentage: number;
  response_rate: number;
}

export interface FeedbackTrend {
  date: string;
  avg_rating: number;
  count: number;
}

export interface FeedbackByDoctor {
  doctor_id: string;
  doctor_name: string;
  total_feedback: number;
  avg_rating: number;
  would_recommend_percentage: number;
}

export interface FeedbackByService {
  service_id: number;
  service_name: string;
  total_feedback: number;
  avg_rating: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface FeedbackReportData {
  summary: FeedbackSummary;
  trends: FeedbackTrend[];
  by_doctor: FeedbackByDoctor[];
  by_service: FeedbackByService[];
  rating_distribution: RatingDistribution[];
}

// System Overview Report Data
export interface SystemOverviewData {
  appointments: AppointmentSummary;
  patients: PatientRegistrationSummary;
  diseases: DiseaseSummary;
  feedback: FeedbackSummary;
  health_cards: {
    total_issued: number;
    active: number;
    expired: number;
  };
  notifications: {
    total_sent: number;
    read_rate: number;
  };
  users: {
    total_super_admins: number;
    total_healthcare_admins: number;
    total_doctors: number;
    total_patients: number;
  };
}

// API Response
export interface ReportResponse<T = unknown> {
  success: boolean;
  report: {
    type: ReportType;
    generated_at: string;
    date_range: DateRange;
    filters?: ReportFilters;
    generated_by: string;
    data: T;
  };
  error?: string;
}

// Export formats
export type ExportFormat = 'pdf' | 'csv' | 'print';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
}

// Chart data types
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins?: {
    legend?: {
      display: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    title?: {
      display: boolean;
      text?: string;
    };
    tooltip?: {
      enabled: boolean;
    };
  };
  scales?: {
    x?: {
      display: boolean;
      title?: {
        display: boolean;
        text?: string;
      };
    };
    y?: {
      display: boolean;
      beginAtZero?: boolean;
      title?: {
        display: boolean;
        text?: string;
      };
    };
  };
}
